from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from .. import models, schemas, config
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Dashboard & Stats"])


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    active_statuses = ["SUBMITTED", "AI_PROCESSING", "UNDER_REVIEW", "ACTIVE"]
    active_incidents = (
        db.query(models.Incident)
        .filter(models.Incident.status.in_(active_statuses))
        .count()
    )
    lane_blockages = (
        db.query(models.Incident)
        .filter(
            models.Incident.type == "LANE_BLOCKAGE",
            models.Incident.status.in_(active_statuses),
        )
        .count()
    )
    illegal_parking = (
        db.query(models.Incident)
        .filter(
            models.Incident.type == "ILLEGAL_PARKING",
            models.Incident.status != "CLOSED",
        )
        .count()
    )
    high_risk = (
        db.query(models.Junction)
        .filter(models.Junction.id.in_(
            db.query(models.Incident.junction_id)
            .filter(models.Incident.severity.in_(["HIGH", "CRITICAL"]))
            .distinct()
        ))
        .count()
    )
    snapshots = db.query(models.AnalyticsSnapshot).order_by(
        models.AnalyticsSnapshot.snapshot_at.desc()
    ).limit(24).all()
    avg_speed = 22.5
    if snapshots:
        total = sum(float(s.avg_speed_kmh or 0) for s in snapshots)
        avg_speed = round(total / len(snapshots), 1)

    return schemas.DashboardStats(
        active_incidents=active_incidents,
        lane_blockages=lane_blockages,
        illegal_parking_reports=illegal_parking,
        high_risk_hotspots=max(3, high_risk),
        avg_traffic_speed=avg_speed,
        demo_mode=config.settings.DEMO_MODE,
    )


@router.get("/dashboard/activities")
def recent_activities(
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    incidents = (
        db.query(models.Incident)
        .order_by(models.Incident.detected_at.desc())
        .limit(10)
        .all()
    )
    items = []
    for inc in incidents:
        j = db.query(models.Junction).filter(models.Junction.id == inc.junction_id).first()
        items.append({
            "id": inc.id,
            "case_number": inc.case_number,
            "type": inc.type,
            "severity": inc.severity,
            "status": inc.status,
            "source": inc.source,
            "location": j.name if j else "Unknown",
            "detected_at": inc.detected_at.isoformat(),
            "priority_score": inc.priority_score,
        })
    return {"items": items, "demo_mode": config.settings.DEMO_MODE}


@router.get("/congestion-cause/{corridor_id}", response_model=schemas.CongestionCause)
def congestion_cause(
    corridor_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    corridor = db.query(models.Corridor).filter(models.Corridor.id == corridor_id).first()
    if not corridor:
        raise HTTPException(404, "Corridor not found")

    recent = (
        db.query(models.AnalyticsSnapshot)
        .filter(models.AnalyticsSnapshot.corridor_id == corridor_id)
        .order_by(models.AnalyticsSnapshot.snapshot_at.desc())
        .limit(48)
        .all()
    )
    if recent:
        speed = sum(float(r.avg_speed_kmh or 0) for r in recent) / len(recent)
        lb = sum(float(r.lane_blockage_pct or 0) for r in recent) / len(recent)
        ip = sum(float(r.illegal_parking_pct or 0) for r in recent) / len(recent)
        ws = sum(float(r.wrong_side_pct or 0) for r in recent) / len(recent)
        ot = sum(float(r.other_pct or 0) for r in recent) / len(recent)
    else:
        speed = 14.0; lb = 41.0; ip = 34.0; ws = 16.0; ot = 9.0

    total = max(lb + ip + ws + ot, 0.01)
    breakdown = {
        "Lane Blockage": round(lb / total * 100, 1),
        "Illegal Parking": round(ip / total * 100, 1),
        "Wrong-Side Driving": round(ws / total * 100, 1),
        "Other": round(ot / total * 100, 1),
    }
    primary = max(breakdown, key=breakdown.get)
    level = "HIGH" if speed < 18 else ("MODERATE" if speed < 26 else "LOW")

    primary_text_map = {
        "Lane Blockage": "Dedicated left-turn lane blocked during peak hours.",
        "Illegal Parking": "Illegal on-carriageway parking near commercial frontage.",
        "Wrong-Side Driving": "Wrong-side driving reducing effective opposing flow.",
        "Other": "Mixed recurring bottlenecks requiring physical inspection.",
    }
    intervention_map = {
        "Lane Blockage": "Targeted enforcement during peak hours.",
        "Illegal Parking": "Parking/loading zone review and tow-van patrol.",
        "Wrong-Side Driving": "Physical divider review and signages + challan drive.",
        "Other": "Detailed corridor study and physical inspection recommended.",
    }

    return schemas.CongestionCause(
        corridor_name=corridor.name,
        current_speed=round(speed, 1),
        expected_speed=corridor.expected_speed,
        congestion_level=level,
        cause_breakdown=breakdown,
        primary_cause=primary_text_map.get(primary, primary_text_map["Other"]),
        suggested_intervention=intervention_map.get(primary, intervention_map["Other"]),
    )
