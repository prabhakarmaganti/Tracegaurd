from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Master Data Schemas ---
class MachineBase(BaseModel):
    code: str
    name: str
    location: Optional[str] = None
    active: bool = True

class MachineCreate(MachineBase):
    pass

class MachineOut(MachineBase):
    id: int
    class Config:
        from_attributes = True


class OperatorBase(BaseModel):
    name: str
    badge_id: str
    active: bool = True

class OperatorCreate(OperatorBase):
    pass

class OperatorOut(OperatorBase):
    id: int
    class Config:
        from_attributes = True


class ShiftBase(BaseModel):
    name: str
    start_time: str
    end_time: str

class ShiftCreate(ShiftBase):
    pass

class ShiftOut(ShiftBase):
    id: int
    class Config:
        from_attributes = True


class SupplierBase(BaseModel):
    name: str
    contact: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    sku: str
    name: str
    spec: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    class Config:
        from_attributes = True


# --- Material Lot Schemas ---
class RawMaterialLotCreate(BaseModel):
    lot_code: str
    supplier_id: int
    material_name: Optional[str] = "Steel Coil 316L"
    quantity: float = 1000.0
    unit: str = "kg"
    received_date: Optional[datetime] = None

class RawMaterialLotOut(BaseModel):
    id: int
    lot_code: str
    supplier_id: int
    supplier_name: Optional[str] = None
    material_name: Optional[str] = None
    received_date: datetime
    quantity: float
    remaining_quantity: float
    unit: str
    class Config:
        from_attributes = True


# --- Batch Schemas ---
class BatchStartRequest(BaseModel):
    product_id: int
    machine_id: int
    operator_id: int
    shift_id: int
    material_lot_ids: List[int] = Field(default_factory=list)
    custom_seq: Optional[int] = None
    actor: Optional[str] = "Operator"

class BatchCloseRequest(BaseModel):
    quantity_produced: float
    notes: Optional[str] = None
    serialize_units: bool = False
    actor: Optional[str] = "Operator"

class MaterialLotSummary(BaseModel):
    id: int
    lot_code: str
    supplier_name: str
    material_name: Optional[str] = None
    received_date: Optional[str] = None
    quantity_used: Optional[float] = None

class BatchOut(BaseModel):
    id: int
    batch_code: str
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    machine_code: Optional[str] = None
    machine_name: Optional[str] = None
    operator_name: Optional[str] = None
    operator_badge: Optional[str] = None
    shift_name: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    quantity_produced: float
    status: str
    notes: Optional[str] = None
    is_complete: bool
    material_lots: List[MaterialLotSummary] = []
    class Config:
        from_attributes = True


# --- Defect Schemas ---
class DefectCreate(BaseModel):
    reference: str  # Batch code or unit serial
    defect_type: str
    severity: str = "Medium"  # High, Medium, Low
    description: Optional[str] = None
    reported_by: Optional[str] = "QA Inspector"

class DefectOut(BaseModel):
    id: int
    reference: str
    batch_code: Optional[str] = None
    machine_code: Optional[str] = None
    defect_type: str
    severity: str
    description: Optional[str] = None
    reported_by: str
    reported_at: datetime
    status: str
    class Config:
        from_attributes = True


# --- Trace Resolution Schema ---
class TraceResponse(BaseModel):
    found: bool
    query_code: str
    reference_type: str  # "batch" or "unit"
    batch_code: str
    product: Optional[Dict[str, Any]] = None
    machine: Optional[Dict[str, Any]] = None
    operator: Optional[Dict[str, Any]] = None
    shift: Optional[Dict[str, Any]] = None
    time_window: Dict[str, Any] = {}
    material_lots: List[Dict[str, Any]] = []
    quantity_produced: float = 0.0
    status: str = "completed"
    is_fully_traced: bool = True
    missing_fields: List[str] = []
    defects: List[Dict[str, Any]] = []
    units_sample: List[str] = []
    qr_data_url: Optional[str] = None


# --- Recall Calculation Schemas ---
class RecallCalculateRequest(BaseModel):
    triggering_code: str  # Batch code
    match_machine: bool = True
    match_material_lots: bool = True
    match_time_window: bool = False
    window_hours: int = 24

class AffectedBatchInfo(BaseModel):
    id: int
    batch_code: str
    machine_code: str
    product_name: str
    quantity_produced: int
    start_time: str
    matched_reasons: List[str]

class RecallCalculateResponse(BaseModel):
    triggering_batch_code: str
    criteria: Dict[str, Any]
    affected_batches: List[AffectedBatchInfo]
    total_affected_batches: int
    total_units_at_risk: int
    naive_date_range_units: int
    reduction_percentage: float  # e.g., 87.5%


class RecallEventCreate(BaseModel):
    triggering_defect_id: Optional[int] = None
    triggering_batch_code: str
    criteria: Dict[str, Any]
    affected_batch_codes: List[str]
    total_units_at_risk: int
    notes: Optional[str] = None
    actor: Optional[str] = "Quality Manager"

class RecallEventOut(BaseModel):
    id: int
    triggering_defect_id: Optional[int] = None
    criteria_json: str
    affected_batch_codes_json: str
    total_units_at_risk: int
    status: str
    created_at: datetime
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None
    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class MachineDefectStat(BaseModel):
    code: str
    count: int
    is_anomaly: bool = False

class LotDefectStat(BaseModel):
    lot_code: str
    count: int
    is_anomaly: bool = False

class DashboardKPIs(BaseModel):
    completeness_percentage: float = 99.6
    completeness_text: str = "2 of 512 batches missing a field"
    open_defects_count: int = 12
    open_defects_subtext: str = "3 high severity, unresolved"
    recall_reduction_percentage: int = 87
    recall_reduction_subtext: str = "vs. naive date-range recall"
    batches_today_count: int = 42
    batches_today_subtext: str = "across 9 active machines"
    defects_by_machine: List[MachineDefectStat] = []
    defects_by_lot: List[LotDefectStat] = []
    recent_defects: List[DefectOut] = []


# --- Audit Log Schema ---
class AuditLogOut(BaseModel):
    id: int
    entity: str
    entity_id: Optional[str] = None
    action: str
    actor: str
    timestamp: datetime
    diff_json: Optional[str] = None
    class Config:
        from_attributes = True


# --- Auth / User Schemas ---
class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    active: bool
    class Config:
        from_attributes = True
