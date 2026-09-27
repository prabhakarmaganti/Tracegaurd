from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend import crud, database, reports

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/batch/{code}/export")
def export_batch_report(
    code: str,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    db: Session = Depends(database.get_db),
):
    """Exports full audit-grade chain of custody report for a batch in PDF or CSV format."""
    trace_data = crud.resolve_trace(db, code)
    if not trace_data.get("found"):
        raise HTTPException(status_code=404, detail="Batch code not found")

    if format == "pdf":
        pdf_stream = reports.generate_batch_pdf_report(trace_data)
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=TraceGuard_Report_{code}.pdf"},
        )
    else:
        csv_str = reports.generate_batch_csv_report(trace_data)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=TraceGuard_Report_{code}.csv"},
        )
