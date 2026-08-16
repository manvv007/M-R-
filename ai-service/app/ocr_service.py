"""
OCR / ANPR Service — modular wrapper around EasyOCR / PaddleOCR / Tesseract.

Mock mode returns synthetic Indian vehicle plates.
State codes: https://en.wikipedia.org/wiki/List_of_Regional_Transport_Office_code_numbers_in_India
"""
from __future__ import annotations
import random
from typing import Optional, Dict, Any


INDIAN_STATE_CODES = ["GJ", "DL", "HR", "UP", "MH", "KA", "TN", "KL", "AP", "TS",
                      "WB", "RJ", "PB", "BR", "MP", "CG", "OR", "JH", "AS", "JK"]
DISTRICTS = ["01", "04", "05", "06", "09", "12", "13", "18", "21", "47", "78", "99"]
SERIES = ["AB", "BC", "CD", "DF", "GH", "HJ", "JK", "KL", "MH", "PK", "RX", "XX", "YZ"]


class OCRService:
    def __init__(self, engine: str = "easyocr", use_mock: bool = True):
        self.engine = engine
        self.use_mock = use_mock
        self._reader = None

    def _ensure_reader(self):
        if self._reader is not None or self.use_mock:
            return
        try:
            import easyocr  # type: ignore
            self._reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception:
            self.use_mock = True

    def read_plate(self, crop=None, seed: int = 42,
                   confidence: float = 0.85) -> Optional[Dict[str, Any]]:
        self._ensure_reader()
        rng = random.Random(seed)
        if not self.use_mock and self._reader is not None and crop is not None:
            try:
                result = self._reader.readtext(crop, detail=1)
                if result:
                    text = "".join([r[1] for r in result]).replace(" ", "").upper()
                    text = "".join(ch for ch in text if ch.isalnum())
                    if 6 <= len(text) <= 12:
                        return {
                            "plate": text,
                            "confidence": min(0.99, sum(r[2] for r in result) / max(len(result), 1)),
                            "is_mock": False,
                        }
            except Exception:
                pass

        if rng.random() <= confidence:
            state = rng.choice(INDIAN_STATE_CODES)
            dist = rng.choice(DISTRICTS)
            ser = rng.choice(SERIES)
            num = f"{rng.randint(1, 9999):04d}"
            plate = f"{state}{dist}{ser}{num}"
            return {
                "plate": plate,
                "confidence": round(rng.uniform(0.72, 0.96), 3),
                "is_mock": True,
            }
        return None
