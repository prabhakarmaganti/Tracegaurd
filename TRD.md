# TRD — TraceGuard
## Technical Requirements Document

**Version:** 1.0 &nbsp;|&nbsp; Companion to PRD.md and architecture.md

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Plain HTML + CSS + vanilla JavaScript (fetch API), no framework | No build step, easy to run on any factory PC/tablet from a browser, low maintenance |
| Backend | FastAPI (Python 3.11+) | Fast to build, native async, automatic OpenAPI docs, easy validation via Pydantic |
| Database | SQLite (file-based) via SQLAlchemy ORM | Zero ops overhead for a single-plant deployment; SQLAlchemy makes a later Postgres migration a config change, not a rewrite |
| Auth | Session cookie or JWT, role-based (Admin/Operator/QA/Manager/Receiving) | Simple, no external identity provider required for v1 |
| Label/Code generation | `qrcode` / `python-barcode` (server-side, rendered as PNG/SVG, printed via the browser's print dialog) | No special hardware driver; prints to any standard label or office printer |
| Reporting | `reportlab` (PDF), `pandas`/csv (CSV) | Compliance exports |
| Deployment | Single Docker container (FastAPI + SQLite volume) behind the factory's existing network; Uvicorn/Gunicorn | No cloud or IoT dependency; can run fully on-prem |

**Explicitly excluded:** MQTT/OPC-UA brokers, PLC connectors, sensor gateways, or any device-to-cloud telemetry pipeline. All inputs are human-entered through the web UI.

## 2. Data Model (Entities)

See `architecture.md` for the full ER diagram. Summary:

- **suppliers** — id, name, contact info
- **raw_material_lots** — id, lot_code, supplier_id, received_date, quantity, unit
- **products** — id, sku, name, spec
- **machines** — id, code, name, location
- **operators** — id, name, badge_id, active
- **shifts** — id, name, start_time, end_time
- **batches** — id, batch_code (unique, system-generated), product_id, machine_id, operator_id, shift_id, start_time, end_time, quantity_produced, status
- **batch_material_lots** — join table: batch_id, lot_id (many-to-many, supports blended raw materials)
- **units** *(optional serialization)* — id, unit_serial, batch_id
- **defects** — id, reference (unit_serial or batch_code), defect_type, severity, description, reported_by, reported_at, status
- **recall_events** — id, triggering_defect_id, criteria (machine/lot/date-range), affected_batch_ids (computed), status, created_at
- **audit_log** — id, entity, entity_id, action, actor, timestamp, diff (append-only, never updated/deleted)

## 3. Batch Code Design

Format: `{PLANT}-{PRODUCT}-{YYMMDD}-{MACHINE}-{SEQ}`, e.g. `P1-WGT-260927-M04-0032`.

- Deterministic and human-readable — a QA inspector can eyeball a defective unit's code and immediately know the plant, day, and machine before even querying the system.
- Encoded as a QR code on printed labels for fast scan lookup; the same string is also typeable.
- A checksum character is appended to catch transcription typos on manual entry.

## 4. API Surface (representative)

```
POST   /api/auth/login
GET    /api/machines            POST /api/machines
GET    /api/operators           POST /api/operators
GET    /api/suppliers           POST /api/suppliers
GET    /api/materials/lots      POST /api/materials/lots
POST   /api/batches/start       -> creates batch, returns batch_code
POST   /api/batches/{id}/close  -> records qty, end_time, generates label
GET    /api/batches/{id}        -> full batch detail incl. linked lots
GET    /api/trace/{code}        -> resolves unit/batch code to full chain of custody
POST   /api/defects             -> log a defect against a batch/unit
GET    /api/defects             -> list/filter defects
POST   /api/recalls/calculate   -> given defect criteria, returns affected batches + qty
GET    /api/recalls/{id}
GET    /api/dashboard/summary   -> KPIs for the dashboard
GET    /api/reports/batch/{id}/export?format=pdf|csv
GET    /api/reports/daterange/export?from=&to=&format=pdf|csv
```

All list endpoints support pagination and filtering; all mutating endpoints write an `audit_log` row.

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Trace lookup (`/api/trace/{code}`) returns in < 500ms for a plant with up to ~500k historical units |
| Availability | Runs on local factory infrastructure; target 99.5% uptime during production hours; degrades gracefully (read-only cached dashboard) if the DB is briefly unavailable |
| Data integrity | Batch codes are unique and checksum-validated; audit log is append-only; foreign keys enforced at the DB level |
| Security | Role-based access control; passwords hashed (bcrypt/argon2); all traffic over HTTPS/TLS on the internal network; input validation via Pydantic on every endpoint |
| Auditability | Every create/update/delete is logged with actor + timestamp + before/after diff; logs are immutable and exportable |
| Usability | Batch-start and defect-log forms completable in under 2 minutes on a shop-floor tablet |
| Portability | SQLite for v1; SQLAlchemy models are DB-agnostic so a Postgres swap requires only a connection-string and migration, no code rewrite |
| No IoT dependency | Zero sensor, PLC, or device-telemetry integration; all inputs are human-entered, optionally scanner-assisted |

## 6. Validation & Data Quality Rules

- A batch cannot be **closed** without: machine, operator, shift, product, and at least one raw-material lot recorded.
- A raw-material lot cannot be selected on a batch if its recorded quantity is already fully consumed by prior batches (prevents phantom traceability).
- Defect entries require a resolvable batch/unit code — unresolvable codes are flagged for manual reconciliation rather than silently dropped.
- The dashboard's "traceability completeness" KPI is computed as: batches with all mandatory fields ÷ total batches, and must be visibly monitored, not just logged.

## 7. Deployment Architecture (summary — full diagram in architecture.md)

- Single Docker Compose stack: `web` (FastAPI + static HTML/CSS/JS) + `volume` for the SQLite file.
- Runs on a factory-floor PC/server on the local LAN; operators and QA reach it via any browser at `http://plant-server/`.
- Nightly automated backup of the SQLite file to a secondary location (network share or external drive) — no cloud dependency required, though an optional off-site backup can be added later.
- No inbound internet access required for core operation.

## 8. Testing Strategy

- Unit tests on trace-resolution logic and recall-scope calculation (the two functions where a bug has the highest business cost).
- Integration tests on the batch-start → batch-close → defect → trace → recall pipeline end-to-end.
- Data-integrity tests: attempt to close a batch missing required fields must fail.
- Load test: simulate concurrent batch closes from multiple stations to confirm SQLite (WAL mode) holds up at target scale; document the Postgres cutover trigger (e.g., >20 concurrent writers or >1M rows).

## 9. Technical Risks

| Risk | Mitigation |
|---|---|
| SQLite write contention under concurrent multi-station use | Enable WAL mode; keep transactions short; document Postgres migration path |
| Manual entry errors (wrong lot/machine selected) | Dropdowns scoped to "currently active" machines/lots only; checksum on batch codes; audit log makes corrections traceable |
| Label printer variability across stations | Labels render as standard PDF/PNG via the browser print dialog — no custom driver required |
| Scope creep toward IoT integration | Explicitly out of scope per PRD; architecture keeps ingestion behind the same validated API so a future sensor feed could post through it, but v1 ships with zero device integration |
