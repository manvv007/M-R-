# RoadWatch — AI-Powered Smart Traffic Management

> See the problem. Understand the cause. Improve the road.

**Smart India Hackathon 2026 — Student Innovation / MISC / Software**

---

## 1. Project Overview

RoadWatch is an AI-powered smart traffic and illegal-parking management platform designed for congested urban market and commercial road corridors in Indian cities.

The system combines:
- Existing traffic/signal CCTV analysis where available
- AI-based vehicle, lane and direction detection
- Signal-aware lane-blockage detection
- Citizen reporting for areas without government CCTV
- AI-assisted illegal-parking and wrong-side detection
- Congestion-cause analysis
- Violation/hotspot heatmaps
- A unified traffic-authority dashboard
- Actionable recommendations for traffic authorities

**The goal is NOT simply to detect violations.** The main goal is to answer:
> *"Why is this road congested, where is the problem occurring, and what intervention should authorities consider?"*

⚠️ **IMPORTANT**: The system does NOT automatically issue challans or make final legal decisions. AI only assists authorized traffic authorities. Final verification and enforcement decisions remain with authorized officials.

---

## 2. Problem Statement

Urban market and commercial road corridors often have roads designed for multiple lanes, but their effective capacity is severely reduced because of:
- Illegal roadside parking
- Roadside encroachment
- Wrong-side driving
- Poor lane discipline
- Vehicles blocking dedicated turning lanes
- Congestion near signalized intersections

A 4-lane road can effectively operate like a 1–2 lane road when vehicles occupy large portions of the carriageway. This causes low average speed, increased travel time, higher accident risk, driver frustration, and increased burden on traffic police.

---

## 3. USP — Unique Selling Proposition

**Existing junction CCTV + decentralized citizen/corridor reporting + AI-based congestion-cause analysis**

Unlike basic violation-detection systems, RoadWatch:
1. Works with existing CCTV infrastructure (no new hardware required initially)
2. Fills coverage gaps with citizen reporting
3. Doesn't just count violations — identifies *why* congestion happens
4. Provides evidence-based intervention recommendations
5. Respects privacy — no automatic challans, authority review required

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          RoadWatch System                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │   Frontend   │────▶│   Backend    │────▶│   PostgreSQL DB  │    │
│  │  React + TS  │◀────│  FastAPI     │◀────│                  │    │
│  └──────┬───────┘     └──────┬───────┘     └──────────────────┘    │
│         │                    │                                      │
│         │                    ▼                                      │
│         │             ┌──────────────┐                              │
│         │             │  AI Service  │                              │
│         │             │  OpenCV +    │    ┌──────────────────┐     │
│         │             │  YOLO + OCR  │───▶│  Leaflet + OSM   │     │
│         │             └──────────────┘    └──────────────────┘     │
│         │                                                           │
│         └─────────────── Maps / Charts / Recharts ◀────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Two-Tier Architecture

**Tier 1 — Junction Monitoring** (Existing CCTV):
Analyzes traffic signal CCTV feeds for:
- Vehicle detection & tracking
- Lane detection & occupancy
- Signal state detection
- Signal-aware lane blockage detection
- Wrong-side movement detection

**Tier 2 — Mid-Corridor Monitoring** (Citizen Reporting):
Citizen-submitted photo/video evidence with AI analysis:
- Vehicle detection & classification
- Parking/obstruction analysis
- ANPR/OCR number plate extraction
- Evidence quality scoring
- Duplicate report detection

---

## 5. AI Pipeline

### Junction CCTV Pipeline
```
VIDEO → Frame Extraction → Vehicle Detection → Object Tracking
    → Lane Detection/Mapping → Signal State Detection
    → Vehicle Direction Analysis → Violation Logic
    → Evidence Extraction → Incident Creation → Dashboard
```

### Citizen Report Pipeline
```
IMAGE/VIDEO → Vehicle Detection → Parking/Direction Analysis
    → ANPR/OCR → Evidence Quality Check → Location + Timestamp
    → Duplicate Check → Structured Report → Authority Dashboard
```

---

## 6. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS |
| **Backend** | Python 3.11 + FastAPI |
| **AI Service** | Python + OpenCV + YOLO-compatible architecture |
| **OCR/ANPR** | EasyOCR / PaddleOCR-ready (mock for demo) |
| **Database** | PostgreSQL |
| **Maps** | Leaflet + OpenStreetMap |
| **Charts** | Recharts |
| **Authentication** | JWT + bcrypt password hashing |
| **Deployment** | Docker-ready architecture |

---

## 7. Features

### Core MVP Features
1. ✅ **Junction Lane-Blockage Detection** — Signal-aware left-turn lane blockage
2. ✅ **Authority Dashboard** — RoadWatch Control Center with 10 modules
3. ✅ **Congestion-Cause Analysis** — "Why Is This Road Congested?" breakdown
4. ✅ **Citizen Reporting** — Mobile-friendly report submission
5. ✅ **AI Evidence Analysis** — Vehicle, plate, quality scoring
6. ✅ **Hotspot Map** — Leaflet-based heatmap with filters
7. ✅ **Corridor Analytics** — Corridor health page with metrics
8. ✅ **Incident Management** — Case review, verify/reject/resolve workflow
9. ✅ **Before/After Simulation** — Intervention impact visualization
10. ✅ **Priority Scoring & Audit Logs** — Triage support + accountability

### User Roles

**Citizen:**
- Register/Login, Report road issues, Upload evidence, Track reports, View AI analysis, Receive notifications

**Traffic Authority:**
- Secure login, Dashboard overview, Live monitoring, Incident review, Hotspot analysis, Corridor analytics, Intervention recommendations, Audit logs, Settings

---

## 8. Database Schema (PostgreSQL)

Core tables:
- `users`, `roles` — Authentication & authorization
- `corridors`, `junctions`, `lanes`, `signals` — Road infrastructure
- `incidents`, `reports` — Case management
- `evidence`, `ai_analysis`, `vehicles`, `locations` — Evidence & analysis
- `duplicate_groups` — Report deduplication
- `interventions`, `notifications`, `audit_logs` — Operations
- `analytics_snapshots` — Time-series analytics

---

## 9. API Documentation (FastAPI)

### Authentication
```
POST /api/auth/register   — Citizen registration
POST /api/auth/login      — Login (citizen / authority)
```

### Dashboard & Stats
```
GET  /api/dashboard/stats       — Authority dashboard KPIs
GET  /api/dashboard/activities  — Recent activity feed
```

### Incidents
```
GET    /api/incidents              — List incidents (filtered)
GET    /api/incidents/{id}         — Incident detail + evidence
POST   /api/incidents              — Create incident (AI-detected)
POST   /api/incidents/{id}/verify  — Authority: VERIFY
POST   /api/incidents/{id}/reject  — Authority: REJECT
POST   /api/incidents/{id}/request-info  — Request more info
POST   /api/incidents/{id}/resolve — Authority: MARK RESOLVED
```

### Reports (Citizen)
```
POST   /api/reports         — Submit citizen report
GET    /api/reports         — List own reports (citizen)
GET    /api/reports/{id}    — Report detail
```

### Evidence & AI
```
POST   /api/evidence/upload   — Upload image/video evidence
POST   /api/ai/analyze        — Trigger AI analysis (evidence)
GET    /api/ai/analysis/{id}  — Get AI analysis results
```

### Analytics & Mapping
```
GET  /api/analytics              — Aggregate charts data
GET  /api/hotspots               — Hotspot locations + heatmap data
GET  /api/corridors              — Corridor health list
GET  /api/corridors/{id}         — Single corridor health
GET  /api/interventions          — Recommended interventions
GET  /api/audit-logs             — Audit trail
GET  /api/notifications          — User notifications
```

Full Swagger docs available at: `/docs` when backend is running.

---

## 10. Installation & Setup

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.11+ (backend + AI service)
- PostgreSQL 14+
- Optional: Docker & Docker Compose

### Environment Setup

```bash
# 1. Clone / copy project
cd roadwatch

# 2. Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt

# Initialize database (creates tables + demo data)
python -m app.init_db

# Run backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### AI Service Setup

```bash
cd ai-service
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run AI service (mock mode by default)
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 11. Demo Credentials

Use these accounts for hackathon demo:

| Role       | Email                     | Password         |
|------------|---------------------------|------------------|
| Authority  | `authority@roadwatch.in`  | `Authority@123`  |
| Citizen    | `citizen@roadwatch.in`    | `Citizen@123`    |

---

## 12. Hackathon Demo Flow (18 Steps)

Follow this script for live presentation:

1. **Landing Page** — "RoadWatch doesn't simply count violations. It identifies the causes behind recurring congestion."
2. Open **Authority Dashboard** → Show Sector 21 Market Junction
3. Open **Live Monitoring** → Start demo traffic video
4. Signal changes to **GREEN** → vehicles occupy left-turn lane
5. **AI detects**: vehicle count, lane occupancy, direction, signal state
6. System displays: **LEFT-TURN LANE BLOCKAGE DETECTED** (Duration: 21 sec)
7. **Incident automatically created**
8. Open **Why Is This Road Congested?** → Show breakdown (Lane 41% / Parking 34% / Wrong-side 16% / Other 9%)
9. Show **Primary Cause**: Left-turn lane blockage
10. Open **Citizen Reporting** → Upload demo illegal-parking image
11. **AI analysis**: Vehicle detected, Parking suspected, Number plate, Quality, Location, Timestamp
12. **Submit report**
13. Back to Authority Dashboard → **New report appears**
14. Open **Hotspot Map** → Show multiple reports around market corridor
15. Open **Corridor Health** → Low speed, Recurring illegal parking, Frequent lane blockage
16. Open **Recommended Intervention** → "Targeted enforcement during peak hours"
17. Show **Before/After Simulation** → 12 km/h → 24 km/h (SIMULATED/ESTIMATED)
18. **Close with:** "RoadWatch doesn't just tell authorities where violations happen. It helps them understand why congestion happens and where intervention can have the greatest impact."

---

## 13. Limitations (Hackathon MVP)

- 🟡 **AI Service uses mock inference** for demo — YOLO/EasyOCR integration ready but not loaded by default
- 🟡 **Demo data is synthetic** — 5 junctions, 3 corridors, 20+ pre-seeded incidents
- 🟡 **No live CCTV integration** — junction monitoring uses simulated video/animation
- 🟡 **ANPR/OCR** produces synthetic number plates (GJ XX 0000 format) for demo
- 🟡 **File uploads stored locally** — not object storage (S3-ready architecture)

---

## 14. Privacy & Security

- JWT authentication with bcrypt password hashing
- Role-based access control (Citizen vs Authority)
- Private vehicle owner data is NEVER exposed publicly
- Synthetic number plates in demo
- File type + size validation on uploads
- Rate limiting + input validation on all APIs
- Comprehensive audit logging for all authority actions
- Environment variables for all secrets (never committed)

---

## 15. Future Roadmap

### Phase 1 — Hackathon MVP ✅
Junction lane blockage detection · Vehicle detection · Signal-aware analysis · Citizen reporting · AI evidence analysis · Authority dashboard · Hotspot map · Congestion-cause analysis

### Phase 2 — Post-Hackathon
- Real traffic-camera RTSP integration
- Fleet/dashcam crowd-sourced video
- Production ANPR (PaddleOCR with Indian plates)
- Additional violation classes (red-light jump, helmet-less riding, etc.)
- Multi-junction corridor analytics
- SMS/WhatsApp citizen notifications via India Post/Gateway

### Phase 3 — City Scale
- Low-cost supplementary solar-powered edge camera units
- Multi-junction signal timing optimization
- Predictive congestion forecasting
- City-wide deployment dashboard
- Integration with state traffic-police systems

---

## 16. Project Structure

```
roadwatch/
├── frontend/          # React + TS + Tailwind (Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── contexts/
│       ├── services/
│       ├── hooks/
│       └── utils/
├── backend/           # FastAPI REST API
│   └── app/
│       ├── routers/
│       ├── models.py
│       ├── schemas.py
│       ├── database.py
│       ├── auth.py
│       └── seed_data.py
├── ai-service/        # YOLO + OCR ready (mock mode)
│   └── app/
│       ├── mock_analyzer.py
│       ├── lane_detector.py
│       ├── vehicle_detector.py
│       └── ocr_service.py
├── database/          # SQL scripts / migrations
├── docs/              # Architecture diagrams & docs
└── README.md
```

---

Built with ❤️ for Smart India Hackathon 2026.
