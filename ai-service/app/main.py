from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from .config import settings
from .mock_analyzer import MockAnalyzer

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RoadWatch AI service — vehicle/lane/signal analysis pipeline (mock mode in MVP)",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = MockAnalyzer(use_mock=settings.USE_MOCK_AI)


class AnalyzeEvidenceRequest(BaseModel):
    file_type: str = "image"
    incident_hint: Optional[str] = None  # e.g. ILLEGAL_PARKING
    seed: int = 42
    has_gps: bool = True


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "use_mock_ai": settings.USE_MOCK_AI,
        "ocr_engine": settings.OCR_ENGINE,
        "note": (
            "AI service running in MOCK MODE for demo. "
            "Set USE_MOCK_AI=false and install ultralytics/easyocr to enable real inference."
        ),
    }


@app.get("/health")
def health():
    return {"status": "ok", "mock": settings.USE_MOCK_AI}


@app.post("/analyze/evidence")
def analyze_evidence(req: AnalyzeEvidenceRequest):
    return analyzer.analyze_evidence(
        file_type=req.file_type,
        incident_hint=req.incident_hint,
        seed=req.seed,
        has_gps=req.has_gps,
    )


@app.get("/analyze/junction/{junction_id}")
def analyze_junction(
    junction_id: int,
    tick: int = Query(0, ge=0, le=10_000),
    occupancy_threshold: float = 60.0,
    blockage_duration_threshold: int = 10,
    seed: int = 0,
):
    return analyzer.analyze_junction_frame(
        junction_id=junction_id,
        tick=tick,
        occupancy_threshold=occupancy_threshold,
        blockage_duration_threshold=blockage_duration_threshold,
        seed=seed,
    )


@app.get("/pipeline/description")
def pipeline_description():
    return {
        "junction_cctv": [
            "Frame Extraction",
            "Vehicle Detection",
            "Object Tracking",
            "Lane Detection / Lane Mapping",
            "Signal State Detection",
            "Vehicle Direction Analysis",
            "Violation Logic (signal-aware)",
            "Evidence Extraction",
            "Incident Creation",
            "Dashboard Delivery",
        ],
        "citizen_report": [
            "Image/Video",
            "Vehicle Detection",
            "Parking / Direction Analysis",
            "ANPR/OCR",
            "Evidence Quality Check",
            "Location + Timestamp",
            "Duplicate Check",
            "Structured Report",
        ],
        "lane_blockage_logic": {
            "IF": [
                "signal for lane is GREEN",
                "vehicle occupies the lane",
                "vehicle movement is inconsistent with intended movement",
                "occupancy exceeds configured threshold",
                "blockage persists beyond configured duration",
            ],
            "THEN": "Generate LANE_BLOCKAGE incident with severity based on duration.",
        },
    }
