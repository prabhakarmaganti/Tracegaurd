# Design — TraceGuard
## UI/UX Design Reference

This document defines the visual language and screen inventory implemented by the sample dashboard artifact delivered alongside this doc. It's meant to be handed to whoever builds the HTML/CSS frontend.

## 1. Design Principles

- **Factory-floor legible, not decorative.** Large touch targets, high contrast, minimal chrome — this runs on shop-floor tablets under normal lighting, sometimes with gloves on.
- **Status at a glance.** Color communicates state (traced/complete vs. missing/at-risk vs. open defect) consistently everywhere in the product.
- **Fewest fields possible.** Every form defaults what it can (today's shift, the station's assigned machine) so operators aren't typing more than necessary.
- **One source of truth per screen.** The dashboard shows *what's happening*; the trace/search screen shows *what happened to this specific unit*. They don't try to do both.

## 2. Design Tokens

**Color**
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#151A21` | Primary text |
| `--slate` | `#54606E` | Secondary text |
| `--paper` | `#F7F8FA` | App background |
| `--surface` | `#FFFFFF` | Card/panel background |
| `--line` | `#E2E6EB` | Borders/dividers |
| `--brand` | `#1F5F5B` | Primary actions, active nav (deep teal — evokes industrial/QA, not a generic SaaS blue) |
| `--brand-dim` | `#E4EFEE` | Brand tint for backgrounds/badges |
| `--good` | `#1E7A46` | Traced / complete / healthy |
| `--warn` | `#B4791A` | Attention / pending |
| `--bad` | `#B3261E` | Defect / at-risk / missing trace |

**Type**
- Display/headings: `Fraunces` (a workable, slightly industrial serif with real character) at weight 600 — used sparingly, for page titles and the dashboard's big numbers only.
- UI/body: `IBM Plex Sans` — chosen because its origin (IBM's own systems typeface) reads appropriately technical/operational for a plant-floor tool, and it has excellent tabular figures for data tables.
- Monospace (codes only — batch codes, lot codes): `IBM Plex Mono`.

**Layout**
- 12-column grid, max content width 1280px on desktop; single column, stacked cards on tablet/mobile widths.
- 8px base spacing unit; cards use 24px internal padding.
- Radius: 10px on cards, 6px on inputs/buttons — consistent, not mixed.
- No accent stripes/bars; hierarchy comes from type scale and spacing, not decoration.

## 3. Screen Inventory

| Screen | Primary role(s) | Purpose |
|---|---|---|
| Login | All | Role-based sign-in |
| Dashboard | QA, Manager, Admin | KPIs: traceability completeness, defect rate by machine/lot, open defects, recent recalls |
| Start Batch | Operator | Begin a production run |
| Close Batch | Operator | End a run, trigger label printing |
| Trace Lookup | QA, Manager | Scan/enter a code → full chain of custody |
| Report Defect | QA | Log a defect against a batch/unit |
| Recall Calculator | Manager | Compute precise recall scope from a defect |
| Material Intake | Receiving | Log incoming raw-material lots |
| Master Data | Admin | Manage machines, operators, products, suppliers, users |
| Reports/Export | Manager, Admin | Compliance exports |

## 4. Key Wireframes (ASCII)

### Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ TraceGuard              Dashboard  Trace  Defects  Reports   │  <- top nav
├─────────────────────────────────────────────────────────────┤
│  Traceability      Open Defects      Recall Scope    Batches │
│  Completeness      12                Reduction        Today  │
│  99.6%             (3 high severity) 87% avg           42    │  <- KPI cards
├───────────────────────────────┬───────────────────────────────┤
│ Defect rate by machine (bars)  │ Defect rate by material lot   │
│                                 │                                │
├───────────────────────────────┴───────────────────────────────┤
│ Recent Defects Table:  Code | Machine | Type | Severity | ... │
└─────────────────────────────────────────────────────────────┘
```

### Trace Lookup (the single most important screen)
```
┌─────────────────────────────────────────────────────────────┐
│  Scan or enter a batch/unit code:  [ P1-WGT-260927-M04-0032 ]│
│                                                    [ Trace ]  │
├─────────────────────────────────────────────────────────────┤
│  Product: Widget A200        Machine: M04 (Line 2)           │
│  Operator: J. Alvarez         Shift: B (14:00–22:00)         │
│  Produced: 2026-09-27 15:12–17:40                             │
│  Raw Material Lots: SL-2291 (Steel Co.), CT-0087 (Coatings Inc)│
│  Quantity in Batch: 340 units      Status: ● Fully traced    │
│                                       [ Report Defect on this ]│
└─────────────────────────────────────────────────────────────┘
```

### Start Batch
```
┌───────────────────────────────┐
│ Machine:  [ M04 ▾ ]            │
│ Product:  [ Widget A200 ▾ ]    │
│ Shift:    [ B (auto) ]         │
│ Material Lot(s): [ + Add Lot ] │
│                                 │
│           [ Start Batch ]      │
└───────────────────────────────┘
```

## 5. Component Notes

- **Status badges** (Traced / Missing Data / Open Defect / Recalled) use the same three-color system everywhere — this consistency is what lets a manager scan the dashboard in seconds.
- **Tables** use tabular-figure monospace for codes/quantities so columns align.
- **Batch/lot codes** are always shown in `--ink` on `IBM Plex Mono`, never truncated — an inspector needs to read the whole thing.
- No login-wall illustrations, no marketing copy anywhere in the product — every screen is a work surface.

## 6. Reference Implementation

A static HTML/CSS sample of the Dashboard screen (with representative mock data) is provided as a companion artifact, built to these tokens, to hand directly to frontend implementation.
