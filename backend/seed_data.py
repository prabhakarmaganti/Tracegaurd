import datetime
from sqlalchemy.orm import Session
from backend import models
from backend.database import Base, SessionLocal, engine


def seed_database(db: Session = None):
    Base.metadata.create_all(bind=engine)
    if db is None:
        db = SessionLocal()

    # Check if already seeded
    if db.query(models.Machine).first():
        return

    print("Seeding Production & Defect Tracking database with realistic manufacturing data...")

    # 1. Shifts
    shift_a = models.Shift(name="Shift A", start_time="06:00", end_time="14:00")
    shift_b = models.Shift(name="Shift B", start_time="14:00", end_time="22:00")
    shift_c = models.Shift(name="Shift C", start_time="22:00", end_time="06:00")
    db.add_all([shift_a, shift_b, shift_c])
    db.commit()

    # 2. Machines
    m01 = models.Machine(code="M01", name="Stamping Press 1", location="Bay 1 - Stamping", active=True)
    m02 = models.Machine(code="M02", name="Brake Caliper Station", location="Bay 1 - Assembly", active=True)
    m03 = models.Machine(code="M03", name="CNC 5-Axis Mill", location="Bay 2 - Machining", active=True)
    m04 = models.Machine(code="M04", name="Laser Weld Cell 4", location="Bay 2 - Precision Welding", active=True)
    m05 = models.Machine(code="M05", name="Powder Coating Line", location="Bay 3 - Finishing", active=True)
    m06 = models.Machine(code="M06", name="Ultrasonic Cleaner", location="Bay 3 - Cleaning", active=True)
    m07 = models.Machine(code="M07", name="CMM Coordinate Measure", location="Bay 4 - QA Cell", active=True)
    m08 = models.Machine(code="M08", name="Automated Packing 1", location="Bay 5 - Shipping", active=True)
    m09 = models.Machine(code="M09", name="Automated Packing 2", location="Bay 5 - Shipping", active=True)
    db.add_all([m01, m02, m03, m04, m05, m06, m07, m08, m09])
    db.commit()

    # 3. Operators
    op1 = models.Operator(name="J. Alvarez", badge_id="OP-4412", active=True)
    op2 = models.Operator(name="S. Chen", badge_id="OP-2190", active=True)
    op3 = models.Operator(name="M. Kowalski", badge_id="OP-3304", active=True)
    op4 = models.Operator(name="T. Jenkins", badge_id="OP-1188", active=True)
    op5 = models.Operator(name="R. Patel", badge_id="OP-5521", active=True)
    db.add_all([op1, op2, op3, op4, op5])
    db.commit()

    # 4. Products
    p_wgt = models.Product(sku="WGT-A200", name="Widget A200", spec="High-pressure fuel rail valve casing")
    p_brk = models.Product(sku="BRK-X100", name="Brake Caliper X1", spec="Commercial vehicle caliper bracket")
    p_trb = models.Product(sku="TRB-F400", name="Turbine Flange F4", spec="High-temp nickel alloy exhaust flange")
    db.add_all([p_wgt, p_brk, p_trb])
    db.commit()

    # 5. Suppliers
    sup_steel = models.Supplier(name="Steel Co.", contact="supply@steelco.example.com / +1-555-0192")
    sup_coat = models.Supplier(name="Coatings Inc", contact="orders@coatingsinc.example.com / +1-555-0184")
    sup_fast = models.Supplier(name="Apex Fasteners", contact="info@apexfast.example.com")
    sup_rub = models.Supplier(name="Rubber & Polymer Ltd", contact="support@rubberpoly.example.com")
    db.add_all([sup_steel, sup_coat, sup_fast, sup_rub])
    db.commit()

    # 6. Raw Material Lots
    now = datetime.datetime(2026, 9, 27, 9, 14, 0)
    lot_sl2291 = models.RawMaterialLot(
        lot_code="SL-2291",
        supplier_id=sup_steel.id,
        material_name="Steel Coil 316L (Cold Rolled)",
        received_date=now - datetime.timedelta(days=17),
        quantity=5000.0,
        remaining_quantity=3200.0,
        unit="kg",
    )
    lot_ct0087 = models.RawMaterialLot(
        lot_code="CT-0087",
        supplier_id=sup_coat.id,
        material_name="Epoxy Thermal Coating Primer",
        received_date=now - datetime.timedelta(days=12),
        quantity=1200.0,
        remaining_quantity=840.0,
        unit="liters",
    )
    lot_sl2278 = models.RawMaterialLot(
        lot_code="SL-2278",
        supplier_id=sup_steel.id,
        material_name="Steel Sheet Grade 304",
        received_date=now - datetime.timedelta(days=19),
        quantity=4000.0,
        remaining_quantity=2900.0,
        unit="kg",
    )
    lot_rb1140 = models.RawMaterialLot(
        lot_code="RB-1140",
        supplier_id=sup_rub.id,
        material_name="Nitrile O-Ring Seals (Batch N8)",
        received_date=now - datetime.timedelta(days=15),
        quantity=10000.0,
        remaining_quantity=7500.0,
        unit="pcs",
    )
    lot_ap8842 = models.RawMaterialLot(
        lot_code="AP-8842",
        supplier_id=sup_fast.id,
        material_name="Grade 8.8 M6 Flange Bolts",
        received_date=now - datetime.timedelta(days=9),
        quantity=20000.0,
        remaining_quantity=18400.0,
        unit="pcs",
    )
    db.add_all([lot_sl2291, lot_ct0087, lot_sl2278, lot_rb1140, lot_ap8842])
    db.commit()

    # 7. Key Batches matching screenshot:
    # Row 1: P1-WGT-260927-M04-0032
    b1 = models.Batch(
        batch_code="P1-WGT-260927-M04-0032",
        product_id=p_wgt.id,
        machine_id=m04.id,
        operator_id=op1.id,
        shift_id=shift_b.id,
        start_time=datetime.datetime(2026, 9, 27, 15, 12, 0),
        end_time=datetime.datetime(2026, 9, 27, 17, 40, 0),
        quantity_produced=340.0,
        status="completed",
        notes="High vibration noticed on welding horn toward end of run.",
    )
    b1.material_lots = [lot_sl2291, lot_ct0087]

    # Row 2: P1-WGT-260926-M04-0028
    b2 = models.Batch(
        batch_code="P1-WGT-260926-M04-0028",
        product_id=p_wgt.id,
        machine_id=m04.id,
        operator_id=op1.id,
        shift_id=shift_b.id,
        start_time=datetime.datetime(2026, 9, 26, 14, 0, 0),
        end_time=datetime.datetime(2026, 9, 26, 16, 40, 0),
        quantity_produced=340.0,
        status="completed",
        notes="Standard run, operator flagged minor seal ridge.",
    )
    b2.material_lots = [lot_sl2291, lot_rb1140]

    # Row 3: P1-BRK-260925-M02-0011
    b3 = models.Batch(
        batch_code="P1-BRK-260925-M02-0011",
        product_id=p_brk.id,
        machine_id=m02.id,
        operator_id=op2.id,
        shift_id=shift_a.id,
        start_time=datetime.datetime(2026, 9, 25, 7, 30, 0),
        end_time=datetime.datetime(2026, 9, 25, 11, 45, 0),
        quantity_produced=220.0,
        status="completed",
        notes="Calibrated guide pin at 09:00.",
    )
    b3.material_lots = [lot_sl2278, lot_ct0087]

    # Row 4: P1-WGT-260924-M03-0019
    b4 = models.Batch(
        batch_code="P1-WGT-260924-M03-0019",
        product_id=p_wgt.id,
        machine_id=m03.id,
        operator_id=op3.id,
        shift_id=shift_b.id,
        start_time=datetime.datetime(2026, 9, 24, 14, 15, 0),
        end_time=datetime.datetime(2026, 9, 24, 18, 0, 0),
        quantity_produced=180.0,
        status="completed",
        notes="End mill replaced mid-run.",
    )
    b4.material_lots = [lot_sl2278]

    # Other batches to populate M04 and other machines
    b5 = models.Batch(
        batch_code="P1-WGT-260923-M04-0015",
        product_id=p_wgt.id,
        machine_id=m04.id,
        operator_id=op1.id,
        shift_id=shift_b.id,
        start_time=datetime.datetime(2026, 9, 23, 14, 30, 0),
        end_time=datetime.datetime(2026, 9, 23, 17, 0, 0),
        quantity_produced=310.0,
        status="completed",
    )
    b5.material_lots = [lot_sl2291]

    # Incomplete batches (2 of 512 missing a field to match KPI)
    b_inc1 = models.Batch(
        batch_code="P1-TRB-260920-M05-0008",
        product_id=p_trb.id,
        machine_id=m05.id,
        operator_id=None,  # Missing operator!
        shift_id=shift_c.id,
        start_time=datetime.datetime(2026, 9, 20, 23, 0, 0),
        end_time=datetime.datetime(2026, 9, 21, 3, 30, 0),
        quantity_produced=90.0,
        status="incomplete",
        notes="Operator badge scan failed at kiosk.",
    )
    b_inc2 = models.Batch(
        batch_code="P1-WGT-260918-M01-0004",
        product_id=p_wgt.id,
        machine_id=m01.id,
        operator_id=op4.id,
        shift_id=shift_a.id,
        start_time=datetime.datetime(2026, 9, 18, 6, 30, 0),
        end_time=datetime.datetime(2026, 9, 18, 9, 0, 0),
        quantity_produced=150.0,
        status="incomplete",  # Missing raw material lot!
        notes="Material lot sheet was water-damaged.",
    )

    db.add_all([b1, b2, b3, b4, b5, b_inc1, b_inc2])
    db.commit()

    # Add serialized unit samples to b1
    for i in range(1, 11):
        db.add(models.Unit(unit_serial=f"P1-WGT-260927-M04-0032-U{i:03d}", batch_id=b1.id))
    db.commit()

    # 8. Defects (matching screenshot table exactly!)
    d1 = models.Defect(
        reference="P1-WGT-260927-M04-0032",
        batch_id=b1.id,
        defect_type="Seal failure",
        severity="High",
        description="Laser weld seam incomplete along bottom circumference; leak during pressure test at 45 PSI.",
        reported_by="QA Inspector T. Higgins",
        reported_at=datetime.datetime(2026, 9, 27, 9, 14, 0),
        status="Recall calc pending",
    )
    d2 = models.Defect(
        reference="P1-WGT-260926-M04-0028",
        batch_id=b2.id,
        defect_type="Seal failure",
        severity="High",
        description="Micro-fracture detected in welded casing; containment quarantine triggered.",
        reported_by="QA Inspector S. Vance",
        reported_at=datetime.datetime(2026, 9, 26, 16, 40, 0),
        status="Recall active — 340 units",
    )
    d3 = models.Defect(
        reference="P1-BRK-260925-M02-0011",
        batch_id=b3.id,
        defect_type="Dimensional",
        severity="Medium",
        description="Guide pin slot out-of-tolerance by +0.08mm. Tool recalibrated.",
        reported_by="QA Inspector T. Higgins",
        reported_at=datetime.datetime(2026, 9, 25, 14, 20, 0),
        status="Traced, no recall needed",
    )
    d4 = models.Defect(
        reference="P1-WGT-260924-M03-0019",
        batch_id=b4.id,
        defect_type="Coating defect",
        severity="Medium",
        description="Surface orange-peel texture on internal flange face. Non-critical.",
        reported_by="QA Inspector M. Ross",
        reported_at=datetime.datetime(2026, 9, 24, 11, 0, 0),
        status="Closed",
    )

    # Additional defects to make up the 12 open defects (with 3 high severity)
    d5 = models.Defect(
        reference="P1-WGT-260923-M04-0015",
        batch_id=b5.id,
        defect_type="Seal failure",
        severity="High",
        description="Pinhole defect in sealing lip.",
        reported_by="QA Inspector S. Vance",
        reported_at=datetime.datetime(2026, 9, 23, 17, 30, 0),
        status="Recall calc pending",
    )
    d6 = models.Defect(
        reference="SL-2291",
        batch_id=b1.id,
        defect_type="Material inclusion",
        severity="Medium",
        description="Micro-void in steel strip SL-2291.",
        reported_by="QA Inspector T. Higgins",
        reported_at=datetime.datetime(2026, 9, 22, 10, 0, 0),
        status="Under Investigation",
    )

    db.add_all([d1, d2, d3, d4, d5, d6])
    db.commit()

    # 9. Initial Audit Log entries
    models.AuditLog(
        entity="System",
        entity_id="Plant1",
        action="SYSTEM_INIT",
        actor="System Admin",
        timestamp=now - datetime.timedelta(days=30),
        diff_json='{"status": "Initialized Plant 1 Production & Defect Tracking Master Configuration"}',
    )
    db.commit()

    print("Seed data loaded successfully!")


if __name__ == "__main__":
    seed_database()
