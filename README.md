# Production & Defect Tracking

## Manufacturing Traceability and Recall Containment System

Production & Defect Tracking is a software-based manufacturing execution and traceability system designed for industrial manufacturing environments. It bridges the gap between raw-material receiving, shop-floor production, quality assurance, and compliance auditing without introducing external cloud infrastructure, internet dependencies, or proprietary IoT sensor hardware.

The user interface implements the dark precision manufacturing design specified in the project requirements and visual reference (`Pasted image.png`).

---

## 1. System Overview

In conventional manufacturing settings lacking lot-level linkage, a single defect complaint frequently forces a blanket recall spanning months of production. Production & Defect Tracking mitigates this by enforcing data capture at each manufacturing transition:

- **Complete Chain of Custody**: Binds each finished unit and production batch to its work center (machine), operator, shift, time window, and supplier raw-material lots.
- **Traceability by Construction**: The data schema and validation rules prevent a batch from closing until all required parameters (machine, operator, shift, product, and consumed lots) are verified.
- **Deterministic Batch Coding**: Formats batch identifiers as `{PLANT}-{PRODUCT}-{YYMMDD}-{MACHINE}-{SEQ}` with checksum validation to catch manual transcription errors while maintaining rapid legibility on the plant floor.
- **Targeted Recall Scope Bounding**: Replaces arbitrary date-range recalls with algorithmic containment boundaries, typically reducing recalled unit volume by over 80 percent.
- **Audit-Ready Compliance**: Produces verified chain-of-custody documentation on demand in PDF and CSV formats suitable for ISO 9001 and FDA 21 CFR Part 820 regulatory audits.

---

## 2. Technical Stack

| Component | Technology | Rationale |
|---|---|---|
| Frontend Presentation | Semantic HTML5, CSS3, Vanilla JavaScript (ES6+) | Zero build step; low latency; universal compatibility with existing plant PCs, tablets, and kiosks |
| Typography | Google Fonts (`Fraunces`, `IBM Plex Sans`, `IBM Plex Mono`) | High legibility on industrial screens; tabular figures for numerical alignment |
| Backend API | FastAPI (Python 3.11+ / 3.14) | High throughput; native asynchronous execution; automatic OpenAPI contract generation |
| Data Validation | Pydantic v2 | Strict request and response payload validation and typing |
| Relational Storage | SQLite via SQLAlchemy ORM | Zero-configuration local deployment; Write-Ahead Logging (WAL) mode enabled for concurrent access; portable to PostgreSQL |
| Label & Code Generation | Python `qrcode` (PIL engine) | Generates standard 2D matrix representations printable through native browser dialogs |
| Regulatory Reporting | ReportLab | Programmatic generation of tamper-evident PDF audit documentation |
| Containerization | Docker & Docker Compose | Single-container packaging for isolated on-premise execution behind plant firewalls |

---

## 3. Installation and Deployment

### Option A: Local Execution via Quick-Start Script

A pre-configured startup script automates virtual environment creation, dependency installation, database migration, reference data seeding, and server execution.

```bash
# Ensure execution permissions on the startup script
chmod +x run.sh

# Launch the application
./run.sh
```

Once started, access the application in any modern web browser:
- Application UI: http://localhost:8000/
- Interactive OpenAPI Documentation: http://localhost:8000/docs
- System Health Check: http://localhost:8000/health

### Option B: Docker Container Deployment

For containerized deployment on a plant server or virtual machine:

```bash
# Build image and run container in detached mode
docker compose up --build -d

# Verify container status
docker compose ps

# View operational logs
docker compose logs -f
```

The database file is persisted to the host filesystem at `./data/traceguard.db`.

### Option C: Vercel Serverless Deployment

Production & Defect Tracking is configured for zero-friction deployment on [Vercel](https://vercel.com):

1. **Deploy via Vercel CLI**:
   ```bash
   # Install Vercel CLI if needed
   npm install -g vercel

   # Deploy directly from your workspace
   vercel
   ```

2. **Deploy via Git**:
   - Push this repository to GitHub, GitLab, or Bitbucket.
   - Import the repository in your [Vercel Dashboard](https://vercel.com/new).
   - Vercel automatically detects the Python runtime configuration and `vercel.json`.
   - Click **Deploy**.

#### Environment Variables (Optional)
| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | None (uses SQLite) | Connection string for persistent PostgreSQL / Supabase / Neon database. |
| `TRACEGUARD_DB_PATH` | `/tmp/traceguard.db` (on Vercel) | Custom SQLite file location if desired. |

> **Note on Storage**: On Vercel serverless functions, SQLite runs out of `/tmp/traceguard.db` with automatic database table creation and initial seed data. For production persistence across all global serverless edge regions, configure an external `DATABASE_URL` (e.g., Neon Postgres or Supabase).

---

## 4. API Specification

### Dashboard and Metrics
- `GET /api/dashboard/summary`: Retrieves plant KPIs (completeness ratio, unresolved defects, recall scope reduction, daily batch volume), machine defect distributions, material lot distributions, and recent defect event rows.

### Trace Resolution
- `GET /api/trace/{code}`: Resolves a batch code or serialized unit code to its complete genealogy (product specification, machine, operator, shift window, consumed raw-material lots, supplier profiles, and defect log). Includes a base64-encoded QR matrix.

### Batch Operations
- `POST /api/batches/start`: Initiates a production run, deducts raw material inventory, validates equipment availability, and generates a deterministic batch code.
- `POST /api/batches/{id}/close`: Records total produced quantity and run notes, verifies trace completeness, updates batch status, and generates printable label metadata.
- `GET /api/batches`: Lists batches with optional filtering by operational status (`active`, `completed`, `incomplete`).
- `GET /api/batches/{id}/label`: Returns printable label data with QR code for floor printers.

### Defect Management
- `POST /api/defects`: Records a defect against a batch code or unit serial, automatically linking the defect to the underlying custody chain.
- `GET /api/defects`: Returns defects with associated machine and product metadata.
- `PUT /api/defects/{id}/status`: Updates containment and investigation status (`Recall calc pending`, `Recall active`, `Traced, no recall needed`, `Closed`).

### Recall Containment
- `POST /api/recalls/calculate`: Calculates bounded candidate batches based on shared risk criteria (machine code, raw material lot identifiers, production time delta) and reports unit volume reduction relative to a naive date-range baseline.
- `POST /api/recalls/confirm`: Records an authorized quarantine containment event and transitions associated defect records.
- `GET /api/recalls`: Lists historical recall events and containment parameters.

### Material Receiving
- `GET /api/materials/lots`: Returns registered raw material lots and current inventory levels.
- `POST /api/materials/lots`: Registers incoming raw material deliveries and generates printable bin tags.
- `GET /api/materials/lots/{id}/label`: Returns 2D barcode data for warehouse pallet or bin identification.

### Regulatory Compliance and Auditing
- `GET /api/reports/batch/{code}/export?format=pdf|csv`: Generates downloadable ISO 9001 and FDA 21 CFR Part 820 audit reports for a specific batch.
- `GET /api/audit-logs`: Retrieves immutable, append-only event logs detailing system modifications, actors, timestamps, and payload differentials.

---

## 5. Verification and Demonstration Scenarios

The seeded environment pre-populates realistic manufacturing records matching the reference specifications:

| Identifier | Context | Expected Result |
|---|---|---|
| `P1-WGT-260927-M04-0032` | Laser Weld Cell 4, Steel Lot SL-2291 | Resolves 100% complete chain; shows seal failure defect; eligible for targeted recall calculation |
| `P1-WGT-260926-M04-0028` | Laser Weld Cell 4, Steel Lot SL-2291 | Historical batch under active containment (340 units quarantined) |
| `P1-BRK-260925-M02-0011` | Station M02, Primer Lot CT-0087 | Dimensional variance logged; status verified as "Traced, no recall needed" |
| `P1-TRB-260920-M05-0008` | Finishing Line M05 | Demonstrates safety exception handling: flagged as "Incomplete Trace" due to missing operator credential |

---

