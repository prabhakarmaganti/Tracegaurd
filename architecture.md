# Architecture — TraceGuard

## 1. High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Shop-Floor & Office Browsers"]
        A1[Operator Station]
        A2[QA Inspector Station]
        A3[Manager Dashboard]
        A4[Receiving Clerk Station]
    end

    subgraph Server["Factory-Floor Server (on-prem / local VM)"]
        B1[Static HTML/CSS/JS]
        B2[FastAPI Application]
        B3[Auth & RBAC Middleware]
        B4[Business Logic\n(Trace Resolver, Recall Calculator)]
        B5[SQLAlchemy ORM]
        B6[(SQLite Database)]
        B7[Label/QR Generator]
        B8[Report Generator\nPDF/CSV]
        B9[Audit Logger]
    end

    A1 & A2 & A3 & A4 -->|HTTPS - LAN| B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    B5 --> B6
    B4 --> B7
    B4 --> B8
    B4 --> B9
    B9 --> B6

    B6 -.nightly backup.-> C1[(Local/Network Backup)]
```

No external cloud service, sensor network, or IoT gateway is part of this system. The entire stack runs on infrastructure the plant already has (a PC/small server on the local network) and standard browsers.

## 2. Component Responsibilities

| Component | Responsibility |
|---|---|
| Static frontend | Renders forms (batch start/close, defect log, receiving intake) and the dashboard; talks to the backend only via the documented JSON API |
| FastAPI application | Request routing, validation (Pydantic), authentication |
| Auth & RBAC | Confirms identity, enforces per-role permissions (Admin/Operator/QA/Manager/Receiving) |
| Business logic layer | Two critical functions: **Trace Resolver** (code → full chain of custody) and **Recall Calculator** (defect criteria → affected batch set) |
| SQLAlchemy ORM | DB-agnostic data access layer; enables SQLite-to-Postgres migration without rewriting business logic |
| SQLite database | System of record; single file, WAL mode for concurrent writers |
| Label/QR generator | Produces batch and lot labels as printable PNG/PDF via the browser print dialog |
| Report generator | Produces compliance/audit exports (PDF/CSV) |
| Audit logger | Appends an immutable record of every create/update/delete, with actor and timestamp |

## 3. Data Model (ER Diagram)

```mermaid
erDiagram
    SUPPLIERS ||--o{ RAW_MATERIAL_LOTS : supplies
    RAW_MATERIAL_LOTS ||--o{ BATCH_MATERIAL_LOTS : "consumed in"
    BATCHES ||--o{ BATCH_MATERIAL_LOTS : uses
    PRODUCTS ||--o{ BATCHES : "produced as"
    MACHINES ||--o{ BATCHES : runs
    OPERATORS ||--o{ BATCHES : operates
    SHIFTS ||--o{ BATCHES : during
    BATCHES ||--o{ UNITS : contains
    BATCHES ||--o{ DEFECTS : "linked via batch_code"
    UNITS ||--o{ DEFECTS : "linked via unit_serial"
    DEFECTS ||--o{ RECALL_EVENTS : triggers
    BATCHES }o--o{ RECALL_EVENTS : "affected_by (computed)"

    SUPPLIERS {
        int id PK
        string name
        string contact
    }
    RAW_MATERIAL_LOTS {
        int id PK
        string lot_code
        int supplier_id FK
        date received_date
        float quantity
    }
    PRODUCTS {
        int id PK
        string sku
        string name
    }
    MACHINES {
        int id PK
        string code
        string name
        string location
    }
    OPERATORS {
        int id PK
        string name
        string badge_id
    }
    SHIFTS {
        int id PK
        string name
        time start_time
        time end_time
    }
    BATCHES {
        int id PK
        string batch_code
        int product_id FK
        int machine_id FK
        int operator_id FK
        int shift_id FK
        datetime start_time
        datetime end_time
        float quantity_produced
        string status
    }
    BATCH_MATERIAL_LOTS {
        int batch_id FK
        int lot_id FK
    }
    UNITS {
        int id PK
        string unit_serial
        int batch_id FK
    }
    DEFECTS {
        int id PK
        string reference
        string defect_type
        string severity
        string description
        string reported_by
        datetime reported_at
    }
    RECALL_EVENTS {
        int id PK
        int triggering_defect_id FK
        string criteria_json
        string status
        datetime created_at
    }
```

## 4. Trace Resolution Flow (the core function)

```mermaid
sequenceDiagram
    participant QA as QA Inspector
    participant UI as Web UI
    participant API as FastAPI
    participant Logic as Trace Resolver
    participant DB as SQLite

    QA->>UI: Scan/enter defective unit or batch code
    UI->>API: GET /api/trace/{code}
    API->>Logic: resolve(code)
    Logic->>DB: lookup batch by batch_code (or unit -> batch)
    DB-->>Logic: batch row
    Logic->>DB: lookup machine, operator, shift, product
    Logic->>DB: lookup linked raw_material_lots -> suppliers
    DB-->>Logic: full joined record
    Logic-->>API: chain of custody object
    API-->>UI: JSON (machine, operator, shift, lots, suppliers, time window)
    UI-->>QA: Full trace displayed in under 10 seconds
```

## 5. Recall Scope Calculation Flow

```mermaid
flowchart LR
    D[Defect reported against Batch X] --> C{Recall Calculator}
    C --> M[Same machine?]
    C --> T[Overlapping time window?]
    C --> L[Same raw-material lot?]
    M -->|match| S[Candidate batch set]
    T -->|match| S
    L -->|match| S
    S --> Q[Sum quantity_produced across candidate batches]
    Q --> R[Precise recall list:\nbatch codes + total units at risk]
```

This replaces "recall everything made in the last month" with a computed, defensible, minimal set.

## 6. Deployment View

```mermaid
flowchart TB
    subgraph Plant Network [Plant LAN - no internet required for core ops]
        Server[Docker host\nFastAPI container + SQLite volume]
        Printer[Standard label/office printer]
        PC1[Operator PC/Tablet]
        PC2[QA PC]
        PC3[Manager PC]
    end
    PC1 & PC2 & PC3 -->|HTTPS| Server
    Server -->|render label PDF/PNG| Printer
    Server -.nightly.-> Backup[(Network share / external backup)]
```

## 7. Security & Access Model

- Role-based access control at the API layer: Admin, Operator, QA Inspector, Manager, Receiving Clerk.
- Every mutating request is authenticated and written to the append-only `audit_log`.
- TLS on the LAN connection between browsers and the server.
- No external network egress required for the application to function, minimizing attack surface — consistent with the "no IoT devices" constraint, since there is no device-to-cloud channel to secure.

## 8. Why This Architecture Satisfies the Constraint

- **No IoT devices:** every data point enters the system through a human using a browser form (optionally accelerated by a USB barcode scanner, which behaves as a keyboard, not a network device).
- **Simple stack:** static HTML/CSS frontend, FastAPI backend, SQLite database — no message brokers, no device gateways, no cloud dependency.
- **Traceability by construction:** the schema makes it structurally impossible to close a batch without recording machine, operator, shift, and raw-material lot, which is the actual fix for the root problem in the prompt.
