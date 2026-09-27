import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, database, schemas

router = APIRouter(prefix="/api/recalls", tags=["recalls"])


@router.post("/calculate")
def calculate_recall(
    req: schemas.RecallCalculateRequest,
    db: Session = Depends(database.get_db),
):
    """Computes exact recall scope from triggering defect criteria."""
    try:
        return crud.calculate_recall_scope(
            db,
            triggering_code=req.triggering_code,
            match_machine=req.match_machine,
            match_material_lots=req.match_material_lots,
            match_time_window=req.match_time_window,
            window_hours=req.window_hours,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/confirm")
def confirm_recall(
    req: schemas.RecallEventCreate,
    db: Session = Depends(database.get_db),
):
    """Quality Manager initiates an actionable containment recall event."""
    event = crud.create_recall_event(db, req)
    return {
        "id": event.id,
        "status": event.status,
        "total_units_at_risk": event.total_units_at_risk,
        "created_at": event.created_at.strftime("%Y-%m-%d %H:%M"),
        "message": f"Recall Event REC-{event.id:04d} initiated for {event.total_units_at_risk} units",
    }


@router.get("")
def list_recalls(db: Session = Depends(database.get_db)):
    events = db.query(crud.models.RecallEvent).order_by(crud.models.RecallEvent.created_at.desc()).all()
    out = []
    for ev in events:
        out.append({
            "id": ev.id,
            "triggering_defect_id": ev.triggering_defect_id,
            "criteria": json.loads(ev.criteria_json) if ev.criteria_json else {},
            "affected_batches": json.loads(ev.affected_batch_codes_json) if ev.affected_batch_codes_json else [],
            "total_units_at_risk": ev.total_units_at_risk,
            "status": ev.status,
            "created_at": ev.created_at.strftime("%Y-%m-%d %H:%M") if ev.created_at else "",
            "notes": ev.notes,
        })
    return out
