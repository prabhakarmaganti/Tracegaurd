from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import crud, database, schemas
from app.labels import generate_qr_data_url

router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.post("/start")
def start_batch(req: schemas.BatchStartRequest, db: Session = Depends(database.get_db)):
    """Operator opens a production run: assigns machine, shift, product, lots."""
    new_batch = crud.start_batch(db, req)
    qr_data_url = generate_qr_data_url(new_batch.batch_code)
    return {
        "id": new_batch.id,
        "batch_code": new_batch.batch_code,
        "status": new_batch.status,
        "start_time": new_batch.start_time.strftime("%Y-%m-%d %H:%M"),
        "qr_data_url": qr_data_url,
        "message": f"Batch {new_batch.batch_code} initiated successfully",
    }


@router.post("/{batch_id}/close")
def close_batch(
    batch_id: int,
    req: schemas.BatchCloseRequest,
    db: Session = Depends(database.get_db),
):
    """Operator closes out a batch: records quantity, notes, generates printable labels."""
    try:
        closed = crud.close_batch(db, batch_id, req)
        qr_data_url = generate_qr_data_url(closed.batch_code)
        return {
            "id": closed.id,
            "batch_code": closed.batch_code,
            "status": closed.status,
            "quantity_produced": closed.quantity_produced,
            "end_time": closed.end_time.strftime("%Y-%m-%d %H:%M") if closed.end_time else "",
            "qr_data_url": qr_data_url,
            "message": f"Batch {closed.batch_code} closed. Status: {closed.status.upper()}",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("")
def list_batches(
    limit: int = Query(50, ge=1, le=200),
    status: str = Query(None),
    db: Session = Depends(database.get_db),
):
    """Lists batches with filtering by status."""
    batches = crud.get_batches(db, limit=limit, status=status)
    out = []
    for b in batches:
        is_complete = bool(
            b.machine_id
            and b.operator_id
            and b.shift_id
            and b.product_id
            and len(b.material_lots) > 0
        )
        out.append({
            "id": b.id,
            "batch_code": b.batch_code,
            "product_name": b.product.name if b.product else "N/A",
            "product_sku": b.product.sku if b.product else "N/A",
            "machine_code": b.machine.code if b.machine else "N/A",
            "operator_name": b.operator.name if b.operator else "Unassigned",
            "shift_name": b.shift.name if b.shift else "N/A",
            "quantity_produced": int(b.quantity_produced),
            "start_time": b.start_time.strftime("%Y-%m-%d %H:%M") if b.start_time else "",
            "end_time": b.end_time.strftime("%Y-%m-%d %H:%M") if b.end_time else "",
            "status": b.status,
            "is_complete": is_complete,
            "material_lots_count": len(b.material_lots),
        })
    return out


@router.get("/{batch_id}/label")
def get_batch_label(batch_id: int, db: Session = Depends(database.get_db)):
    """Returns label data including high-res QR code for label printing."""
    batch = db.query(crud.models.Batch).filter(crud.models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    qr_url = generate_qr_data_url(batch.batch_code)
    return {
        "batch_code": batch.batch_code,
        "product_name": batch.product.name if batch.product else "N/A",
        "product_sku": batch.product.sku if batch.product else "N/A",
        "machine_code": batch.machine.code if batch.machine else "N/A",
        "operator_name": batch.operator.name if batch.operator else "N/A",
        "shift_name": batch.shift.name if batch.shift else "N/A",
        "date_str": batch.start_time.strftime("%Y-%m-%d"),
        "quantity": int(batch.quantity_produced),
        "qr_data_url": qr_url,
    }
