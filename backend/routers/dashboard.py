from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend import crud, database

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_summary(db: Session = Depends(database.get_db)):
    """Returns dashboard KPIs, defect charts data, and recent defects matching the UI."""
    return crud.get_dashboard_summary(db)
