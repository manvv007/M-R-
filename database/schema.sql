-- ============================================================
-- RoadWatch — PostgreSQL Database Schema
-- Smart India Hackathon 2026
-- ============================================================

-- Clean up (for fresh init)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS duplicate_groups CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS ai_analysis CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS signals CASCADE;
DROP TABLE IF EXISTS lanes CASCADE;
DROP TABLE IF EXISTS junctions CASCADE;
DROP TABLE IF EXISTS corridors CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- ROLES & USERS
-- ============================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(32) UNIQUE NOT NULL,   -- 'citizen' | 'authority' | 'admin'
    description     VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role_id);

-- ============================================================
-- ROAD INFRASTRUCTURE
-- ============================================================

CREATE TABLE corridors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,          -- e.g. "Sector 21 Market Road"
    description     TEXT,
    length_km       DECIMAL(6,2),
    num_lanes       INT DEFAULT 2,
    expected_speed  INT DEFAULT 30,                 -- km/h
    latitude        DECIMAL(10,7),                  -- corridor centroid
    longitude       DECIMAL(10,7),
    city            VARCHAR(120),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE junctions (
    id              SERIAL PRIMARY KEY,
    corridor_id     INT REFERENCES corridors(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,          -- e.g. "Sector 21 Market Junction"
    code            VARCHAR(32) UNIQUE,
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    has_cctv        BOOLEAN DEFAULT FALSE,
    num_signals     INT DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_junctions_corridor ON junctions(corridor_id);
CREATE INDEX idx_junctions_location ON junctions(latitude, longitude);

CREATE TABLE lanes (
    id              SERIAL PRIMARY KEY,
    junction_id     INT NOT NULL REFERENCES junctions(id) ON DELETE CASCADE,
    lane_number     INT NOT NULL,
    lane_type       VARCHAR(32) NOT NULL,           -- 'left_turn' | 'straight' | 'right_turn' | 'mixed'
    allowed_movement VARCHAR(64) NOT NULL,          -- 'left' | 'straight' | 'right' | 'straight,right' etc.
    polygon_coords  JSONB,                          -- [[x1,y1],[x2,y2]...] relative to camera frame
    occupancy_threshold DECIMAL(5,2) DEFAULT 60.0,  -- %
    blockage_duration_threshold INT DEFAULT 10,     -- seconds
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lanes_junction ON lanes(junction_id);

CREATE TABLE signals (
    id              SERIAL PRIMARY KEY,
    junction_id     INT NOT NULL REFERENCES junctions(id) ON DELETE CASCADE,
    lane_id         INT REFERENCES lanes(id) ON DELETE SET NULL,
    signal_group    VARCHAR(64),                    -- e.g. "Phase A - North"
    current_state   VARCHAR(16) DEFAULT 'RED',      -- 'RED' | 'YELLOW' | 'GREEN'
    last_changed_at TIMESTAMPTZ,
    cycle_duration  INT,                            -- seconds
    green_duration  INT,                            -- seconds
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCIDENTS (AI / CCTV detected) & REPORTS (citizen submitted)
-- ============================================================

CREATE TYPE incident_source AS ENUM ('CCTV', 'CITIZEN', 'ANALYST');
CREATE TYPE incident_type   AS ENUM ('LANE_BLOCKAGE', 'ILLEGAL_PARKING', 'WRONG_SIDE',
                                     'LANE_OBSTRUCTION', 'DANGEROUS_DRIVING',
                                     'SIGNAL_VIOLATION', 'OTHER');
CREATE TYPE severity_level  AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE incident_status AS ENUM ('SUBMITTED', 'AI_PROCESSING', 'UNDER_REVIEW',
                                     'VERIFIED', 'REJECTED', 'MORE_INFO_REQUIRED',
                                     'RESOLVED', 'CLOSED');

CREATE TABLE incidents (
    id                  SERIAL PRIMARY KEY,
    case_number         VARCHAR(32) UNIQUE NOT NULL,    -- e.g. RW-2026-00124
    type                incident_type NOT NULL,
    source              incident_source NOT NULL,
    status              incident_status NOT NULL DEFAULT 'SUBMITTED',
    severity            severity_level NOT NULL DEFAULT 'MEDIUM',
    priority_score      INT DEFAULT 50,                 -- 0-100
    confidence          DECIMAL(5,2),                   -- AI confidence 0-100
    junction_id         INT REFERENCES junctions(id) ON DELETE SET NULL,
    corridor_id         INT REFERENCES corridors(id) ON DELETE SET NULL,
    lane_id             INT REFERENCES lanes(id) ON DELETE SET NULL,
    reported_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    description         TEXT,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blockage_duration   INT,                            -- seconds (if lane blockage)
    lane_occupancy      DECIMAL(5,2),                   -- % (if lane blockage)
    vehicle_count       INT DEFAULT 0,
    signal_state        VARCHAR(16),                    -- at detection time
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_type      ON incidents(type);
CREATE INDEX idx_incidents_status    ON incidents(status);
CREATE INDEX idx_incidents_severity  ON incidents(severity);
CREATE INDEX idx_incidents_junction  ON incidents(junction_id);
CREATE INDEX idx_incidents_corridor  ON incidents(corridor_id);
CREATE INDEX idx_incidents_detected  ON incidents(detected_at);

CREATE TABLE reports (
    id                  SERIAL PRIMARY KEY,
    incident_id         INT REFERENCES incidents(id) ON DELETE SET NULL,
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                incident_type NOT NULL,
    status              incident_status NOT NULL DEFAULT 'SUBMITTED',
    location_text       VARCHAR(255),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    description         TEXT,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duplicate_of_report_id INT REFERENCES reports(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user     ON reports(user_id);
CREATE INDEX idx_reports_incident ON reports(incident_id);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_reports_submitted ON reports(submitted_at);

-- ============================================================
-- EVIDENCE & AI ANALYSIS
-- ============================================================

CREATE TABLE evidence (
    id              SERIAL PRIMARY KEY,
    incident_id     INT REFERENCES incidents(id) ON DELETE CASCADE,
    report_id       INT REFERENCES reports(id) ON DELETE CASCADE,
    file_type       VARCHAR(16) NOT NULL,             -- 'image' | 'video'
    file_format     VARCHAR(16) NOT NULL,             -- 'jpg' | 'png' | 'mp4' | ...
    file_url        VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    width_px        INT,
    height_px       INT,
    duration_sec    INT,                              -- if video
    frame_count     INT,
    uploaded_by_id  INT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_incident ON evidence(incident_id);
CREATE INDEX idx_evidence_report   ON evidence(report_id);

CREATE TABLE ai_analysis (
    id                  SERIAL PRIMARY KEY,
    evidence_id         INT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    incident_id         INT REFERENCES incidents(id) ON DELETE SET NULL,
    report_id           INT REFERENCES reports(id) ON DELETE SET NULL,
    analysis_type       VARCHAR(64) NOT NULL,        -- 'vehicle_detection' | 'ocr' | 'lane' | 'quality' | 'full'
    model_version       VARCHAR(64),
    confidence          DECIMAL(5,2),
    is_mock             BOOLEAN DEFAULT TRUE,        -- demo flag
    detected_vehicles   JSONB,                        -- [{type, bbox, direction, track_id}]
    detected_lanes      JSONB,
    signal_state        VARCHAR(16),
    number_plate        VARCHAR(32),
    parking_detected    BOOLEAN,
    wrong_side_detected BOOLEAN,
    blockage_detected   BOOLEAN,
    evidence_quality_score INT,                        -- 0-100
    evidence_quality_breakdown JSONB,                  -- {clarity, visibility, context, ...}
    selected_frames     JSONB,                        -- URLs or indices for video
    raw_output          JSONB,                        -- full model output for audit
    completed_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_analysis_evidence ON ai_analysis(evidence_id);
CREATE INDEX idx_ai_analysis_incident ON ai_analysis(incident_id);

CREATE TABLE vehicles (
    id              SERIAL PRIMARY KEY,
    incident_id     INT REFERENCES incidents(id) ON DELETE SET NULL,
    ai_analysis_id  INT REFERENCES ai_analysis(id) ON DELETE SET NULL,
    vehicle_type    VARCHAR(64),                      -- 'car' | 'truck' | 'bus' | 'bike' | 'auto'
    number_plate    VARCHAR(32),                      -- synthetic for demo
    color           VARCHAR(64),
    bbox            JSONB,
    direction       VARCHAR(32),                      -- 'straight' | 'left' | 'right' | 'wrong_side'
    track_id        VARCHAR(64),
    is_parked       BOOLEAN,
    confidence      DECIMAL(5,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_incident   ON vehicles(incident_id);
CREATE INDEX idx_vehicles_plate      ON vehicles(number_plate);

CREATE TABLE locations (
    id              SERIAL PRIMARY KEY,
    incident_id     INT REFERENCES incidents(id) ON DELETE CASCADE,
    report_id       INT REFERENCES reports(id) ON DELETE SET NULL,
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    accuracy_m      DECIMAL(8,2),                    -- GPS accuracy
    source          VARCHAR(32),                      -- 'gps' | 'manual' | 'cctv'
    address_text    VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OPERATIONS
-- ============================================================

CREATE TABLE duplicate_groups (
    id                  SERIAL PRIMARY KEY,
    master_incident_id  INT REFERENCES incidents(id) ON DELETE CASCADE,
    duplicate_incident_ids INT[] NOT NULL DEFAULT '{}',
    similarity_score    DECIMAL(5,2),                  -- 0-100
    reason              TEXT,                           -- location+time+plate match
    grouped_by_authority_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interventions (
    id              SERIAL PRIMARY KEY,
    corridor_id     INT REFERENCES corridors(id) ON DELETE SET NULL,
    junction_id     INT REFERENCES junctions(id) ON DELETE SET NULL,
    problem_type    incident_type,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    evidence_count  INT DEFAULT 0,
    peak_hours      VARCHAR(128),
    suggested_action TEXT NOT NULL,
    potential_impact TEXT,
    priority        severity_level DEFAULT 'MEDIUM',
    status          VARCHAR(32) DEFAULT 'SUGGESTED',  -- SUGGESTED | UNDER_REVIEW | APPROVED | IMPLEMENTED
    estimated_speed_before INT,
    estimated_speed_after  INT,
    created_by_id   INT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    type            VARCHAR(64),
    incident_id     INT REFERENCES incidents(id) ON DELETE SET NULL,
    report_id       INT REFERENCES reports(id) ON DELETE SET NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_read   ON notifications(user_id, is_read);

CREATE TABLE audit_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(128) NOT NULL,            -- 'LOGIN' | 'VERIFY_INCIDENT' | ...
    incident_id     INT REFERENCES incidents(id) ON DELETE SET NULL,
    report_id       INT REFERENCES reports(id) ON DELETE SET NULL,
    intervention_id INT REFERENCES interventions(id) ON DELETE SET NULL,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(64),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_action   ON audit_logs(action);
CREATE INDEX idx_audit_created  ON audit_logs(created_at);

-- ============================================================
-- ANALYTICS SNAPSHOTS (time-series)
-- ============================================================

CREATE TABLE analytics_snapshots (
    id                  SERIAL PRIMARY KEY,
    corridor_id         INT REFERENCES corridors(id) ON DELETE SET NULL,
    junction_id         INT REFERENCES junctions(id) ON DELETE SET NULL,
    snapshot_at         TIMESTAMPTZ NOT NULL,
    avg_speed_kmh       DECIMAL(6,2),
    congestion_level    severity_level,
    lane_blockage_pct   DECIMAL(5,2),
    illegal_parking_pct DECIMAL(5,2),
    wrong_side_pct      DECIMAL(5,2),
    other_pct           DECIMAL(5,2),
    vehicle_count       INT,
    incident_count      INT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_time     ON analytics_snapshots(snapshot_at);
CREATE INDEX idx_snapshots_corridor ON analytics_snapshots(corridor_id);
CREATE INDEX idx_snapshots_junction ON analytics_snapshots(junction_id);

-- ============================================================
-- SEED: ROLES + DEMO USERS
-- ============================================================

INSERT INTO roles (name, description) VALUES
    ('citizen',   'Regular citizen user that can report issues'),
    ('authority', 'Traffic authority official with review access'),
    ('admin',     'System administrator');

-- NOTE: Password hashes are for demo only (bcrypt rounds=10)
-- Passwords:
--   citizen@roadwatch.in   -> Citizen@123
--   authority@roadwatch.in -> Authority@123
-- (hashes generated by Python seed_data.py)
