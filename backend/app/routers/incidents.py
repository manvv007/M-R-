from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role, get_user_role

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


def _make_case_number(db: Session) -> str:
    year = datetime.utcnow().year
    last = (
        db.query(models.Incident)
        .filter(models.Incident.case_number.startswith(f"RW-{year}"))
        .count()
    )
    return f"RW-{year}-{last + 1:05d}"


def _audit(db: Session, user: models.User, action: str, incident_id: Optional[int] = None,
           old=None, new=None, request: Optional[Request] = None):
    db.add(models.AuditLog(
        user_id=user.id, action=action, incident_id=incident_id,
        old_value=old, new_value=new,
        ip_address=request.client.host if request and request.client else None,
    ))
    db.commit()


@router.get("", response_model=schemas.IncidentListResponse)
def list_incidents(
    type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
    corridor_id: Optional[int] = None,
    junction_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Incident)
    role = get_user_role(user, db)

    if role == "citizen":
        q = q.filter(models.Incident.reported_by_user_id == user.id)
    if type: q = q.filter(models.Incident.type == type)
    if status: q = q.filter(models.Incident.status == status)
    if severity: q = q.filter(models.Incident.severity == severity)
    if source: q = q.filter(models.Incident.source == source)
    if corridor_id: q = q.filter(models.Incident.corridor_id == corridor_id)
    if junction_id: q = q.filter(models.Incident.junction_id == junction_id)

    total = q.count()
    items = (
        q.order_by(models.Incident.detected_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.IncidentListResponse(
        items=[schemas.IncidentOut.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    role = get_user_role(user, db)
    if role == "citizen" and inc.reported_by_user_id != user.id:
        raise HTTPException(403, "Not authorized")

    evidence = db.query(models.Evidence).filter(
        models.Evidence.incident_id == inc.id
    ).all()
    ai_list = db.query(models.AIAnalysis).filter(
        models.AIAnalysis.incident_id == inc.id
    ).all()
    vehicles = db.query(models.Vehicle).filter(
        models.Vehicle.incident_id == inc.id
    ).all()
    reports = db.query(models.Report).filter(
        models.Report.incident_id == inc.id
    ).all()
    j = db.query(models.Junction).filter(models.Junction.id == inc.junction_id).first()
    c = db.query(models.Corridor).filter(models.Corridor.id == inc.corridor_id).first()
    lane = db.query(models.Lane).filter(models.Lane.id == inc.lane_id).first()

    return {
        "incident": schemas.IncidentOut.model_validate(inc).model_dump(),
        "junction": {"id": j.id, "name": j.name, "code": j.code,
                     "latitude": float(j.latitude), "longitude": float(j.longitude)} if j else None,
        "corridor": {"id": c.id, "name": c.name} if c else None,
        "lane": {"id": lane.id, "number": lane.lane_number, "type": lane.lane_type,
                 "allowed": lane.allowed_movement} if lane else None,
        "evidence": [schemas.EvidenceOut.model_validate(e).model_dump() for e in evidence],
        "ai_analysis": [schemas.AIAnalysisOut.model_validate(a).model_dump() for a in ai_list],
        "vehicles": [schemas.VehicleOut.model_validate(v).model_dump() for v in vehicles],
        "reports": [schemas.ReportOut.model_validate(r).model_dump() for r in reports],
        "demo_mode": True,
    }


@router.post("", response_model=schemas.IncidentOut, status_code=201)
def create_incident(
    payload: schemas.IncidentCreate,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    inc = models.Incident(
        case_number=_make_case_number(db),
        type=payload.type, source=payload.source,
        status="UNDER_REVIEW", severity=payload.severity,
        priority_score=50, confidence=payload.confidence,
        junction_id=payload.junction_id, corridor_id=payload.corridor_id,
        lane_id=payload.lane_id, reported_by_user_id=user.id,
        description=payload.description,
        blockage_duration=payload.blockage_duration,
        lane_occupancy=payload.lane_occupancy,
        vehicle_count=payload.vehicle_count, signal_state=payload.signal_state,
    )
    db.add(inc); db.commit(); db.refresh(inc)
    return schemas.IncidentOut.model_validate(inc)


def _notify(db, user_id, title, body, ntype, incident_id=None):
    db.add(models.Notification(
        user_id=user_id, title=title, body=body, type=ntype, incident_id=incident_id
    ))


@router.post("/{incident_id}/verify")
def verify_incident(
    incident_id: int,
    request: Request,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    old_status = inc.status
    inc.status = "VERIFIED"
    db.commit(); db.refresh(inc)
    _audit(db, user, "VERIFY_INCIDENT", incident_id, {"status": old_status}, {"status": "VERIFIED"}, request)
    if inc.reported_by_user_id:
        _notify(db, inc.reported_by_user_id, "Your report has been verified",
                f"Incident {inc.case_number} has been verified by traffic authority.",
                "INCIDENT_VERIFIED", incident_id)
        db.commit()
    return {"status": inc.status, "case_number": inc.case_number}


@router.post("/{incident_id}/reject")
def reject_incident(
    incident_id: int,
    request: Request,
    reason: Optional[str] = None,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    old_status = inc.status
    inc.status = "REJECTED"
    db.commit(); db.refresh(inc)
    _audit(db, user, "REJECT_INCIDENT", incident_id,
           {"status": old_status}, {"status": "REJECTED", "reason": reason}, request)
    if inc.reported_by_user_id:
        _notify(db, inc.reported_by_user_id, "Your report has been reviewed",
                f"Incident {inc.case_number} was not verified. Reason: {reason or 'Insufficient evidence'}.",
                "INCIDENT_REJECTED", incident_id)
        db.commit()
    return {"status": inc.status, "case_number": inc.case_number}


@router.post("/{incident_id}/request-info")
def request_more_info(
    incident_id: int,
    request: Request,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    old_status = inc.status
    inc.status = "MORE_INFO_REQUIRED"
    reports = db.query(models.Report).filter(models.Report.incident_id == inc.id).all()
    for r in reports:
        r.status = "MORE_INFO_REQUIRED"
    db.commit(); db.refresh(inc)
    _audit(db, user, "REQUEST_INFO", incident_id, {"status": old_status}, {"status": "MORE_INFO_REQUIRED"}, request)
    if inc.reported_by_user_id:
        _notify(db, inc.reported_by_user_id, "Additional information is required",
                f"For incident {inc.case_number}, please provide clearer evidence or location details.",
                "MORE_INFO", incident_id)
        db.commit()
    return {"status": inc.status, "case_number": inc.case_number}


@router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: int,
    request: Request,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    inc = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    old_status = inc.status
    inc.status = "RESOLVED"
    reports = db.query(models.Report).filter(models.Report.incident_id == inc.id).all()
    for r in reports:
        r.status = "RESOLVED"
    db.commit(); db.refresh(inc)
    _audit(db, user, "RESOLVE_INCIDENT", incident_id, {"status": old_status}, {"status": "RESOLVED"}, request)
    if inc.reported_by_user_id:
        _notify(db, inc.reported_by_user_id, "Your case has been resolved",
                f"Incident {inc.case_number} has been marked as resolved by traffic authority.",
                "INCIDENT_RESOLVED", incident_id)
        db.commit()
    return {"status": inc.status, "case_number": inc.case_number}
