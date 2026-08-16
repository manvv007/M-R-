from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlalchemy.orm import Session
from datetime import datetime
import os
import uuid

from ..database import get_db
from .. import models, schemas, config
from ..auth import get_current_user, require_role, get_user_role

router = APIRouter(prefix="/api", tags=["Reports & Evidence"])

ALLOWED_IMG = [e.lower() for e in config.settings.ALLOWED_IMAGE_TYPES]
ALLOWED_VID = [e.lower() for e in config.settings.ALLOWED_VIDEO_TYPES]
ALLOWED_ALL = ALLOWED_IMG + ALLOWED_VID


@router.post("/reports", response_model=schemas.ReportOut, status_code=201)
def create_report(
    payload: schemas.ReportCreate,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = get_user_role(user, db)

    # Auto-link to nearby existing incident as duplicate (simplified mock logic)
    duplicate_incident_id = None
    if payload.latitude and payload.longitude:
        existing = (
            db.query(models.Incident)
            .filter(models.Incident.type == payload.type)
            .order_by(models.Incident.detected_at.desc())
            .first()
        )
        if existing:
            duplicate_incident_id = existing.id

    report = models.Report(
        incident_id=duplicate_incident_id,
        user_id=user.id,
        type=payload.type,
        status="SUBMITTED",
        location_text=payload.location_text,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
    )
    db.add(report)
    db.flush()

    # If no matching incident, create a new incident linked to this report
    if not duplicate_incident_id:
        from .incidents import _make_case_number
        inc = models.Incident(
            case_number=_make_case_number(db),
            type=payload.type, source="CITIZEN",
            status="SUBMITTED", severity="MEDIUM",
            priority_score=50, confidence=None,
            reported_by_user_id=user.id,
            description=payload.description,
        )
        db.add(inc); db.flush()
        report.incident_id = inc.id

    db.add(models.Notification(
        user_id=user.id,
        title="Your report has been received",
        body=f"Thank you. Report ID #{report.id} is being processed. AI analysis will begin shortly.",
        type="REPORT_SUBMITTED", report_id=report.id,
    ))

    # Notify authority
    auth_user = (
        db.query(models.User)
        .join(models.Role, models.User.role_id == models.Role.id)
        .filter(models.Role.name == "authority")
        .first()
    )
    if auth_user:
        db.add(models.Notification(
            user_id=auth_user.id,
            title="New citizen report received",
            body=f"{payload.type} report submitted from {payload.location_text or 'unknown location'}.",
            type="NEW_REPORT", report_id=report.id, incident_id=report.incident_id,
        ))

    db.commit()
    db.refresh(report)
    return schemas.ReportOut.model_validate(report)


@router.get("/reports")
def list_reports(
    type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = get_user_role(user, db)
    q = db.query(models.Report)
    if role == "citizen":
        q = q.filter(models.Report.user_id == user.id)
    if type: q = q.filter(models.Report.type == type)
    if status: q = q.filter(models.Report.status == status)
    total = q.count()
    items = q.order_by(models.Report.submitted_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    return {
        "items": [schemas.ReportOut.model_validate(r).model_dump() for r in items],
        "total": total, "page": page, "page_size": page_size, "demo_mode": True,
    }


@router.get("/reports/{report_id}")
def get_report(
    report_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    role = get_user_role(user, db)
    if role == "citizen" and report.user_id != user.id:
        raise HTTPException(403, "Not authorized")
    evidence = db.query(models.Evidence).filter(models.Evidence.report_id == report_id).all()
    ai_list = db.query(models.AIAnalysis).filter(models.AIAnalysis.report_id == report_id).all()
    return {
        "report": schemas.ReportOut.model_validate(report).model_dump(),
        "evidence": [schemas.EvidenceOut.model_validate(e).model_dump() for e in evidence],
        "ai_analysis": [schemas.AIAnalysisOut.model_validate(a).model_dump() for a in ai_list],
        "demo_mode": True,
    }


@router.post("/evidence/upload")
async def upload_evidence(
    file: UploadFile = File(...),
    report_id: Optional[int] = None,
    incident_id: Optional[int] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    os.makedirs(config.settings.UPLOAD_DIR, exist_ok=True)

    # Validate extension
    ext = file.filename.split(".")[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_ALL:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_ALL)}")

    # Read + validate size
    contents = await file.read()
    size_limit = config.settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > size_limit:
        raise HTTPException(400, f"File too large. Max {config.settings.MAX_UPLOAD_SIZE_MB} MB")

    ftype = "image" if ext in ALLOWED_IMG else "video"
    fname = f"{uuid.uuid4().hex}.{ext}"
    fpath = os.path.join(config.settings.UPLOAD_DIR, fname)
    with open(fpath, "wb") as f:
        f.write(contents)

    evidence = models.Evidence(
        incident_id=incident_id, report_id=report_id,
        file_type=ftype, file_format=ext,
        file_url=f"/uploads/{fname}",
        file_size_bytes=len(contents),
        width_px=1920 if ftype == "image" else None,
        height_px=1080 if ftype == "image" else None,
        duration_sec=60 if ftype == "video" else None,
        frame_count=30 if ftype == "video" else None,
        uploaded_by_id=user.id,
    )
    db.add(evidence); db.commit(); db.refresh(evidence)

    # Link incident/report status to AI_PROCESSING
    if incident_id:
        inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
        if inc and inc.status == "SUBMITTED":
            inc.status = "AI_PROCESSING"
    if report_id:
        rep = db.query(models.Report).filter(models.Report.id == report_id).first()
        if rep and rep.status == "SUBMITTED":
            rep.status = "AI_PROCESSING"
    db.commit()

    return schemas.EvidenceOut.model_validate(evidence)
