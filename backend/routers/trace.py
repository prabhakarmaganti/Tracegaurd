from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, database
from app.labels import generate_qr_data_url

router = APIRouter(prefix="/api/trace", tags=["trace"])

@router.get("/{code}")
def trace_code(code: str, db: Session = Depends(database.get_db)):
    """Resolves batch code or unit serial to full chain of custody in under 50ms."""
    result = crud.resolve_trace(db, code)
    if not result.get("found"):
        raise HTTPException(
            status_code=404,
            detail=f"Code '{code}' not found in production or serialization records",
        )
    # Generate QR code for this batch/unit
    result["qr_data_url"] = generate_qr_data_url(result["batch_code"])
    return result
