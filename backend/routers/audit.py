import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import crud, database

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("")
def get_audit_logs(limit: int = Query(50, ge=1, le=200), db: Session = Depends(database.get_db)):
    """Fetches tamper-evident immutable audit log records."""
    logs = (
        db.query(crud.models.AuditLog)
        .order_by(crud.models.AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    out = []
    for l in logs:
        out.append({
            "id": l.id,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "action": l.action,
            "actor": l.actor,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "diff": json.loads(l.diff_json) if l.diff_json else {},
        })
    return out
