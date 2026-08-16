import random
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from . import models
from .auth import hash_password


def seed_demo_data(db: Session):
    print("Seeding RoadWatch demo data...")

    if db.query(models.Role).count() == 0:
        db.add_all([
            models.Role(name="citizen", description="Regular citizen user"),
            models.Role(name="authority", description="Traffic authority official"),
            models.Role(name="admin", description="System administrator"),
        ])
        db.commit()

    citizen_role = db.query(models.Role).filter_by(name="citizen").first()
    authority_role = db.query(models.Role).filter_by(name="authority").first()

    users = [
        {
            "full_name": "Demo Citizen",
            "email": "citizen@roadwatch.in",
            "phone": "+919876543210",
            "role_id": citizen_role.id,
        },
        {
            "full_name": "Inspector Sharma",
            "email": "authority@roadwatch.in",
            "phone": "+919876543211",
            "role_id": authority_role.id,
        },
        {
            "full_name": "Rahul Mehta",
            "email": "rahul@roadwatch.in",
            "phone": "+919876543212",
            "role_id": citizen_role.id,
        },
        {
            "full_name": "Priya Verma",
            "email": "priya@roadwatch.in",
            "phone": "+919876543213",
            "role_id": citizen_role.id,
        },
    ]

    for u in users:
        existing = db.query(models.User).filter_by(email=u["email"]).first()
        if not existing:
            db.add(models.User(
                full_name=u["full_name"],
                email=u["email"],
                phone=u["phone"],
                password_hash=hash_password(u["email"].split("@")[0].capitalize() + "@123"),
                role_id=u["role_id"],
            ))
    db.commit()

    # 3 corridors
    corridor_data = [
        {
            "name": "Sector 21 Market Road",
            "description": "Busy commercial market corridor with 4 lanes, chronic parking issues near shops.",
            "length_km": Decimal("2.8"),
            "num_lanes": 4,
            "expected_speed": 30,
            "latitude": Decimal("28.4595"),
            "longitude": Decimal("77.0266"),
            "city": "Gurugram, Haryana",
        },
        {
            "name": "MG Road Boulevard",
            "description": "Major arterial road with office complexes and frequent left-turn lane blockages.",
            "length_km": Decimal("4.2"),
            "num_lanes": 6,
            "expected_speed": 40,
            "latitude": Decimal("28.4750"),
            "longitude": Decimal("77.0780"),
            "city": "Gurugram, Haryana",
        },
        {
            "name": "Old Railway Road",
            "description": "Narrow corridor with heavy encroachment and wrong-side driving during peak.",
            "length_km": Decimal("1.8"),
            "num_lanes": 2,
            "expected_speed": 25,
            "latitude": Decimal("28.4680"),
            "longitude": Decimal("77.0350"),
            "city": "Gurugram, Haryana",
        },
    ]
    corridors = []
    for c in corridor_data:
        existing = db.query(models.Corridor).filter_by(name=c["name"]).first()
        if existing:
            corridors.append(existing)
        else:
            corridor = models.Corridor(**c)
            db.add(corridor)
            db.flush()
            corridors.append(corridor)
    db.commit()

    # 5 junctions
    junction_data = [
        {
            "corridor_idx": 0, "name": "Sector 21 Market Junction", "code": "J-SEC21-MKT",
            "lat": "28.4595", "lon": "77.0266", "has_cctv": True, "signals": 4,
            "desc": "Primary junction for Sector 21 market with dedicated left-turn lane.",
        },
        {
            "corridor_idx": 0, "name": "Sector 21 Inner Circle", "code": "J-SEC21-CIR",
            "lat": "28.4610", "lon": "77.0280", "has_cctv": True, "signals": 3,
            "desc": "Circle junction near vegetable market with illegal parking on sides.",
        },
        {
            "corridor_idx": 1, "name": "MG Road Metro Junction", "code": "J-MG-MET",
            "lat": "28.4750", "lon": "77.0780", "has_cctv": True, "signals": 4,
            "desc": "Metro station junction with pedestrian crossing and lane blockages.",
        },
        {
            "corridor_idx": 1, "name": "MG Road Galleria", "code": "J-MG-GAL",
            "lat": "28.4790", "lon": "77.0880", "has_cctv": False, "signals": 2,
            "desc": "Mall approach junction, heavy right-turn conflicts.",
        },
        {
            "corridor_idx": 2, "name": "Old Railway Road Crossing", "code": "J-RAIL-CRS",
            "lat": "28.4680", "lon": "77.0350", "has_cctv": True, "signals": 4,
            "desc": "Railway crossing junction with wrong-side issues.",
        },
    ]
    junctions = []
    for j in junction_data:
        existing = db.query(models.Junction).filter_by(code=j["code"]).first()
        if existing:
            junctions.append(existing)
            continue
        junction = models.Junction(
            corridor_id=corridors[j["corridor_idx"]].id,
            name=j["name"], code=j["code"],
            latitude=Decimal(j["lat"]), longitude=Decimal(j["lon"]),
            has_cctv=j["has_cctv"], num_signals=j["signals"], description=j["desc"],
        )
        db.add(junction)
        db.flush()
        junctions.append(junction)

        # Create lanes for primary junctions
        lane_defs = [
            (1, "left_turn", "left", [[0, 0], [0.25, 0], [0.25, 1], [0, 1]]),
            (2, "straight", "straight", [[0.25, 0], [0.5, 0], [0.5, 1], [0.25, 1]]),
            (3, "straight", "straight", [[0.5, 0], [0.75, 0], [0.75, 1], [0.5, 1]]),
            (4, "right_turn", "right", [[0.75, 0], [1.0, 0], [1.0, 1], [0.75, 1]]),
        ]
        if j["code"] == "J-SEC21-MKT":
            for num, lt, mv, poly in lane_defs:
                db.add(models.Lane(
                    junction_id=junction.id, lane_number=num,
                    lane_type=lt, allowed_movement=mv,
                    polygon_coords=poly,
                    occupancy_threshold=Decimal("60.0"),
                    blockage_duration_threshold=10,
                ))
                db.add(models.Signal(
                    junction_id=junction.id, lane_id=None,
                    signal_group=f"Approach-{num}", current_state="RED",
                    cycle_duration=120, green_duration=30,
                ))
    db.commit()

    # 20+ synthetic incidents
    citizen_user = db.query(models.User).filter_by(email="citizen@roadwatch.in").first()
    rahul_user = db.query(models.User).filter_by(email="rahul@roadwatch.in").first()
    priya_user = db.query(models.User).filter_by(email="priya@roadwatch.in").first()

    incident_defs = [
        # Case 1: LANE BLOCKAGE (primary demo)
        dict(type="LANE_BLOCKAGE", source="CCTV", status="UNDER_REVIEW",
             severity="HIGH", priority_score=87, confidence=Decimal("94.0"),
             j_idx=0, c_idx=0, lane=1, user=None,
             desc="Left-turn lane blocked by straight-going vehicles during green signal.",
             blockage_dur=21, lane_occ=Decimal("84.0"), vcount=7, sig="GREEN",
             mins_ago=12, case_offset=1),

        # Case 2: ILLEGAL PARKING (citizen)
        dict(type="ILLEGAL_PARKING", source="CITIZEN", status="UNDER_REVIEW",
             severity="MEDIUM", priority_score=72, confidence=Decimal("91.0"),
             j_idx=0, c_idx=0, lane=None, user=citizen_user,
             desc="Car parked on left-turn approach near Sector 21 market gate.",
             blockage_dur=None, lane_occ=None, vcount=1, sig=None,
             mins_ago=40, case_offset=2),

        # Case 3: WRONG SIDE
        dict(type="WRONG_SIDE", source="CITIZEN", status="SUBMITTED",
             severity="HIGH", priority_score=81, confidence=Decimal("87.0"),
             j_idx=4, c_idx=2, lane=None, user=rahul_user,
             desc="Multiple two-wheelers driving wrong-side near railway crossing.",
             blockage_dur=None, lane_occ=None, vcount=4, sig=None,
             mins_ago=55, case_offset=3),

        # Case 4: LANE OBSTRUCTION
        dict(type="LANE_OBSTRUCTION", source="CITIZEN", status="VERIFIED",
             severity="MEDIUM", priority_score=68, confidence=Decimal("93.0"),
             j_idx=1, c_idx=0, lane=None, user=priya_user,
             desc="Street vendors occupying carriageway near vegetable market.",
             blockage_dur=None, lane_occ=Decimal("70.0"), vcount=0, sig=None,
             mins_ago=120, case_offset=4),

        # Case 5: DANGEROUS DRIVING
        dict(type="DANGEROUS_DRIVING", source="CITIZEN", status="AI_PROCESSING",
             severity="HIGH", priority_score=83, confidence=Decimal("79.0"),
             j_idx=2, c_idx=1, lane=None, user=citizen_user,
             desc="Rash lane cutting near metro station approach.",
             blockage_dur=None, lane_occ=None, vcount=2, sig=None,
             mins_ago=25, case_offset=5),

        # Case 6: LANE BLOCKAGE
        dict(type="LANE_BLOCKAGE", source="CCTV", status="ACTIVE",
             severity="HIGH", priority_score=90, confidence=Decimal("92.0"),
             j_idx=2, c_idx=1, lane=1, user=None,
             desc="Left-turn lane blocked at MG Road Metro Junction (evening peak).",
             blockage_dur=28, lane_occ=Decimal("88.0"), vcount=9, sig="GREEN",
             mins_ago=8, case_offset=6),

        # Case 7: ILLEGAL PARKING
        dict(type="ILLEGAL_PARKING", source="CITIZEN", status="RESOLVED",
             severity="LOW", priority_score=45, confidence=Decimal("88.0"),
             j_idx=3, c_idx=1, lane=None, user=rahul_user,
             desc="SUV parked on pedestrian crossing near Galleria.",
             blockage_dur=None, lane_occ=None, vcount=1, sig=None,
             mins_ago=60 * 6, case_offset=7),

        # Case 8: WRONG SIDE
        dict(type="WRONG_SIDE", source="CCTV", status="VERIFIED",
             severity="CRITICAL", priority_score=94, confidence=Decimal("89.0"),
             j_idx=4, c_idx=2, lane=None, user=None,
             desc="Heavy truck wrong-side on Old Railway Road.",
             blockage_dur=None, lane_occ=None, vcount=1, sig="GREEN",
             mins_ago=75, case_offset=8),

        # Case 9: ILLEGAL PARKING
        dict(type="ILLEGAL_PARKING", source="CITIZEN", status="SUBMITTED",
             severity="MEDIUM", priority_score=63, confidence=Decimal("85.0"),
             j_idx=0, c_idx=0, lane=None, user=priya_user,
             desc="Three cars parked in no-parking zone near shop fronts.",
             blockage_dur=None, lane_occ=None, vcount=3, sig=None,
             mins_ago=20, case_offset=9),

        # Case 10: LANE BLOCKAGE
        dict(type="LANE_BLOCKAGE", source="CCTV", status="UNDER_REVIEW",
             severity="MEDIUM", priority_score=74, confidence=Decimal("90.0"),
             j_idx=1, c_idx=0, lane=2, user=None,
             desc="Through lane occupied by parked delivery vehicles.",
             blockage_dur=15, lane_occ=Decimal("78.0"), vcount=3, sig="GREEN",
             mins_ago=90, case_offset=10),

        # Case 11: OTHER
        dict(type="OTHER", source="CITIZEN", status="MORE_INFO_REQUIRED",
             severity="LOW", priority_score=33, confidence=Decimal("52.0"),
             j_idx=3, c_idx=1, lane=None, user=citizen_user,
             desc="Possible broken traffic signal at Galleria junction.",
             blockage_dur=None, lane_occ=None, vcount=0, sig=None,
             mins_ago=200, case_offset=11),

        # Case 12: ILLEGAL PARKING
        dict(type="ILLEGAL_PARKING", source="CITIZEN", status="SUBMITTED",
             severity="MEDIUM", priority_score=66, confidence=Decimal("90.0"),
             j_idx=0, c_idx=0, lane=None, user=rahul_user,
             desc="Loading truck double-parked near Sector 21 cloth market.",
             blockage_dur=None, lane_occ=None, vcount=1, sig=None,
             mins_ago=15, case_offset=12),

        # Case 13: SIGNAL_VIOLATION
        dict(type="SIGNAL_VIOLATION", source="CCTV", status="UNDER_REVIEW",
             severity="HIGH", priority_score=80, confidence=Decimal("86.0"),
             j_idx=2, c_idx=1, lane=None, user=None,
             desc="Bikers jumped red light during phase change.",
             blockage_dur=None, lane_occ=None, vcount=5, sig="RED",
             mins_ago=140, case_offset=13),

        # Case 14: LANE_OBSTRUCTION
        dict(type="LANE_OBSTRUCTION", source="CITIZEN", status="RESOLVED",
             severity="MEDIUM", priority_score=60, confidence=Decimal("88.0"),
             j_idx=4, c_idx=2, lane=None, user=priya_user,
             desc="Construction material occupying lane.",
             blockage_dur=None, lane_occ=Decimal("55.0"), vcount=0, sig=None,
             mins_ago=60 * 20, case_offset=14),

        # Case 15: WRONG_SIDE
        dict(type="WRONG_SIDE", source="CITIZEN", status="SUBMITTED",
             severity="HIGH", priority_score=82, confidence=Decimal("84.0"),
             j_idx=0, c_idx=0, lane=None, user=citizen_user,
             desc="Autos taking wrong side to avoid signal wait.",
             blockage_dur=None, lane_occ=None, vcount=3, sig=None,
             mins_ago=5, case_offset=15),
    ]

    existing_count = db.query(models.Incident).count()
    if existing_count == 0:
        for i, d in enumerate(incident_defs):
            detected = datetime.utcnow() - timedelta(minutes=d["mins_ago"])
            case_num = f"RW-2026-{d['case_offset']:05d}"
            j = junctions[d["j_idx"]]
            c = corridors[d["c_idx"]]
            incident = models.Incident(
                case_number=case_num, type=d["type"], source=d["source"],
                status=d["status"], severity=d["severity"],
                priority_score=d["priority_score"], confidence=d["confidence"],
                junction_id=j.id, corridor_id=c.id,
                lane_id=((j.id * 4) + d["lane"]) if d["lane"] else None,
                reported_by_user_id=d["user"].id if d["user"] else None,
                description=d["desc"], detected_at=detected,
                blockage_duration=d["blockage_dur"],
                lane_occupancy=d["lane_occ"],
                vehicle_count=d["vcount"], signal_state=d["sig"],
            )
            db.add(incident)
            db.flush()

            # Create linked report if citizen
            if d["user"]:
                report = models.Report(
                    incident_id=incident.id, user_id=d["user"].id,
                    type=d["type"], status=d["status"],
                    location_text=j.name,
                    latitude=j.latitude, longitude=j.longitude,
                    description=d["desc"], submitted_at=detected,
                )
                db.add(report)

            # Fake evidence + AI analysis
            evidence = models.Evidence(
                incident_id=incident.id,
                report_id=None,
                file_type="image" if d["source"] == "CCTV" else "image",
                file_format="jpg",
                file_url=f"/static/evidence/demo_{i+1:03d}.jpg",
                file_size_bytes=random.randint(800_000, 2_400_000),
                width_px=1920, height_px=1080,
                uploaded_by_id=d["user"].id if d["user"] else None,
                uploaded_at=detected,
            )
            db.add(evidence)
            db.flush()

            v_types = ["car", "bike", "auto", "truck", "bus"]
            vehicles_detected = []
            for v in range(max(1, d["vcount"] or 0)):
                vt = random.choice(v_types)
                vehicles_detected.append({
                    "type": vt,
                    "bbox": [random.random() for _ in range(4)],
                    "confidence": round(random.uniform(0.82, 0.98), 2),
                    "track_id": f"TRK-{random.randint(1000,9999)}",
                })
                db.add(models.Vehicle(
                    incident_id=incident.id, ai_analysis_id=None,
                    vehicle_type=vt,
                    number_plate=f"GJ{random.choice(['01','05','06','18'])}{random.choice(['AB','CD','GH','JK','MH','XX'])}{random.randint(1000,9999):04d}",
                    color=random.choice(["White", "Silver", "Black", "Red", "Blue", "Grey"]),
                    direction=random.choice(["straight","left","right","wrong_side"]),
                    track_id=vehicles_detected[-1]["track_id"],
                    is_parked=(d["type"] == "ILLEGAL_PARKING"),
                    confidence=Decimal(str(vehicles_detected[-1]["confidence"] * 100)),
                ))

            quality = random.randint(72, 96)
            db.add(models.AIAnalysis(
                evidence_id=evidence.id, incident_id=incident.id,
                report_id=None, analysis_type="full",
                model_version="mock-yolov8-easyocr-demo",
                confidence=d["confidence"], is_mock=True,
                detected_vehicles=vehicles_detected,
                detected_lanes=[
                    {"id": 1, "type": "left_turn", "occupancy": float(d["lane_occ"]) if d["lane_occ"] else random.uniform(20, 90)}
                ],
                signal_state=d["sig"],
                number_plate=None,
                parking_detected=(d["type"] == "ILLEGAL_PARKING"),
                wrong_side_detected=(d["type"] == "WRONG_SIDE"),
                blockage_detected=(d["type"] == "LANE_BLOCKAGE"),
                evidence_quality_score=quality,
                evidence_quality_breakdown={
                    "clarity": quality + random.randint(-3, 3),
                    "visibility": quality + random.randint(-3, 3),
                    "context": quality + random.randint(-5, 2),
                    "timestamp": 100,
                    "location": 100 if d["user"] else 95,
                },
                selected_frames=[
                    {"index": 0, "label": "Approach view", "url": evidence.file_url},
                    {"index": 6, "label": "Violation context", "url": evidence.file_url},
                    {"index": 12, "label": "Vehicle close-up", "url": evidence.file_url},
                ],
            ))

    db.commit()

    # Interventions
    if db.query(models.Intervention).count() == 0:
        db.add_all([
            models.Intervention(
                corridor_id=corridors[0].id, junction_id=junctions[0].id,
                problem_type="LANE_BLOCKAGE",
                title="Peak-hour left-turn lane enforcement at Sector 21 Junction",
                description="96 recorded incidents of left-turn lane blockage during 6-9 PM peak.",
                evidence_count=96, peak_hours="6 PM – 9 PM",
                suggested_action="Deploy one traffic constable to left-turn lane approach during 6-9 PM on weekdays.",
                potential_impact="Expected 40-50% reduction in lane blockage incidents and improved lane utilization.",
                priority="HIGH", status="SUGGESTED",
                estimated_speed_before=12, estimated_speed_after=24,
            ),
            models.Intervention(
                corridor_id=corridors[0].id,
                problem_type="ILLEGAL_PARKING",
                title="Parking and loading zone management near Sector 21 shops",
                description="142 illegal parking reports concentrated near commercial frontage.",
                evidence_count=142, peak_hours="11 AM – 2 PM, 5 PM – 8 PM",
                suggested_action="Designate a 15-minute loading zone on the service lane and deploy tow-van patrol during peak.",
                potential_impact="Reduced on-carriageway parking and improved effective lane width.",
                priority="HIGH", status="UNDER_REVIEW",
                estimated_speed_before=14, estimated_speed_after=22,
            ),
            models.Intervention(
                corridor_id=corridors[2].id,
                problem_type="WRONG_SIDE",
                title="Wrong-side deterrence at Old Railway Road corridor",
                description="43 wrong-side incidents causing near-misses at railway crossing approach.",
                evidence_count=43, peak_hours="8 AM – 10 AM, 6 PM – 8 PM",
                suggested_action="Review physical dividers on corridor and place signages; targeted challan drive for 1 week.",
                potential_impact="Reduced accident risk and smoother opposing flow.",
                priority="MEDIUM", status="SUGGESTED",
                estimated_speed_before=16, estimated_speed_after=25,
            ),
        ])
        db.commit()

    # Analytics Snapshots (hourly for last 7 days)
    if db.query(models.AnalyticsSnapshot).count() == 0:
        for day in range(7):
            for hour in range(24):
                snap_time = datetime.utcnow() - timedelta(days=day, hours=(23 - hour))
                peak = (17 <= hour <= 20)
                base_speed = 30 - (12 if peak else 4) + random.uniform(-3, 3)
                lane_p = 41 + random.uniform(-10, 10) if peak else 20 + random.uniform(-5, 10)
                park_p = 34 + random.uniform(-8, 8) if peak else 22 + random.uniform(-5, 10)
                ws_p = 16 + random.uniform(-4, 4) if peak else 8 + random.uniform(-2, 5)
                other = 100 - lane_p - park_p - ws_p
                db.add(models.AnalyticsSnapshot(
                    corridor_id=random.choice(corridors).id,
                    junction_id=random.choice(junctions).id,
                    snapshot_at=snap_time,
                    avg_speed_kmh=Decimal(str(max(8, round(base_speed, 2)))),
                    congestion_level="HIGH" if peak else ("MEDIUM" if (hour in (8,9,12,13)) else "LOW"),
                    lane_blockage_pct=Decimal(str(lane_p)),
                    illegal_parking_pct=Decimal(str(park_p)),
                    wrong_side_pct=Decimal(str(ws_p)),
                    other_pct=Decimal(str(max(0, other))),
                    vehicle_count=random.randint(40, 320),
                    incident_count=random.randint(0, 5),
                ))
        db.commit()

    # Notifications
    if db.query(models.Notification).count() == 0:
        auth_user = db.query(models.User).filter_by(email="authority@roadwatch.in").first()
        c_user = db.query(models.User).filter_by(email="citizen@roadwatch.in").first()
        latest_incidents = db.query(models.Incident).order_by(models.Incident.id.desc()).limit(5).all()
        if auth_user and latest_incidents:
            db.add_all([
                models.Notification(user_id=auth_user.id,
                    title="High-priority lane blockage detected",
                    body="Left-turn lane at Sector 21 Junction has been blocked for 21+ seconds.",
                    type="LANE_BLOCKAGE", incident_id=latest_incidents[0].id, is_read=False),
                models.Notification(user_id=auth_user.id,
                    title="Multiple reports detected in Sector 21",
                    body="4 citizen reports clustered near Sector 21 Market corridor in the last hour.",
                    type="CLUSTER_ALERT", is_read=False),
                models.Notification(user_id=auth_user.id,
                    title="Recurring congestion pattern identified",
                    body="MG Road Metro Junction shows recurring lane blockage pattern during 6-8 PM.",
                    type="PATTERN", is_read=True),
                models.Notification(user_id=c_user.id,
                    title="Your report has been received",
                    body="Your report regarding Sector 21 has been received. AI analysis in progress.",
                    type="REPORT_SUBMITTED", report_id=None, is_read=False),
                models.Notification(user_id=c_user.id,
                    title="AI analysis has completed",
                    body="Our AI has reviewed your evidence. Your report is now under authority review.",
                    type="AI_DONE", is_read=True),
            ])
        db.commit()

    print("Demo data seeded successfully.")
    print(f"   - Users: {db.query(models.User).count()}")
    print(f"   - Corridors: {db.query(models.Corridor).count()}")
    print(f"   - Junctions: {db.query(models.Junction).count()}")
    print(f"   - Incidents: {db.query(models.Incident).count()}")
    print(f"   - Reports: {db.query(models.Report).count()}")
    print(f"   - AI Analyses: {db.query(models.AIAnalysis).count()}")
    print(f"   - Interventions: {db.query(models.Intervention).count()}")
    print(f"   - Analytics Snapshots: {db.query(models.AnalyticsSnapshot).count()}")
