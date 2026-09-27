import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base

# Many-to-many relationship table between Batches and RawMaterialLots
batch_material_lots = Table(
    "batch_material_lots",
    Base.metadata,
    Column("batch_id", Integer, ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True),
    Column("lot_id", Integer, ForeignKey("raw_material_lots.id", ondelete="RESTRICT"), primary_key=True),
    Column("quantity_used", Float, default=0.0),
)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    contact = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    raw_material_lots = relationship("RawMaterialLot", back_populates="supplier")


class RawMaterialLot(Base):
    __tablename__ = "raw_material_lots"

    id = Column(Integer, primary_key=True, index=True)
    lot_code = Column(String(64), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    received_date = Column(DateTime, default=datetime.datetime.utcnow)
    quantity = Column(Float, nullable=False, default=1000.0)
    remaining_quantity = Column(Float, nullable=False, default=1000.0)
    unit = Column(String(32), default="kg")
    material_name = Column(String(128), nullable=True)

    supplier = relationship("Supplier", back_populates="raw_material_lots")
    batches = relationship("Batch", secondary=batch_material_lots, back_populates="material_lots")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    spec = Column(Text, nullable=True)

    batches = relationship("Batch", back_populates="product")


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(128), nullable=True)
    active = Column(Boolean, default=True)

    batches = relationship("Batch", back_populates="machine")


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    badge_id = Column(String(64), unique=True, nullable=False, index=True)
    active = Column(Boolean, default=True)

    batches = relationship("Batch", back_populates="operator")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)  # e.g., "Shift A", "Shift B", "Shift C"
    start_time = Column(String(32), nullable=False)  # e.g. "06:00"
    end_time = Column(String(32), nullable=False)  # e.g. "14:00"

    batches = relationship("Batch", back_populates="shift")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(64), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    quantity_produced = Column(Float, default=0.0)
    status = Column(String(32), default="active")  # "active", "completed", "incomplete"
    notes = Column(Text, nullable=True)

    product = relationship("Product", back_populates="batches")
    machine = relationship("Machine", back_populates="batches")
    operator = relationship("Operator", back_populates="batches")
    shift = relationship("Shift", back_populates="batches")
    material_lots = relationship("RawMaterialLot", secondary=batch_material_lots, back_populates="batches")
    units = relationship("Unit", back_populates="batch", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="batch")


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    unit_serial = Column(String(64), unique=True, nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)

    batch = relationship("Batch", back_populates="units")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(64), nullable=False, index=True)  # Batch code or unit serial
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    defect_type = Column(String(64), nullable=False)
    severity = Column(String(32), nullable=False, default="Medium")  # "High", "Medium", "Low"
    description = Column(Text, nullable=True)
    reported_by = Column(String(128), default="QA Inspector")
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(64), default="Recall calc pending")  # "Recall calc pending", "Recall active — 340 units", "Traced, no recall needed", "Closed"

    batch = relationship("Batch", back_populates="defects")
    recall_events = relationship("RecallEvent", back_populates="triggering_defect")


class RecallEvent(Base):
    __tablename__ = "recall_events"

    id = Column(Integer, primary_key=True, index=True)
    triggering_defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True)
    criteria_json = Column(Text, nullable=False)  # JSON encoded criteria used
    affected_batch_codes_json = Column(Text, nullable=False)  # List of affected batch codes
    total_units_at_risk = Column(Integer, default=0)
    status = Column(String(32), default="Initiated")  # "Initiated", "In Progress", "Closed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    triggering_defect = relationship("Defect", back_populates="recall_events")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String(64), nullable=False, index=True)
    entity_id = Column(String(64), nullable=True)
    action = Column(String(64), nullable=False)  # CREATE, UPDATE, CLOSE, DEFECT_LOG, RECALL_INITIATED, etc.
    actor = Column(String(128), nullable=False, default="System")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    diff_json = Column(Text, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False, default="Operator")  # "Admin", "Operator", "QA", "Manager", "Receiving"
    password_hash = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
