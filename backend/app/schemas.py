from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleOut(RoleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)
    role: str = "citizen"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int
    role: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# --- Corridors & Junctions ---
class CorridorBase(BaseModel):
    name: str
    description: Optional[str] = None
    length_km: Optional[float] = None
    num_lanes: int = 2
    expected_speed: int = 30
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None


class CorridorOut(CorridorBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class JunctionBase(BaseModel):
    corridor_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    latitude: float
    longitude: float
    has_cctv: bool = False
    num_signals: int = 0
    description: Optional[str] = None


class JunctionOut(JunctionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LaneBase(BaseModel):
    junction_id: int
    lane_number: int
    lane_type: str
    allowed_movement: str
    polygon_coords: Optional[List[List[float]]] = None
    occupancy_threshold: float = 60.0
    blockage_duration_threshold: int = 10


class LaneOut(LaneBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Incidents ---
class IncidentBase(BaseModel):
    type: str
    source: str = "CCTV"
    description: Optional[str] = None
    junction_id: Optional[int] = None
    corridor_id: Optional[int] = None
    lane_id: Optional[int] = None
    severity: str = "MEDIUM"
    confidence: Optional[float] = None
    blockage_duration: Optional[int] = None
    lane_occupancy: Optional[float] = None
    vehicle_count: int = 0
    signal_state: Optional[str] = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    priority_score: Optional[int] = None
    description: Optional[str] = None


class IncidentOut(IncidentBase):
    id: int
    case_number: str
    status: str
    priority_score: int
    detected_at: datetime
    created_at: datetime
    updated_at: datetime
    junction: Optional[Any] = None
    corridor: Optional[Any] = None
    model_config = ConfigDict(from_attributes=True)


class IncidentListResponse(BaseModel):
    items: List[IncidentOut]
    total: int
    page: int
    page_size: int


# --- Reports (Citizen) ---
class ReportCreate(BaseModel):
    type: str
    location_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    incident_id: Optional[int] = None
    user_id: int
    type: str
    status: str
    location_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Evidence & AI ---
class EvidenceOut(BaseModel):
    id: int
    incident_id: Optional[int] = None
    report_id: Optional[int] = None
    file_type: str
    file_format: str
    file_url: str
    file_size_bytes: Optional[int] = None
    width_px: Optional[int] = None
    height_px: Optional[int] = None
    duration_sec: Optional[int] = None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AIAnalysisOut(BaseModel):
    id: int
    evidence_id: int
    incident_id: Optional[int] = None
    report_id: Optional[int] = None
    analysis_type: str
    model_version: Optional[str] = None
    confidence: Optional[float] = None
    is_mock: bool
    detected_vehicles: Optional[Any] = None
    detected_lanes: Optional[Any] = None
    signal_state: Optional[str] = None
    number_plate: Optional[str] = None
    parking_detected: Optional[bool] = None
    wrong_side_detected: Optional[bool] = None
    blockage_detected: Optional[bool] = None
    evidence_quality_score: Optional[int] = None
    evidence_quality_breakdown: Optional[Any] = None
    selected_frames: Optional[Any] = None
    completed_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AIAnalysisRequest(BaseModel):
    evidence_id: int
    report_id: Optional[int] = None
    incident_id: Optional[int] = None
    analysis_type: str = "full"


class VehicleOut(BaseModel):
    id: int
    incident_id: Optional[int] = None
    vehicle_type: Optional[str] = None
    number_plate: Optional[str] = None
    color: Optional[str] = None
    direction: Optional[str] = None
    is_parked: Optional[bool] = None
    confidence: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


# --- Analytics ---
class DashboardStats(BaseModel):
    active_incidents: int
    lane_blockages: int
    illegal_parking_reports: int
    high_risk_hotspots: int
    avg_traffic_speed: float
    demo_mode: bool


class CongestionCause(BaseModel):
    corridor_name: str
    current_speed: float
    expected_speed: int
    congestion_level: str
    cause_breakdown: Dict[str, float]
    primary_cause: str
    suggested_intervention: str


class HotspotOut(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    type: str
    severity: str
    incident_count: int
    peak_time: str
    main_cause: str
    avg_speed: Optional[float] = None
    recommended_intervention: str


class CorridorHealthOut(BaseModel):
    id: int
    name: str
    avg_speed: float
    expected_speed: int
    peak_congestion: str
    illegal_parking_count: int
    lane_blockage_count: int
    wrong_side_count: int
    recurring_cause: str
    recommended_action: str
    congestion_level: str


class InterventionOut(BaseModel):
    id: int
    problem_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    evidence_count: int
    peak_hours: Optional[str] = None
    suggested_action: str
    potential_impact: Optional[str] = None
    priority: str
    status: str
    estimated_speed_before: Optional[int] = None
    estimated_speed_after: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Notifications / Audit ---
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    body: Optional[str] = None
    type: Optional[str] = None
    incident_id: Optional[int] = None
    report_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    incident_id: Optional[int] = None
    report_id: Optional[int] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AnalyticsCharts(BaseModel):
    violations_by_type: Dict[str, int]
    incidents_by_hour: Dict[int, int]
    avg_speed_by_day: Dict[str, float]
    lane_blockage_duration: Dict[str, float]
    illegal_parking_frequency: Dict[str, int]
    hotspot_ranking: List[Dict[str, Any]]
    resolution_time: Dict[str, float]
    recurring_causes: List[Dict[str, Any]]
    reports_by_corridor: Dict[str, int]
    demo_mode: bool = True
