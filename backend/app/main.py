from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .database import init_db_schema, SessionLocal
from .seed_data import seed_demo_data
from .routers import auth, dashboard, incidents, reports, ai, analytics, operations, detection


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting RoadWatch Backend API...")
    print(f"   DEMO_MODE = {settings.DEMO_MODE}")
    print(f"   USE_MOCK_AI = {settings.USE_MOCK_AI}")
    print("   Initializing database schema...")
    init_db_schema()
    db = SessionLocal()
    try:
        from . import models as _  # noqa
        seed_demo_data(db)
    finally:
        db.close()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print("RoadWatch API is ready.")
    yield
    print("Shutting down RoadWatch API...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RoadWatch — AI-powered smart traffic and illegal-parking management platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
except Exception:
    pass


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
        "message": "RoadWatch backend — AI-assisted decision support. Final enforcement decisions remain with authorized traffic authorities.",
    }


@app.get("/api/health", tags=["Root"])
def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE, "mock_ai": settings.USE_MOCK_AI}


# Register routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(incidents.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(operations.router)
app.include_router(detection.router)
