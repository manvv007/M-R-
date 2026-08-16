"""
Vehicle Detector — modular wrapper around YOLO-compatible detector.

In MVP this runs in MOCK mode and returns synthetic detections.
Replace `detect()` with real ultralytics YOLO inference when model available.
"""
from __future__ import annotations
import random
from typing import List, Dict, Any, Optional


VEHICLE_CLASSES = {
    "car": {"weight": 0.45, "avg_dim": (0.12, 0.08)},
    "bike": {"weight": 0.22, "avg_dim": (0.05, 0.07)},
    "auto": {"weight": 0.10, "avg_dim": (0.08, 0.08)},
    "truck": {"weight": 0.08, "avg_dim": (0.22, 0.15)},
    "bus": {"weight": 0.06, "avg_dim": (0.26, 0.12)},
    "van": {"weight": 0.09, "avg_dim": (0.15, 0.10)},
}


class VehicleDetector:
    def __init__(self, model_path: Optional[str] = None, use_mock: bool = True):
        self.model_path = model_path
        self.use_mock = use_mock
        self._model = None  # real YOLO placeholder
        self._rng = random.Random()

    def _ensure_model(self):
        if self._model or self.use_mock:
            return
        # Lazy-load YOLO only if USE_MOCK_AI=False and ultralytics installed
        try:
            from ultralytics import YOLO  # type: ignore
            if self.model_path:
                self._model = YOLO(self.model_path)
        except Exception:
            self.use_mock = True

    def detect(self, image=None, frame_idx: int = 0, seed: int = 42,
               expected_count: Optional[int] = None) -> List[Dict[str, Any]]:
        self._ensure_model()
        self._rng.seed(seed + frame_idx)

        if self.use_mock or self._model is None:
            n = expected_count if expected_count is not None else self._rng.randint(3, 9)
            items: List[Dict[str, Any]] = []
            classes = list(VEHICLE_CLASSES.keys())
            weights = [VEHICLE_CLASSES[c]["weight"] for c in classes]
            for i in range(n):
                cls = self._rng.choices(classes, weights=weights, k=1)[0]
                w, h = VEHICLE_CLASSES[cls]["avg_dim"]
                w += self._rng.uniform(-0.02, 0.02)
                h += self._rng.uniform(-0.02, 0.02)
                x = self._rng.uniform(0.02, 0.98 - w)
                y = self._rng.uniform(0.25, 0.92 - h)
                items.append({
                    "class": cls,
                    "bbox": [round(x, 4), round(y, 4), round(x + w, 4), round(y + h, 4)],
                    "confidence": round(self._rng.uniform(0.80, 0.98), 3),
                    "track_id": f"TRK-{self._rng.randint(1000, 9999)}",
                })
            return items

        # Real inference path (placeholder)
        # results = self._model.predict(image, verbose=False, conf=0.4)
        return []
