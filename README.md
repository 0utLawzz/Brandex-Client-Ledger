# Brandex Client Ledger

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)
![Status](https://img.shields.io/badge/Status-Foundation-blue)

**Production:** https://brandex-client-ledger.vercel.app

**Source of truth for client stage payments** at Brandex Law Associates.  
Designed to feed `stageX_paid` / `stageX_paid_date` / `payment_reference` into [Brandex-Database-CMS](https://github.com/0utLawzz/Brandex-Database-CMS).

---

## Purpose

CMS currently uses **manual** payment flags. This ledger is the real money system:

- Multi-series client accounts (A-series, X-series, custom groups)
- Custom stage rates per client (S1–S4)
- Case-wise tracking via TM number
- Two primary actions:
  1. **Add Record** — charge a case (by TM number)
  2. **Add Receiving** — record a payment against a case / client
- Printable receipts for every receiving
- Full ledger + selective export + image export
- Current view = latest entry + previous 5–6 rows
- Dashboard with live KPIs

**Theme is locked**: exact Brandex Neo-Brutalism (cream, maroon, gold, Bebas Neue, Space Grotesk, DM Mono, hard shadows, square inputs). Logo treatment and visual language are identical to the existing Brandex tools.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Series / Group** | Account series (A, X, …). Clients belong to one series. |
| **Client** | One account. Has custom stage rates. |
| **Case** | A trademark matter identified by TM number (+ optional folder / case ref). |
| **Stage Rate** | Client-specific price for S1, S2, S3, S4. |
| **Charge** | Amount due against a case + stage. |
| **Receiving** | Payment received. Can be allocated to a specific case/stage. |
| **Receipt** | Printable document for any receiving. |

Common key with CMS: **normalized TM number** (digits only).

---

## Database Schema (additive)

```text
series
  id, code (A/X/…), name, prefix, sort_order

clients
  id, series_id, client_code (unique), client_name, city,
  header_balance, bank_*, notes, is_active,
  created_at, updated_at

client_stage_rates
  id, client_id, stage (S1–S4), amount, currency (PKR)

cases
  id, client_id, tm_no, tm_no_normalized, folder_no,
  case_ref, application_name, status, notes,
  created_at, updated_at

ledger_entries
  id, client_id, case_id (nullable),
  entry_date, entry_type (charge|receiving),
  stage (S1–S4 nullable), details,
  amount_due, amount_received, running_balance,
  payment_method, receipt_no, notes,
  created_at
```

All existing concepts from the previous Ledger (`client_code`, `tm_no`, `stage`, `amount_due`, `amount_received`, running balance) are preserved and extended. Nothing is deleted.

---

## Features

### Actions
- **Add Record (TM)** — look up or create case by TM number, apply client stage rate, post charge
- **Add Receiving** — record payment, optionally allocate to case + stage, generate receipt number

### Views
- Dashboard (total clients, total due, total received, outstanding, entries today)
- Client list (filter by series / search)
- Client ledger (full history + **Current view** = last entry + 5–6 previous)
- Case view (all charges + payments for one TM)
- Stage group report

### Output
- Print receipt (single receiving)
- Export CSV (full / filtered / selective rows)
- Export current view as image (html2canvas)
- Print-optimised ledger pages

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML + CSS + JS (single `index.html` for now) |
| Design | Brandex Neo-Brutalism v2 (locked) |
| Database | Supabase Postgres |
| Hosting | Vercel |

---

## Setup

1. Clone
2. Create Supabase project
3. Run `supabase/migrations/001_initial_schema.sql`
4. Copy `.env.example` → set `SUPABASE_URL` + `SUPABASE_ANON_KEY`
5. Open `index.html` or deploy to Vercel

---

## Integration with Brandex-Database-CMS (future)

CMS will call a read-only RPC (to be added):

```sql
get_stage_payment_status(tm_digits text)
→ { S1: {paid, paid_date, amount, entry_id}, S2: …, S3: …, S4: … }
```

CMS keeps its `stageX_paid` flags as a cache and never treats them as source of truth.

---

## License

MIT

---

**Author**: OutLawZ / Brandex Law Associates tooling  
Companion to: [Brandex-Database-CMS](https://github.com/0utLawzz/Brandex-Database-CMS)
