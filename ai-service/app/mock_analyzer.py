"""
High-level analyzer combining vehicle detector, lane detector, OCR, violation logic
and evidence-quality scoring.

Core signal-aware lane blockage logic:
IF signal for lane is GREEN
   AND vehicle occupies lane
   AND vehicle movement is inconsistent with lane's allowed movement
   AND lane occupancy > threshold
   AND blockage persists beyond duration threshold
THEN generate lane blockage incident.
"""
from __future__ import annotations
import random
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional

from .vehicle_detector import VehicleDetector
from .lane_detector import LaneDetector
from .ocr_service import OCRService


@dataclass
class EvidenceQuality:
    overall: int
    breakdown: Dict[str, int]
    label: str  # Excellent | Good | Poor | Insufficient


class MockAnalyzer:
    def __init__(self, use_mock: bool = True):
        self.vehicle_detector = VehicleDetector(use_mock=use_mock)
        self.lane_detector = LaneDetector(use_mock=use_mock)
        self.ocr = OCRService(use_mock=use_mock)
        self.use_mock = use_mock

    # ------------------------------------------------------------------ utils
    @staticmethod
    def _quality(seed: int, clear: bool = True, plates: bool = False) -> EvidenceQuality:
        rng = random.Random(seed)
        base = rng.randint(72, 96) if clear else rng.randint(30, 60)
        b = {
            "image_clarity": base + rng.randint(-3, 3),
            "vehicle_visible": 100 if clear else rng.randint(30, 70),
            "location_available": rng.choice([100, 100, 95, 100]),
            "timestamp_available": 100,
            "context_sufficient": base + rng.randint(-6, 2),
            "number_plate_readable": (
                100 if plates else rng.choice([0, 0, 20, 55, 80])
            ),
        }
        overall = int(sum(b.values()) / len(b))
        label = ("Excellent" if overall >= 90 else
                 "Good" if overall >= 75 else
                 "Poor" if overall >= 50 else "Insufficient")
        return EvidenceQuality(overall=overall, breakdown=b, label=label)

    # ------------------------------------------------------------- evidence
    def analyze_evidence(self,
                         file_type: str = "image",
                         incident_hint: Optional[str] = None,
                         seed: int = 42,
                         has_gps: bool = True) -> Dict[str, Any]:
        rng = random.Random(seed)

        vehicles = self.vehicle_detector.detect(seed=seed, frame_idx=0)
        primary_vehicle = vehicles[0] if vehicles else None

        plate_result = None
        if primary_vehicle and rng.random() < 0.7:
            plate_result = self.ocr.read_plate(seed=seed * 7 + 11)

        quality = self._quality(
            seed=seed,
            clear=(incident_hint != "SIGNAL_VIOLATION" or rng.random() < 0.8),
            plates=(plate_result is not None),
        )

        # Violation analysis
        parking_detected = (
            incident_hint == "ILLEGAL_PARKING" or
            rng.random() < 0.25
        )
        wrong_side_detected = (
            incident_hint == "WRONG_SIDE" or
            any(v["class"] in ("bike", "auto") for v in vehicles) and rng.random() < 0.25
        )
        blockage_detected = (
            incident_hint == "LANE_BLOCKAGE" or
            (len(vehicles) >= 5 and rng.random() < 0.4)
        )

        # Confidence combination
        base_conf = rng.uniform(0.78, 0.96)
        if quality.overall < 60:
            base_conf *= 0.7
        if incident_hint in ("LANE_BLOCKAGE", "ILLEGAL_PARKING", "WRONG_SIDE"):
            base_conf = min(0.99, base_conf + 0.05)

        return {
            "model_version": "mock-yolov8n-easyocr-india-demo-v1.0",
            "is_mock": self.use_mock,
            "confidence": round(base_conf * 100, 2),
            "detected_vehicles": vehicles,
            "detected_lanes": self.lane_detector.detect(seed=seed),
            "signal_state": rng.choice(["RED", "GREEN", "GREEN", "RED"]),
            "number_plate": plate_result["plate"] if plate_result else None,
            "number_plate_confidence": (
                round(plate_result["confidence"] * 100, 2) if plate_result else None
            ),
            "parking_detected": parking_detected,
            "wrong_side_detected": wrong_side_detected,
            "blockage_detected": blockage_detected,
            "evidence_quality_score": quality.overall,
            "evidence_quality_label": quality.label,
            "evidence_quality_breakdown": quality.breakdown,
            "selected_frames": [
                {"index": 0, "label": "Vehicle approach view",
                 "note": "AI-selected context frame"},
                {"index": 8, "label": "Road / signal context",
                 "note": "Shows lane / signal relation"},
                {"index": 15, "label": "Violation captured",
                 "note": "Peak of detected event"},
                {"index": 22, "label": "Number plate close-up",
                 "note": "If plate legible" if plate_result else "Not clearly readable"},
            ],
            "vehicle_summary": {
                "count": len(vehicles),
                "by_class": {
                    cls: sum(1 for v in vehicles if v["class"] == cls)
                    for cls in {v["class"] for v in vehicles}
                },
                "primary_class": primary_vehicle["class"] if primary_vehicle else None,
            },
            "disclaimer": (
                "DEMO AI ANALYSIS — Mock inference used for prototype. "
                "Replace with real YOLO/OCR service in production deployment."
            ),
        }

    # ----------------------------------------------------- junction frame
    def analyze_junction_frame(self,
                               junction_id: int,
                               tick: int,
                               occupancy_threshold: float = 60.0,
                               blockage_duration_threshold: int = 10,
                               seed: int = 0) -> Dict[str, Any]:
        """
        Simulated signal cycle: 0..29 RED, 30..59 GREEN.
        During GREEN, lane 1 (left-turn) is occupied by vehicles going STRAIGHT.
        After blockage_duration_threshold, emit LANE_BLOCKAGE flag.
        """
        t = tick % 60
        signal_state = "RED" if t < 30 else "GREEN"
        time_in_state = t if t < 30 else (t - 30)

        vehicles = self.vehicle_detector.detect(
            seed=junction_id * 131 + tick, expected_count=min(22, 6 + t))
        lanes = self.lane_detector.detect(
            seed=junction_id * 17, signal_state=signal_state, tick=t)

        # Map vehicles to lanes + direction analysis
        for i, v in enumerate(vehicles):
            # Simulate lane assignment
            if signal_state == "GREEN" and i < int(len(vehicles) * 0.4):
                v["lane_id"] = 1
                # Block left-turn with straight-going vehicles
                v["direction"] = "straight"
                v["intended_lane_movement"] = "left"
                v["movement_conflict"] = True
            else:
                v["lane_id"] = 2 + (i % 3)
                v["direction"] = {2: "straight", 3: "straight", 4: "right"}[v["lane_id"]]
                v["movement_conflict"] = False

        left_lane = next((l for l in lanes if l["id"] == 1), None)
        blockage = False
        blockage_duration = 0
        severity = "LOW"
        warning = None
        if left_lane and signal_state == "GREEN":
            occupancy = left_lane["occupancy"]
            conflicting = sum(1 for v in vehicles if v.get("lane_id") == 1 and v.get("movement_conflict"))
            if occupancy > occupancy_threshold and conflicting >= 3:
                # Duration depends on time into GREEN phase, minus ramp-up
                blockage_duration = max(0, time_in_state - 5)
                if blockage_duration >= blockage_duration_threshold:
                    blockage = True
                    if blockage_duration >= 20:
                        severity = "HIGH"
                        warning = "LEFT-TURN LANE BLOCKED"
                    else:
                        severity = "MEDIUM"
                        warning = "LEFT-TURN LANE AT RISK"
                elif blockage_duration >= 5:
                    warning = "LEFT-TURN LANE BUILD-UP"

        return {
            "junction_id": junction_id,
            "tick": t,
            "signal_state": signal_state,
            "time_in_state": time_in_state,
            "blockage_detected": blockage,
            "blockage_duration": blockage_duration,
            "blockage_lane": 1,
            "severity": severity,
            "warning": warning,
            "occupancy_threshold": occupancy_threshold,
            "duration_threshold_sec": blockage_duration_threshold,
            "total_vehicles": len(vehicles),
            "lanes": lanes,
            "vehicles": vehicles,
            "is_mock": True,
            "demo_mode": True,
            "logic_trace": (
                f"Signal={signal_state}, LeftLaneOcc={left_lane['occupancy'] if left_lane else 'n/a'}%, "
                f"BlockageDur={blockage_duration}s, Threshold={blockage_duration_threshold}s, "
                f"Flag={blockage}"
            ),
        }
