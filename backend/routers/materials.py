from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import crud, database, schemas
from backend.labels import generate_qr_data_url

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("/lots")
def list_lots(available_only: bool = False, db: Session = Depends(database.get_db)):
    lots = crud.get_material_lots(db, available_only=available_only)
    out = []
    for l in lots:
        out.append({
            "id": l.id,
            "lot_code": l.lot_code,
            "supplier_id": l.supplier_id,
            "supplier_name": l.supplier.name if l.supplier else "Unknown",
            "material_name": l.material_name or "Material",
            "quantity": l.quantity,
            "remaining_quantity": l.remaining_quantity,
            "unit": l.unit,
            "received_date": l.received_date.strftime("%Y-%m-%d") if l.received_date else "",
        })
    return out


@router.post("/lots")
def intake_lot(lot: schemas.RawMaterialLotCreate, db: Session = Depends(database.get_db)):
    """Receiving Clerk logs incoming raw material lot and prints bin label."""
    created = crud.create_material_lot(db, lot)
    qr_data_url = generate_qr_data_url(created.lot_code)
    return {
        "id": created.id,
        "lot_code": created.lot_code,
        "quantity": created.quantity,
        "unit": created.unit,
        "qr_data_url": qr_data_url,
        "message": f"Lot {created.lot_code} registered in inventory",
    }


@router.get("/lots/{lot_id}/label")
def get_lot_label(lot_id: int, db: Session = Depends(database.get_db)):
    lot = db.query(crud.models.RawMaterialLot).filter(crud.models.RawMaterialLot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Material lot not found")

    qr_url = generate_qr_data_url(lot.lot_code)
    return {
        "lot_code": lot.lot_code,
        "material_name": lot.material_name,
        "supplier_name": lot.supplier.name if lot.supplier else "N/A",
        "quantity": lot.quantity,
        "unit": lot.unit,
        "received_date": lot.received_date.strftime("%Y-%m-%d") if lot.received_date else "",
        "qr_data_url": qr_url,
    }
