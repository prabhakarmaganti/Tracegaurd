# PRD — TraceGuard
## Manufacturing Traceability & Recall Containment System

**Version:** 1.0 &nbsp;|&nbsp; **Status:** Draft for review &nbsp;|&nbsp; **Owner:** Product

---

## 1. Problem Statement

When a manufacturer cannot tie a finished unit back to the batch, machine, operator, shift, and raw-material lot that produced it, a single defect complaint forces a blanket recall instead of a targeted one. The business consequences are concrete:

- **Recall scope is guesswork.** Without lot-level linkage, the only safe recall boundary is "everything made in the last N months," which destroys far more good inventory than the defect justifies.
- **Root cause stays hidden.** A defect is detected but never localized to a machine, a shift, or a supplier lot, so the same failure recurs.
- **Audits fail.** ISO 9001 and FDA-style regimes require a demonstrable chain of custody per unit. No trail means no audit pass, which risks fines, lost certifications, and lost OEM contracts.

TraceGuard closes this gap using only software: structured data capture at each production step, deterministic batch/serial coding, and a query engine that turns "we found a bad part" into "here are exactly the 340 units at risk, made on Machine 4, shift B, from Steel Lot SL-2291."

## 2. Goals

| # | Goal | Metric |
|---|---|---|
| G1 | Every unit/batch is traceable to machine, operator, shift, and raw-material lot | 100% of production runs have complete trace records |
| G2 | Recall scope shrinks to the true at-risk population | Recall size reduced by ≥80% vs. current date-range-based recalls |
| G3 | Root-cause signals surface without new hardware | Defect-by-machine and defect-by-supplier-lot views available same-day |
| G4 | Pass traceability audits on demand | Any batch's full chain-of-custody exportable in under 60 seconds |
| G5 | No disruption to the shop floor | Data entry per production run ≤ 2 minutes; usable on existing PCs/tablets, no new sensors or network infrastructure |

## 3. Non-Goals (Out of Scope for v1)

- No IoT/PLC/sensor integration — all capture is manual entry, optionally accelerated with a plug-in USB barcode scanner acting as a keyboard-wedge (a passive peripheral, not a networked device).
- No real-time machine telemetry (vibration, temperature, etc.).
- No warehouse/shipment logistics integration in v1 (batch-to-customer shipment mapping is a fast-follow, see §9).
- No mobile native apps — the web UI is responsive and works on tablets/PCs via a browser.

## 4. Users & Personas

| Persona | Role on the floor | What they need from TraceGuard |
|---|---|---|
| **Machine Operator** | Runs a production batch on one machine per shift | Fast, low-friction batch start/close form; can't be a bottleneck |
| **QA Inspector** | Investigates defects, decides recall scope | One search box: scan/enter a unit or batch code → full trace instantly |
| **Plant/Quality Manager** | Owns audits and recall decisions | Dashboard of defect trends, one-click compliance export, recall sizing tool |
| **Supplier/Receiving Clerk** | Logs incoming raw material | Simple lot intake form tied to supplier and PO |
| **System Admin** | Maintains master data | Manage machines, operators, products, suppliers, user accounts |

## 5. Core Features (MoSCoW)

### Must have
1. **Master data management** — machines, operators, shifts, products, suppliers.
2. **Raw material lot intake** — log lot code, supplier, quantity, received date; generate a printable lot label (QR/barcode) if the supplier didn't provide one.
3. **Batch/production run logging** — operator opens a run: selects machine, shift, product, and the raw-material lot(s) consumed; system stamps start time and issues a unique **Batch Code**.
4. **Batch close-out** — operator records quantity produced, end time, and any run notes; system generates printable batch/unit labels (QR encoding the Batch Code).
5. **Defect capture & auto-trace** — QA scans/enters a batch or unit code, logs defect type/description/severity; system instantly resolves the full chain: machine → operator → shift → raw-material lot(s) → supplier.
6. **Recall scope calculator** — given one or more triggering defects, compute the precise set of batches sharing the implicated machine, time window, and/or raw-material lot, with total affected quantity.
7. **Dashboard** — defect rate by machine/shift/supplier lot, recall-scope-reduction metric, batches with incomplete traceability (target: zero), open defects.
8. **Audit/compliance export** — CSV/PDF chain-of-custody report for a batch, date range, or recall event.
9. **Role-based access** — Admin, Operator, QA, Manager, Receiving.
10. **Immutable audit log** — every create/edit is timestamped and attributed; no silent overwrites.

### Should have
11. Batch label printing to a standard label/desktop printer (browser print dialog — no special driver).
12. Search/filter across batches, defects, and lots.
13. Email/in-app alert when a defect is logged against a machine/lot that already has open defects (early warning).

### Could have
14. Customer/shipment mapping so a recall can name exact accounts, not just batch codes.
15. Configurable defect taxonomy per product line.
16. Multi-plant support (plant as a top-level dimension).

### Won't have (v1)
- Sensor/IoT data ingestion, predictive maintenance, computer-vision inspection.

## 6. Success Metrics

- **Recall containment ratio:** units recalled ÷ units actually at risk → target close to 1.0 (today, effectively unbounded).
- **Traceability completeness:** % of batches with machine + operator + lot fully recorded → target 100%.
- **Time to trace:** time from "defect reported" to "full chain of custody displayed" → target < 10 seconds.
- **Audit prep time:** time to produce a requested compliance export → target < 1 minute (down from days of manual file digging).
- **Operator time cost:** additional minutes per shift spent on data entry → target ≤ 2 minutes per batch.

## 7. Assumptions & Constraints

- Deployed on the existing factory network (on-prem server or small VM); no internet dependency required for floor operation.
- Data entry is manual by design (explicit constraint: **no IoT devices**); a USB barcode scanner may be used purely as a keyboard-input accelerator, not as a networked sensor.
- One raw-material lot can supply many batches; one batch can consume more than one lot (e.g., blended input) — the data model must support many-to-many.
- Initial scale target: a single mid-size plant, 5–50 machines, low hundreds of batches/day. Architecture should not preclude scaling to Postgres and multi-plant later.

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Operators skip/rush data entry | Breaks traceability at the source | Keep the form to ≤6 fields, most pre-filled/defaulted; make the field mandatory before a batch can close |
| Barcode scanner unavailable at some stations | Manual typos in codes | Codes are short, checksum-validated, and can be typed or scanned |
| SQLite contention at higher scale | Slower dashboard/report queries | Start on SQLite (simple ops), design the data layer (SQLAlchemy) to allow a drop-in Postgres upgrade |
| Users bypass the system under production pressure | Silent traceability gaps | Dashboard surfaces "batches missing trace data" so gaps are visible, not hidden |

## 9. Roadmap (post-v1)

- Shipment/customer mapping for pinpoint recalls down to the account level.
- Multi-plant rollup dashboard.
- Configurable, product-specific defect taxonomies and severity-weighted recall thresholds.
- Optional barcode-scanner-as-input UX polish (auto-submit on scan, audible confirmation).
