from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend import crud, database, schemas

router = APIRouter(prefix="/api/defects", tags=["defects"])

class DefectStatusUpdate(BaseModel):
    status: str
    actor: str = "QA Inspector"


@router.post("")
def log_defect(defect: schemas.DefectCreate, db: Session = Depends(database.get_db)):
    """Logs a defect against a batch or unit serial and auto-associates custody."""
    db_defect = crud.create_defect(db, defect)
    return {
        "id": db_defect.id,
        "reference": db_defect.reference,
        "defect_type": db_defect.defect_type,
        "severity": db_defect.severity,
        "status": db_defect.status,
        "reported_at": db_defect.reported_at.strftime("%Y-%m-%d %H:%M"),
        "message": f"Defect DEF-{db_defect.id} logged successfully",
    }


@router.get("")
def list_defects(limit: int = 50, db: Session = Depends(database.get_db)):
    defects = crud.get_defects(db, limit=limit)
    out = []
    for d in defects:
        out.append({
            "id": d.id,
            "reference": d.reference,
            "batch_code": d.batch.batch_code if d.batch else d.reference,
            "machine_code": d.batch.machine.code if d.batch and d.batch.machine else "N/A",
            "product_name": d.batch.product.name if d.batch and d.batch.product else "N/A",
            "defect_type": d.defect_type,
            "severity": d.severity,
            "description": d.description,
            "reported_by": d.reported_by,
            "reported_at": d.reported_at.strftime("%Y-%m-%d %H:%M"),
            "status": d.status,
        })
    return out


@router.put("/{defect_id}/status")
def update_defect_status(
    defect_id: int,
    req: DefectStatusUpdate,
    db: Session = Depends(database.get_db),
):
    defect = db.query(crud.models.Defect).filter(crud.models.Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    old_status = defect.status
    defect.status = req.status
    db.commit()

    crud.log_audit(
        db,
        "Defect",
        str(defect.id),
        "STATUS_UPDATE",
        req.actor,
        {"old_status": old_status, "new_status": req.status},
    )
    db.commit()

    return {"id": defect.id, "status": defect.status}
