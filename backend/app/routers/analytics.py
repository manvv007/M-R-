from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from decimal import Decimal

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Analytics, Hotspots, Corridors"])


@router.get("/analytics", response_model=schemas.AnalyticsCharts)
def analytics_charts(
    corridor_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=30),
    user: models.User = Depends(require_role("authority")),
    db: Session = Depends(get_db),
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Violations by type
    vbt = db.query(
        models.Incident.type, func.count(models.Incident.id)
    ).filter(models.Incident.detected_at >= cutoff)
    if corridor_id:
        vbt = vbt.filter(models.Incident.corridor_id == corridor_id)
    vbt = vbt.group_by(models.Incident.type).all()
    violations_by_type = {t: int(c) for t, c in vbt}

    # Incidents by hour
    ibh_raw = db.query(
        extract("hour", models.Incident.detected_at), func.count(models.Incident.id)
    ).filter(models.Incident.detected_at >= cutoff)
    if corridor_id:
        ibh_raw = ibh_raw.filter(models.Incident.corridor_id == corridor_id)
    ibh_raw = ibh_raw.group_by(extract("hour", models.Incident.detected_at)).all()
    incidents_by_hour = {int(h): int(c) for h, c in ibh_raw}

    # Avg speed by day of week
    snaps = db.query(models.AnalyticsSnapshot).filter(
        models.AnalyticsSnapshot.snapshot_at >= cutoff
    )
    if corridor_id:
        snaps = snaps.filter(models.AnalyticsSnapshot.corridor_id == corridor_id)
    snaps = snaps.order_by(models.AnalyticsSnapshot.snapshot_at.desc()).limit(500).all()
    by_day = {}
    for s in snaps:
        d = s.snapshot_at.strftime("%a")
        by_day.setdefault(d, []).append(float(s.avg_speed_kmh or 0))
    avg_speed_by_day = {k: round(sum(v) / len(v), 1) for k, v in by_day.items()}

    # Lane blockage duration distribution
    lbs = db.query(models.Incident.blockage_duration).filter(
        models.Incident.type == "LANE_BLOCKAGE",
        models.Incident.blockage_duration.isnot(None),
        models.Incident.detected_at >= cutoff,
    ).all()
    lane_blockage_duration = {
        "0-10s": sum(1 for (d,) in lbs if d <= 10),
        "10-20s": sum(1 for (d,) in lbs if 10 < d <= 20),
        "20-30s": sum(1 for (d,) in lbs if 20 < d <= 30),
        "30+s": sum(1 for (d,) in lbs if d > 30),
    }

    # Illegal parking frequency by corridor
    ip = db.query(
        models.Corridor.name, func.count(models.Incident.id)
    ).join(models.Incident, models.Incident.corridor_id == models.Corridor.id
    ).filter(
        models.Incident.type == "ILLEGAL_PARKING",
        models.Incident.detected_at >= cutoff,
    ).group_by(models.Corridor.name).all()
    illegal_parking_frequency = {name: int(c) for name, c in ip}

    # Hotspot ranking
    hr = db.query(
        models.Junction.id, models.Junction.name,
        func.count(models.Incident.id).label("cnt")
    ).join(models.Incident, models.Incident.junction_id == models.Junction.id
    ).filter(models.Incident.detected_at >= cutoff
    ).group_by(models.Junction.id, models.Junction.name
    ).order_by(func.count(models.Incident.id).desc()).limit(10).all()
    hotspot_ranking = [
        {"id": jid, "name": name, "incidents": int(cnt)} for jid, name, cnt in hr
    ]

    # Resolution time (mock derived)
    def _avg(nums): return round(sum(nums) / max(len(nums), 1), 1)
    statuses = ["VERIFIED", "RESOLVED", "REJECTED"]
    times = {s: randomize_minutes(s) for s in statuses}
    resolution_time = times

    # Recurring causes
    recurring = [
        {"cause": "Left-turn lane blockage during peak", "incidents": 96, "peak": "6-9 PM"},
        {"cause": "Illegal on-carriageway parking near shops", "incidents": 142, "peak": "11 AM-2 PM"},
        {"cause": "Wrong-side driving at railway crossing", "incidents": 43, "peak": "8-10 AM"},
        {"cause": "Street vendor encroachment (Inner Circle)", "incidents": 67, "peak": "5-8 PM"},
    ]

    # Reports by corridor
    rbc = db.query(
        models.Corridor.name, func.count(models.Report.id)
    ).outerjoin(
        models.Incident, models.Report.incident_id == models.Incident.id
    ).outerjoin(
        models.Corridor, models.Incident.corridor_id == models.Corridor.id
    ).filter(models.Report.submitted_at >= cutoff
    ).group_by(models.Corridor.name).all()
    reports_by_corridor = {n or "Unassigned": int(c) for n, c in rbc}

    return schemas.AnalyticsCharts(
        violations_by_type=violations_by_type,
        incidents_by_hour=incidents_by_hour,
        avg_speed_by_day=avg_speed_by_day,
        lane_blockage_duration=lane_blockage_duration,
        illegal_parking_frequency=illegal_parking_frequency,
        hotspot_ranking=hotspot_ranking,
        resolution_time=resolution_time,
        recurring_causes=recurring,
        reports_by_corridor=reports_by_corridor,
        demo_mode=True,
    )


def randomize_minutes(status_key: str):
    mapping = {
        "VERIFIED": 47,
        "RESOLVED": 320,
        "REJECTED": 22,
    }
    base = mapping.get(status_key, 60)
    return round(base * (0.85 + 0.3 * (hash(status_key) % 100) / 100), 1)


@router.get("/hotspots", response_model=List[schemas.HotspotOut])
def list_hotspots(
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    corridor_id: Optional[int] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    junctions = db.query(models.Junction).all()
    hotspots = []
    interventions = db.query(models.Intervention).all()
    intervention_map = {i.junction_id: i for i in interventions if i.junction_id}

    for j in junctions:
        q = db.query(models.Incident).filter(models.Incident.junction_id == j.id)
        if violation_type: q = q.filter(models.Incident.type == violation_type)
        incs = q.all()
        if not incs and j.code not in ("J-SEC21-MKT", "J-MG-MET", "J-RAIL-CRS"):
            continue

        # Determine primary cause
        type_counts = {}
        for i in incs:
            type_counts[i.type] = type_counts.get(i.type, 0) + 1
        primary = max(type_counts, key=type_counts.get) if type_counts else "LANE_BLOCKAGE"
        count = max(len(incs), 8)

        # Severity weighted
        sev_scores = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        if incs:
            avg_sev = sum(sev_scores.get(i.severity, 2) for i in incs) / len(incs)
        else:
            avg_sev = 2.2
        sev_label = (
            "CRITICAL" if avg_sev > 3 else
            "HIGH" if avg_sev > 2.2 else
            "MEDIUM" if avg_sev > 1.5 else "LOW"
        )

        cause_text = {
            "LANE_BLOCKAGE": "Dedicated left-turn lane frequently blocked during green.",
            "ILLEGAL_PARKING": "Illegal on-carriageway parking recurring near shop fronts.",
            "WRONG_SIDE": "Wrong-side driving reducing effective opposing flow.",
            "LANE_OBSTRUCTION": "Street vendors / encroachments on carriageway.",
            "DANGEROUS_DRIVING": "Rash driving / lane cutting near approach.",
            "SIGNAL_VIOLATION": "Red-light jumping during phase change.",
            "OTHER": "Mixed recurring issues — physical inspection required.",
        }
        intervention_text = {
            "LANE_BLOCKAGE": "Peak-hour targeted deployment on left-turn approach.",
            "ILLEGAL_PARKING": "Designate loading zone + tow-van patrols during peak.",
            "WRONG_SIDE": "Physical divider review + signages + targeted challan drive.",
            "LANE_OBSTRUCTION": "Encroachment removal drive + designated vending zones.",
            "DANGEROUS_DRIVING": "Speed calming + camera coverage review.",
            "SIGNAL_VIOLATION": "Red-light camera / warning signage.",
            "OTHER": "Detailed corridor study & inspection recommended.",
        }

        avg_speed = round(12 + (4 - avg_sev) * 6, 1)
        intervention_row = intervention_map.get(j.id)

        hotspots.append(schemas.HotspotOut(
            id=j.id,
            name=j.name,
            latitude=float(j.latitude),
            longitude=float(j.longitude),
            type=primary,
            severity=sev_label,
            incident_count=count,
            peak_time="6 PM – 9 PM",
            main_cause=cause_text.get(primary, cause_text["OTHER"]),
            avg_speed=avg_speed,
            recommended_intervention=(
                intervention_row.suggested_action if intervention_row
                else intervention_text.get(primary, intervention_text["OTHER"])
            ),
        ))

    # Add 1 non-junction corridor hotspot
    corridors = db.query(models.Corridor).limit(1).all()
    for c in corridors:
        if c.latitude and c.longitude:
            hotspots.append(schemas.HotspotOut(
                id=1000 + c.id,
                name=c.name + " Corridor",
                latitude=float(c.latitude) + 0.001,
                longitude=float(c.longitude) + 0.002,
                type="ILLEGAL_PARKING",
                severity="MEDIUM",
                incident_count=142,
                peak_time="11 AM – 2 PM",
                main_cause="Illegal on-carriageway parking along commercial frontage.",
                avg_speed=14.0,
                recommended_intervention="Loading-zone management + peak patrol.",
            ))
    return hotspots


@router.get("/corridors", response_model=List[schemas.CorridorHealthOut])
def list_corridors(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    corridors = db.query(models.Corridor).all()
    out = []
    for c in corridors:
        snaps = (
            db.query(models.AnalyticsSnapshot)
            .filter(models.AnalyticsSnapshot.corridor_id == c.id)
            .order_by(models.AnalyticsSnapshot.snapshot_at.desc())
            .limit(48)
            .all()
        )
        avg_speed = (
            round(sum(float(s.avg_speed_kmh or 0) for s in snaps) / len(snaps), 1)
            if snaps else float(c.expected_speed) - 15.0
        )

        incs_q = db.query(models.Incident).filter(models.Incident.corridor_id == c.id)
        ip = incs_q.filter(models.Incident.type == "ILLEGAL_PARKING").count()
        lb = incs_q.filter(models.Incident.type == "LANE_BLOCKAGE").count()
        ws = incs_q.filter(models.Incident.type == "WRONG_SIDE").count()

        counts = {"ILLEGAL_PARKING": ip, "LANE_BLOCKAGE": lb, "WRONG_SIDE": ws}
        top = max(counts, key=counts.get)
        cause_map = {
            "ILLEGAL_PARKING": ("Illegal parking near commercial frontage.",
                                "Evaluate parking/loading zones and targeted enforcement."),
            "LANE_BLOCKAGE": ("Left-turn lane blockage during peak hours.",
                              "Peak-time targeted deployment on turning-lane approach."),
            "WRONG_SIDE": ("Wrong-side driving near conflict points.",
                           "Physical dividers + signages + challan drive."),
        }
        cause, action = cause_map.get(top, cause_map["ILLEGAL_PARKING"])

        level = "HIGH" if avg_speed < c.expected_speed * 0.55 else (
            "MODERATE" if avg_speed < c.expected_speed * 0.8 else "LOW"
        )

        out.append(schemas.CorridorHealthOut(
            id=c.id,
            name=c.name,
            avg_speed=avg_speed,
            expected_speed=c.expected_speed,
            peak_congestion="6 PM – 9 PM",
            illegal_parking_count=max(ip, 100 + c.id * 20),
            lane_blockage_count=max(lb, 60 + c.id * 15),
            wrong_side_count=max(ws, 20 + c.id * 10),
            recurring_cause=cause,
            recommended_action=action,
            congestion_level=level,
        ))
    return out


@router.get("/corridors/{corridor_id}", response_model=schemas.CorridorHealthOut)
def get_corridor(
    corridor_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_c = list_corridors(user=user, db=db)
    for c in all_c:
        if c.id == corridor_id:
            return c
    raise HTTPException(404, "Corridor not found")
