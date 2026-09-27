# TraceGuard System Architecture & Operational Workflows

## 1. High-Level System Architecture

TraceGuard is structured as a modular client-server web application deployed on local manufacturing plant infrastructure. It eliminates third-party cloud dependencies and dedicated IoT hardware, collecting verified data through client browser workstations and USB keyboard-wedge barcode readers.

```mermaid
flowchart TD
    subgraph Clients["Manufacturing Workstations & Terminals"]
        OP["Machine Operator Terminal (Tablet / Industrial PC)"]
        QA["Quality Assurance Terminal"]
        MGR["Plant Quality Manager Dashboard"]
        REC["Receiving Dock Workstation"]
    end

    subgraph PresentationLayer["Presentation Layer (Static Single-Page Application)"]
        UI["index.html (Semantic HTML5 Shell)"]
        CSS["style.css (Industrial Dark Precision Theme)"]
        APP_CORE["app.js (Application State & Role-Based Access Control)"]
        MODULES["Client Modules (dashboard.js, trace.js, batches.js, defects.js, recalls.js, materials.js, reports.js, master_data.js)"]
    end

    subgraph ServiceLayer["API Service Layer (FastAPI)"]
        API_DASH["/api/dashboard (Aggregated KPIs & Defect Metrics)"]
        API_TRACE["/api/trace (Deterministic Code Resolution)"]
        API_BATCH["/api/batches (Production Run Lifecycle & Labels)"]
        API_DEFECT["/api/defects (Defect Capture & Linkage)"]
        API_RECALL["/api/recalls (Scope Bounding & Containment)"]
        API_MAT["/api/materials (Raw Material Intake & Inventory)"]
        API_REP["/api/reports (ISO 9001 / FDA Compliance Exports)"]
        API_AUDIT["/api/audit-logs (Tamper-Evident Event Trail)"]
    end

    subgraph LogicLayer["Core Domain Logic Engines"]
        TR_RESOLV["Trace Resolver Engine (Sub-50ms Chain Construction)"]
        RC_CALC["Recall Scope Bounding Calculator"]
        LABEL_GEN["Label Generator (QR Code & Printable Matrix)"]
        REP_GEN["Compliance Exporter (ReportLab PDF & RFC 4180 CSV)"]
        AUDIT_ENG["Immutable Audit Logger"]
    end

    subgraph DataLayer["Persistence Layer"]
        ORM["SQLAlchemy Object Relational Mapper"]
        DB[("SQLite Database (WAL Mode Enabled, Foreign Keys Enforced)")]
    end

    OP & QA & MGR & REC -->|HTTP / JSON via LAN| UI
    UI --> CSS & APP_CORE & MODULES
    MODULES -->|RESTful Invocations| ServiceLayer

    API_DASH & API_BATCH & API_DEFECT & API_MAT --> LogicLayer
    API_TRACE --> TR_RESOLV
    API_RECALL --> RC_CALC
    API_REP --> REP_GEN
    ServiceLayer --> AUDIT_ENG

    LogicLayer --> ORM
    ORM --> DB
```

---

## 2. End-to-End Operational Lifecycle

TraceGuard guarantees traceability by construction. Production runs cannot be closed without establishing verified associations between the machine, operator, shift, product, and consumed raw-material lots.

```mermaid
flowchart LR
    subgraph Stage1["1. Raw Material Intake"]
        A1["Material Delivery"] --> A2["Receiving Clerk Registration"]
        A2 --> A3["Generate QR Bin Tag (e.g. SL-2291)"]
    end

    subgraph Stage2["2. Production Execution"]
        A3 --> B1["Operator Opens Run (Station M04, Shift B, Lot SL-2291)"]
        B1 --> B2["Deterministic Batch Code Issued (P1-WGT-260927-M04-0032)"]
        B2 --> B3["Batch Close-Out (Recorded Quantity: 340 Units, Run Notes)"]
        B3 --> B4["Generate Printable QR Batch Label & Unit Serials"]
    end

    subgraph Stage3["3. Defect Discovery & Auto-Trace"]
        B4 --> C1["Defect Identified on Unit / Assembly"]
        C1 --> C2["Scan Batch Code into Quick Trace Interface"]
        C2 --> C3["Trace Resolver Queries Multi-Table Custody Graph"]
    end

    subgraph Stage4["4. Containment & Regulatory Audit"]
        C3 --> D1["Identify Root Cause (Machine M04 + Material Lot SL-2291)"]
        D1 --> D2["Recall Calculator Computes Precise Affected Units"]
        D2 --> D3["Authorize Containment Quarantine Event"]
        D3 --> D4["Export ISO 9001 / FDA 21 CFR Part 820 Audit Package"]
    end
```

---

## 3. Component Interaction Sequence: Trace Resolution

This sequence demonstrates how a QA Inspector scans a defective unit and receives the complete custody chain in sub-50ms execution time.

```mermaid
sequenceDiagram
    autonumber
    participant QA as QA Inspector Workstation
    participant UI as Web Application (trace.js)
    participant API as FastAPI Router (trace.py)
    participant Core as Trace Resolver (crud.py)
    participant DB as SQLite Storage

    QA->>UI: Enter or scan batch code (P1-WGT-260927-M04-0032)
    UI->>API: GET /api/trace/P1-WGT-260927-M04-0032
    API->>Core: resolve_trace(db, "P1-WGT-260927-M04-0032")
    Core->>DB: Query Batch with joined Product, Machine, Operator, Shift, Lots, Defects
    DB-->>Core: Populated entity records
    Core->>Core: Validate completeness (verify non-null mandatory links)
    Core-->>API: Return structured custody dictionary
    API->>API: Generate Base64 QR code representation
    API-->>UI: Return JSON payload (HTTP 200 OK)
    UI-->>QA: Render full custody breakdown, lot genealogy, and audit actions
```

---

## 4. Recall Scope Bounding Logic

Rather than issuing date-range blanket recalls that scrap uncontaminated inventory, the Recall Calculator bounds candidate batches based on shared vulnerability criteria:

```mermaid
flowchart TD
    TRG["Triggering Defect on Batch X"] --> EVAL["Recall Scope Evaluation Engine"]

    EVAL --> CHK_MACH{"Evaluate Machine Association?"}
    CHK_MACH -- Yes --> M_MATCH["Include Batches Produced on Same Machine"]
    CHK_MACH -- No --> CHK_LOT{"Evaluate Material Lot Association?"}

    M_MATCH --> CHK_LOT
    CHK_LOT -- Yes --> L_MATCH["Include Batches Consuming Implicated Raw Lot(s)"]
    CHK_LOT -- No --> CHK_TIME{"Evaluate Production Window?"}

    L_MATCH --> CHK_TIME
    CHK_TIME -- Yes --> T_MATCH["Include Batches within Configured Time Delta (e.g. 24h)"]
    CHK_TIME -- No --> DEDUP["Deduplicate Candidate Batch Set"]

    T_MATCH --> DEDUP
    DEDUP --> SUM_QTY["Calculate Total Units at Risk"]
    SUM_QTY --> COMPARE["Compare Against Naive 30-Day Range Baseline"]
    COMPARE --> RESULT["Output Verified Containment Boundary (>80% Scope Reduction)"]
```

---

## 5. Repository Layout and Component Directory

```
/home/yash55-max/projects/new/
├── app/
│   ├── crud.py              Data access operations, trace resolution, and recall calculations
│   ├── database.py          SQLAlchemy engine setup with SQLite WAL mode and foreign key pragmas
│   ├── labels.py            Deterministic batch code generation, checksums, and QR matrix generator
│   ├── main.py              FastAPI application entrypoint, CORS configuration, and router assembly
│   ├── models.py            SQLAlchemy relational models matching architecture ER specifications
│   ├── reports.py           ReportLab PDF audit generator and RFC 4180 CSV export routines
│   ├── schemas.py           Pydantic request and response models enforcing data integrity
│   ├── seed_data.py         Reference factory data loader populating plant baseline entities
│   └── routers/
│       ├── audit.py         Endpoint exposing tamper-evident immutable audit log entries
│       ├── batches.py       Endpoints for production run initiation, close-out, and label retrieval
│       ├── dashboard.py     Endpoint serving aggregated plant KPIs and distribution metrics
│       ├── defects.py       Endpoints for defect capture, listing, and status transitions
│       ├── master_data.py   Endpoints managing machines, operators, shifts, products, suppliers
│       ├── materials.py     Endpoints for raw material intake and warehouse bin tagging
│       ├── recalls.py       Endpoints for recall scope calculation and containment authorization
│       ├── reports.py       Endpoints for streaming audit-grade compliance reports
│       └── trace.py         Endpoint for instant batch and serial custody resolution
├── static/
│   ├── css/
│   │   └── style.css        Production dark theme styling matching plant reference design
│   ├── js/
│   │   ├── app.js           Application state, client navigation, and notification management
│   │   ├── batches.js       Batch start/close workflows, validation, and label rendering
│   │   ├── dashboard.js     KPI metrics rendering, horizontal bar charts, and defect table
│   │   ├── defects.js       Defect intake dialog, auto-trace preview, and containment status
│   │   ├── master_data.js   Administrative interface for plant master data management
│   │   ├── materials.js     Raw material receiving intake and warehouse inventory tracking
│   │   ├── recalls.js       Interactive recall scope calculator and event logging
│   │   ├── reports.js       Audit export controls and immutable event history table
│   │   └── trace.js         Visual custody chain inspection, QR modal, and export triggers
│   └── index.html           Semantic, single-page application shell
├── data/
│   └── traceguard.db        SQLite database file persisted in Write-Ahead Logging mode
├── Dockerfile               Single-container containerization specification
├── docker-compose.yml       Production compose deployment for on-prem plant hosts
├── requirements.txt         Python dependency manifest
├── run.sh                   Self-contained environment bootstrapping and startup script
├── SYSTEM_ARCHITECTURE.md   System architecture, sequence diagrams, and technical specifications
└── README.md                Project documentation, deployment instructions, and API reference
```
