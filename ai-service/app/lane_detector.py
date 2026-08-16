"""
Lane Detector — maps image-space lanes to polygon occupancy.

Mock mode returns a standard 4-lane Sector-21 style layout with simulated occupancy.
Real integration: Hough/hybrid-lane lines + segmentation-based mask, projected to ground plane.
"""
from __future__ import annotations
import random
from typing import List, Dict, Any


DEFAULT_LANES = [
    {"id": 1, "lane_number": 1, "type": "left_turn",  "allowed": "left",
     "polygon": [[0.00, 0.18], [0.25, 0.18], [0.28, 1.00], [0.00, 1.00]]},
    {"id": 2, "lane_number": 2, "type": "straight",   "allowed": "straight",
     "polygon": [[0.25, 0.18], [0.50, 0.18], [0.52, 1.00], [0.28, 1.00]]},
    {"id": 3, "lane_number": 3, "type": "straight",   "allowed": "straight",
     "polygon": [[0.50, 0.18], [0.75, 0.18], [0.76, 1.00], [0.52, 1.00]]},
    {"id": 4, "lane_number": 4, "type": "right_turn", "allowed": "right",
     "polygon": [[0.75, 0.18], [1.00, 0.18], [1.00, 1.00], [0.76, 1.00]]},
]


class LaneDetector:
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    def detect(self, image=None, seed: int = 42, signal_state: str = "RED",
               tick: int = 0) -> List[Dict[str, Any]]:
        rng = random.Random(seed + tick)
        lanes = []
        for lane in DEFAULT_LANES:
            # Simulate occupancy based on lane type + signal
            if lane["type"] == "left_turn":
                base = 40 if signal_state == "RED" else 72
                base += min(tick * 1.8, 22) if signal_state == "GREEN" else 0
            elif lane["type"] == "right_turn":
                base = 18 if signal_state == "RED" else 32
            else:
                base = 35 if signal_state == "RED" else 58
            occ = min(max(base + rng.uniform(-6, 6), 5.0), 98.0)
            lanes.append({
                **lane,
                "occupancy": round(occ, 1),
                "vehicles": max(1, int(occ / 14)),
            })
        return lanes

    @staticmethod
    def vehicle_in_lane(bbox, lane_polygon) -> bool:
        """Simple center-point-in-polygon test (mock-implementation for MVP)."""
        if not lane_polygon or len(lane_polygon) < 3:
            return False
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        xs = [p[0] for p in lane_polygon]
        ys = [p[1] for p in lane_polygon]
        return (min(xs) <= cx <= max(xs)) and (min(ys) <= cy <= max(ys))
