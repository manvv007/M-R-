from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Interventions, Notifications, Audit"])


@router.get("/interventions", response_model=List[schemas.InterventionOut])
def list_interventions(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    q = db.query(models.Intervention)
    if status: q = q.filter(models.Intervention.status == status)
    if priority: q = q.filter(models.Intervention.priority == priority)
    items = q.order_by(models.Intervention.priority.desc(),
                       models.Intervention.evidence_count.desc()).all()
    return [schemas.InterventionOut.model_validate(i) for i in items]


@router.post("/interventions/{intervention_id}/status")
def update_intervention_status(
    intervention_id: int,
    status: str,
    request: Request,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    row = db.query(models.Intervention).filter(
        models.Intervention.id == intervention_id
    ).first()
    if not row:
        raise HTTPException(404, "Intervention not found")
    valid = {"SUGGESTED", "UNDER_REVIEW", "APPROVED", "IMPLEMENTED"}
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Use one of: {valid}")
    old = row.status
    row.status = status
    db.add(models.AuditLog(
        user_id=user.id, action="UPDATE_INTERVENTION_STATUS",
        intervention_id=intervention_id,
        old_value={"status": old}, new_value={"status": status},
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()
    return {"id": intervention_id, "status": status}


@router.get("/notifications")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.Notification).filter(models.Notification.user_id == user.id)
    if unread_only:
        q = q.filter(models.Notification.is_read == False)
    items = q.order_by(models.Notification.created_at.desc()).limit(limit).all()
    return {
        "items": [schemas.NotificationOut.model_validate(n).model_dump() for n in items],
        "unread_count": sum(1 for n in items if not n.is_read),
    }


@router.post("/notifications/{nid}/read")
def mark_notification_read(
    nid: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(models.Notification).filter(
        models.Notification.id == nid,
        models.Notification.user_id == user.id,
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"id": nid, "is_read": True}


@router.post("/notifications/read-all")
def mark_all_read(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    (
        db.query(models.Notification)
        .filter_by(user_id=user.id, is_read=False)
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return {"ok": True}


@router.get("/audit-logs")
def list_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    q = db.query(models.AuditLog)
    if action: q = q.filter(models.AuditLog.action == action)
    if user_id: q = q.filter(models.AuditLog.user_id == user_id)
    total = q.count()
    items = (
        q.order_by(models.AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [schemas.AuditLogOut.model_validate(a).model_dump() for a in items],
        "total": total, "page": page, "page_size": page_size,
    }


@router.post("/incidents/{incident_id}/group-duplicates")
def group_duplicate_incidents(
    incident_id: int,
    duplicate_ids: List[int],
    request: Request,
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    master = db.query(models.Incident).filter_by(id=incident_id).first()
    if not master:
        raise HTTPException(404, "Master incident not found")
    group = models.DuplicateGroup(
        master_incident_id=incident_id,
        duplicate_incident_ids=duplicate_ids,
        similarity_score=88.5,
        reason="Location + timestamp + vehicle match.",
        grouped_by_authority_id=user.id,
    )
    db.add(group)
    db.add(models.AuditLog(
        user_id=user.id, action="GROUP_DUPLICATES",
        incident_id=incident_id,
        new_value={"master": incident_id, "duplicates": duplicate_ids},
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()
    return {"grouped": True, "master": incident_id, "duplicates": duplicate_ids}


@router.get("/junctions")
def list_junctions(user: models.User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    q = db.query(models.Junction).all()
    return [
        {
            "id": j.id, "name": j.name, "code": j.code,
            "latitude": float(j.latitude), "longitude": float(j.longitude),
            "has_cctv": j.has_cctv, "num_signals": j.num_signals,
            "corridor_id": j.corridor_id,
            "lanes": [
                {"id": l.id, "number": l.lane_number, "type": l.lane_type,
                 "allowed": l.allowed_movement}
                for l in db.query(models.Lane).filter_by(junction_id=j.id).all()
            ],
        }
        for j in q
    ]


@router.get("/junctions/{junction_id}")
def get_junction(junction_id: int, user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    j = db.query(models.Junction).filter_by(id=junction_id).first()
    if not j:
        raise HTTPException(404, "Junction not found")
    lanes = db.query(models.Lane).filter_by(junction_id=junction_id).all()
    signals = db.query(models.Signal).filter_by(junction_id=junction_id).all()
    return {
        "id": j.id, "name": j.name, "code": j.code,
        "latitude": float(j.latitude), "longitude": float(j.longitude),
        "has_cctv": j.has_cctv, "num_signals": j.num_signals,
        "description": j.description, "corridor_id": j.corridor_id,
        "lanes": [
            {"id": l.id, "number": l.lane_number, "type": l.lane_type,
             "allowed": l.allowed_movement,
             "polygon": l.polygon_coords,
             "occupancy_threshold": float(l.occupancy_threshold),
             "blockage_threshold_sec": l.blockage_duration_threshold,
             } for l in lanes
        ],
        "signals": [
            {"id": s.id, "group": s.signal_group, "state": s.current_state,
             "cycle_duration": s.cycle_duration,
             "green_duration": s.green_duration} for s in signals
        ],
    }
