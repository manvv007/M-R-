from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import random

from ..database import get_db
from .. import models, schemas, config
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/ai", tags=["AI Analysis"])


def _mock_vehicle_list(seed: int, n: int):
    random.seed(seed)
    v_types = ["car", "bike", "auto", "truck", "bus"]
    colors = ["White", "Silver", "Black", "Red", "Blue", "Grey", "Green", "Yellow"]
    vs = []
    for i in range(n):
        vs.append({
            "type": random.choice(v_types),
            "bbox": [round(random.random(), 3) for _ in range(4)],
            "confidence": round(random.uniform(0.82, 0.98), 3),
            "track_id": f"TRK-{random.randint(1000,9999)}",
            "direction": random.choice(["straight", "left", "right", "wrong_side"]),
            "color": random.choice(colors),
            "is_parked": random.random() < 0.25,
            "plate_state": random.choice(["GJ", "DL", "HR", "UP", "MH", "KA", "TN"]),
            "plate_num": f"{random.randint(1000,9999):04d}",
            "plate_suffix": random.choice(["AB", "CD", "GH", "JK", "MH", "XX", "YZ"]),
            "plate_district": random.choice(["01", "05", "06", "12", "18", "47"]),
        })
    return vs


@router.post("/analyze", response_model=schemas.AIAnalysisOut)
def analyze_evidence(
    payload: schemas.AIAnalysisRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    evidence = db.query(models.Evidence).filter(models.Evidence.id == payload.evidence_id).first()
    if not evidence:
        raise HTTPException(404, "Evidence not found")

    report = None
    if payload.report_id:
        report = db.query(models.Report).filter(models.Report.id == payload.report_id).first()

    seed = payload.evidence_id * 31 + 7
    n_vehicles = random.Random(seed).randint(1, 7)
    vehicles = _mock_vehicle_list(seed, n_vehicles)

    type_hint = report.type if report else (
        db.query(models.Incident).filter(models.Incident.id == payload.incident_id).first().type
        if payload.incident_id else "LANE_BLOCKAGE"
    )

    base_confidence = round(random.Random(seed).uniform(0.78, 0.97), 2)
    quality = random.Random(seed + 1).randint(70, 97)
    parking = type_hint == "ILLEGAL_PARKING" or any(v["is_parked"] for v in vehicles)
    wrong_side = type_hint == "WRONG_SIDE" or any(v["direction"] == "wrong_side" for v in vehicles)
    blockage = type_hint == "LANE_BLOCKAGE" or (len(vehicles) >= 4)

    primary_vehicle = vehicles[0] if vehicles else None
    number_plate = None
    if primary_vehicle and random.Random(seed + 2).random() < 0.72:
        p = primary_vehicle
        number_plate = f"{p['plate_state']}{p['plate_district']}{p['plate_suffix']}{p['plate_num']}"

    analysis = models.AIAnalysis(
        evidence_id=evidence.id,
        incident_id=payload.incident_id,
        report_id=payload.report_id,
        analysis_type=payload.analysis_type,
        model_version="mock-yolov8n-easyocr-india-demo-v1.0",
        confidence=round(base_confidence * 100, 2),
        is_mock=True,
        detected_vehicles=vehicles,
        detected_lanes=[
            {"id": 1, "type": "left_turn", "occupancy": 84.0 if blockage else 32.0},
            {"id": 2, "type": "straight", "occupancy": 58.0},
            {"id": 3, "type": "straight", "occupancy": 46.0},
            {"id": 4, "type": "right_turn", "occupancy": 22.0},
        ],
        signal_state="GREEN" if blockage else None,
        number_plate=number_plate,
        parking_detected=parking,
        wrong_side_detected=wrong_side,
        blockage_detected=blockage,
        evidence_quality_score=quality,
        evidence_quality_breakdown={
            "image_clarity": quality + random.Random(seed).randint(-3, 3),
            "vehicle_visible": 100 if vehicles else 55,
            "location_available": 100 if (report and report.latitude) else (
                0 if payload.report_id else 95
            ),
            "timestamp_available": 100,
            "context_sufficient": quality + random.Random(seed + 5).randint(-6, 2),
        },
        selected_frames=[
            {"index": 0, "label": "Vehicle approach view", "url": evidence.file_url},
            {"index": 8, "label": "Road / signal context", "url": evidence.file_url},
            {"index": 14, "label": "Violation captured", "url": evidence.file_url},
            {"index": 21, "label": "Number plate close-up", "url": evidence.file_url},
        ],
    )
    db.add(analysis); db.flush()

    # Save vehicles to DB
    for v in vehicles:
        db.add(models.Vehicle(
            incident_id=payload.incident_id, ai_analysis_id=analysis.id,
            vehicle_type=v["type"], number_plate=(
                f"{v['plate_state']}{v['plate_district']}{v['plate_suffix']}{v['plate_num']}"
                if random.random() < 0.55 else None
            ),
            color=v["color"], bbox=v["bbox"], direction=v["direction"],
            track_id=v["track_id"], is_parked=v["is_parked"],
            confidence=round(v["confidence"] * 100, 2),
        ))

    # Update linked incident & report statuses + confidence + vehicle count
    if payload.incident_id:
        inc = db.query(models.Incident).filter(models.Incident.id == payload.incident_id).first()
        if inc:
            inc.confidence = analysis.confidence
            inc.vehicle_count = len(vehicles)
            inc.lane_occupancy = 84.0 if blockage else inc.lane_occupancy
            if blockage:
                inc.blockage_duration = 21
                inc.signal_state = "GREEN"
                inc.severity = "HIGH"
                inc.priority_score = 87
            if inc.status == "AI_PROCESSING":
                inc.status = "UNDER_REVIEW"

    if payload.report_id:
        rep = db.query(models.Report).filter(models.Report.id == payload.report_id).first()
        if rep and rep.status == "AI_PROCESSING":
            rep.status = "UNDER_REVIEW"
        if rep and rep.incident_id:
            inc = db.query(models.Incident).filter(models.Incident.id == rep.incident_id).first()
            if inc and inc.status == "SUBMITTED":
                inc.status = "UNDER_REVIEW"
                inc.confidence = analysis.confidence
                inc.vehicle_count = len(vehicles)

    # Notifications
    if payload.report_id:
        rep_user_id = report.user_id if report else None
        if rep_user_id:
            db.add(models.Notification(
                user_id=rep_user_id,
                title="AI analysis has completed",
                body=(
                    f"Confidence: {round(base_confidence*100, 0):.0f}%. "
                    f"Detected {len(vehicles)} vehicle(s). Evidence quality: "
                    + ("Excellent" if quality >= 90 else ("Good" if quality >= 75 else "Fair"))
                    + ". Your report is now being reviewed by an authority."
                ),
                type="AI_ANALYSIS_DONE", report_id=payload.report_id,
                incident_id=payload.incident_id,
            ))

    db.commit()
    db.refresh(analysis)
    return schemas.AIAnalysisOut.model_validate(analysis)


@router.get("/analysis/{analysis_id}", response_model=schemas.AIAnalysisOut)
def get_analysis(
    analysis_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(models.AIAnalysis).filter(models.AIAnalysis.id == analysis_id).first()
    if not a:
        raise HTTPException(404, "Analysis not found")
    return schemas.AIAnalysisOut.model_validate(a)


@router.get("/junction-simulation/{junction_id}")
def junction_simulation(
    junction_id: int,
    tick: int = 0,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mock frame generator for live junction monitoring demo.
    tick 0-30 = RED (left-turn lane empty, build up)
    tick 31-60 = GREEN (left turn lane blocked by straight vehicles -> detection)
    """
    t = tick % 60
    if t < 30:
        signal = "RED"
        vehicles = min(t + 2, 12)
        left_occ = min(10.0 + t * 1.2, 40.0)
        blocked = False
        duration = 0
    else:
        signal = "GREEN"
        tg = t - 30
        vehicles = 14 + min(tg, 12)
        left_occ = min(50.0 + tg * 1.8, 88.0)
        duration = max(0, tg - 5) if left_occ > 60 else 0
        blocked = duration >= 10

    lanes = [
        {"id": 1, "lane_number": 1, "type": "left_turn", "allowed": "left",
         "occupancy": round(left_occ, 1), "vehicles": max(1, int(vehicles * 0.35))},
        {"id": 2, "lane_number": 2, "type": "straight", "allowed": "straight",
         "occupancy": round(40.0 + (50 if signal == "GREEN" else 0), 1),
         "vehicles": max(1, int(vehicles * 0.35))},
        {"id": 3, "lane_number": 3, "type": "straight", "allowed": "straight",
         "occupancy": round(32.0 + (40 if signal == "GREEN" else 0), 1),
         "vehicles": max(0, int(vehicles * 0.22))},
        {"id": 4, "lane_number": 4, "type": "right_turn", "allowed": "right",
         "occupancy": round(16.0 + (20 if signal == "GREEN" else 0), 1),
         "vehicles": max(0, int(vehicles * 0.12))},
    ]

    vlist = _mock_vehicle_list(tick * 13 + junction_id, vehicles)
    # Mark lane 1 vehicles as STRAIGHT (blocking left turn) when blocked
    for i, v in enumerate(vlist):
        if blocked and i < int(vehicles * 0.35):
            v["direction"] = "straight"
            v["is_parked"] = False
        v["lane"] = min(1 + (i % 4), 4)

    return {
        "junction_id": junction_id,
        "tick": t,
        "signal_state": signal,
        "time_in_state": t if t < 30 else (t - 30),
        "blockage_detected": blocked,
        "blockage_duration": duration,
        "blockage_lane": 1,
        "severity": "HIGH" if duration >= 20 else ("MEDIUM" if blocked else "LOW"),
        "total_vehicles": vehicles,
        "lanes": lanes,
        "vehicles": vlist,
        "is_mock": True,
        "demo_mode": True,
        "warning": (
            "LEFT-TURN LANE BLOCKED" if blocked else
            "LEFT-TURN LANE AT RISK" if left_occ > 60 and signal == "GREEN" else None
        ),
    }
