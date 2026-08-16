from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    Float, Numeric, BigInteger, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    role = relationship("Role")


class Corridor(Base):
    __tablename__ = "corridors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    length_km = Column(Numeric(6, 2))
    num_lanes = Column(Integer, default=2)
    expected_speed = Column(Integer, default=30)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    city = Column(String(120))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Junction(Base):
    __tablename__ = "junctions"
    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(32), unique=True)
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    has_cctv = Column(Boolean, default=False)
    num_signals = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    corridor = relationship("Corridor")


class Lane(Base):
    __tablename__ = "lanes"
    id = Column(Integer, primary_key=True, index=True)
    junction_id = Column(Integer, ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False, index=True)
    lane_number = Column(Integer, nullable=False)
    lane_type = Column(String(32), nullable=False)
    allowed_movement = Column(String(64), nullable=False)
    polygon_coords = Column(JSON)
    occupancy_threshold = Column(Numeric(5, 2), default=60.0)
    blockage_duration_threshold = Column(Integer, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    junction = relationship("Junction")


class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, index=True)
    junction_id = Column(Integer, ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="SET NULL"))
    signal_group = Column(String(64))
    current_state = Column(String(16), default="RED")
    last_changed_at = Column(DateTime(timezone=True))
    cycle_duration = Column(Integer)
    green_duration = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(32), unique=True, nullable=False)
    type = Column(String(32), nullable=False, index=True)
    source = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    severity = Column(String(16), nullable=False, default="MEDIUM", index=True)
    priority_score = Column(Integer, default=50)
    confidence = Column(Numeric(5, 2))
    junction_id = Column(Integer, ForeignKey("junctions.id"), index=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id"))
    reported_by_user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    blockage_duration = Column(Integer)
    lane_occupancy = Column(Numeric(5, 2))
    vehicle_count = Column(Integer, default=0)
    signal_state = Column(String(16))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    junction = relationship("Junction")
    corridor = relationship("Corridor")
    lane = relationship("Lane")


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="SUBMITTED")
    location_text = Column(String(255))
    latitude = Column(Numeric(10, 7), index=True)
    longitude = Column(Numeric(10, 7), index=True)
    description = Column(Text)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    duplicate_of_report_id = Column(Integer, ForeignKey("reports.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), index=True)
    file_type = Column(String(16), nullable=False)
    file_format = Column(String(16), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger)
    width_px = Column(Integer)
    height_px = Column(Integer)
    duration_sec = Column(Integer)
    frame_count = Column(Integer)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"
    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), index=True)
    analysis_type = Column(String(64), nullable=False)
    model_version = Column(String(64))
    confidence = Column(Numeric(5, 2))
    is_mock = Column(Boolean, default=True)
    detected_vehicles = Column(JSON)
    detected_lanes = Column(JSON)
    signal_state = Column(String(16))
    number_plate = Column(String(32))
    parking_detected = Column(Boolean)
    wrong_side_detected = Column(Boolean)
    blockage_detected = Column(Boolean)
    evidence_quality_score = Column(Integer)
    evidence_quality_breakdown = Column(JSON)
    selected_frames = Column(JSON)
    raw_output = Column(JSON)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    ai_analysis_id = Column(Integer, ForeignKey("ai_analysis.id"), index=True)
    vehicle_type = Column(String(64))
    number_plate = Column(String(32), index=True)
    color = Column(String(64))
    bbox = Column(JSON)
    direction = Column(String(32))
    track_id = Column(String(64))
    is_parked = Column(Boolean)
    confidence = Column(Numeric(5, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"))
    report_id = Column(Integer, ForeignKey("reports.id"))
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    accuracy_m = Column(Numeric(8, 2))
    source = Column(String(32))
    address_text = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"
    id = Column(Integer, primary_key=True, index=True)
    master_incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"))
    duplicate_incident_ids = Column(JSON, default=list)
    similarity_score = Column(Numeric(5, 2))
    reason = Column(Text)
    grouped_by_authority_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"))
    junction_id = Column(Integer, ForeignKey("junctions.id"))
    problem_type = Column(String(32))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    evidence_count = Column(Integer, default=0)
    peak_hours = Column(String(128))
    suggested_action = Column(Text, nullable=False)
    potential_impact = Column(Text)
    priority = Column(String(16), default="MEDIUM")
    status = Column(String(32), default="SUGGESTED")
    estimated_speed_before = Column(Integer)
    estimated_speed_after = Column(Integer)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text)
    type = Column(String(64))
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    report_id = Column(Integer, ForeignKey("reports.id"))
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String(128), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    report_id = Column(Integer, ForeignKey("reports.id"))
    intervention_id = Column(Integer, ForeignKey("interventions.id"))
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String(64))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    corridor_id = Column(Integer, ForeignKey("corridors.id"), index=True)
    junction_id = Column(Integer, ForeignKey("junctions.id"), index=True)
    snapshot_at = Column(DateTime(timezone=True), nullable=False, index=True)
    avg_speed_kmh = Column(Numeric(6, 2))
    congestion_level = Column(String(16))
    lane_blockage_pct = Column(Numeric(5, 2))
    illegal_parking_pct = Column(Numeric(5, 2))
    wrong_side_pct = Column(Numeric(5, 2))
    other_pct = Column(Numeric(5, 2))
    vehicle_count = Column(Integer)
    incident_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
