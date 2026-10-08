# Brandex Client Ledger

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

**Production:** https://brandex-client-ledger.vercel.app

**Source of truth for client stage payments** at Brandex Law Associates.  
Designed to feed `stageX_paid` / `stageX_paid_date` / `payment_reference` into [Brandex-Database-CMS](https://github.com/0utLawzz/Brandex-Database-CMS).

---

## Purpose

CMS currently uses **manual** payment flags. This ledger is the real money system:

- Multi-series client accounts (A-series, X-series, extensible)
- Custom stage rates per client (S1–S4)
- Case-wise tracking via TM number (normalized digits-only key shared with CMS)
- Two primary actions:
  1. **Add Record (Charge)** — post amount due by stage against a TM / case
  2. **Add Receiving** — record a payment, optionally allocate to a case/stage and link to a charge
- Soft-void for corrections
- Printable acknowledgments / receipts
- Full ledger + Current View (latest + previous rows) + reports + A4 print
- Dashboard with live KPIs

**Theme is locked**: Brandex Neo-Brutalism (cream, maroon/orange, gold, Bebas Neue, Space Grotesk, DM Mono, hard shadows, square inputs). Logo treatment and visual language match the other Brandex tools.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Series / Group** | Account series (A, X, …). Clients belong to one series. |
| **Client** | One account. Has custom stage rates, optional email/phone/city. |
| **Case** | A trademark matter identified by TM number (+ optional folder / application name). |
| **Stage Rate** | Client-specific price for S1, S2, S3, S4. |
| **Charge** | Amount due against a case + stage. |
| **Receiving** | Payment received. Can be linked to a specific charge and allocated to stage. |
| **Receipt / Ack** | Printable document for any receiving. |
| **Void** | Soft cancel (`voided_at`) — excluded from balances. |

Common key with CMS: **normalized TM number** (digits only).

---

## Features (current)

### Actions
- **Add Record (Charge)** — look up or create case by TM, apply client stage rate, post charge (TM required for S2–S4; Stage 1 may be pre-TM)
- **Add Receiving** — record payment (Cash / UBL / Meezan / EasyPaisa / JazzCash / Cheque / Online), optional bank date, link to charge, stage allocation, auto receipt number
- **Void entry** — soft void with optional reason

### Views
- Dashboard (clients, total received, outstanding, entries, recent activity)
- Clients (search by code/name/city/phone/email, filter by series, series banners)
- Client ledger (full history or **Current View** = last entry + ~5 previous; filter by case/TM)
- Case edit (TM / folder / application name)
- Reports (group by client / case / stage; Print A4)

### Output
- Print acknowledgment / receipt for receiving
- Print ledger A4
- Print selected / report A4

### Data & integration
- Supabase Postgres schema (series → clients → stage rates → cases → ledger_entries)
- `get_stage_payment_status(tm_digits)` RPC for CMS
- Soft void + linked_entry_id (migration 002)
- Client email / phone (migration 003)

---

## Database Schema (summary)

```text
series
  id, code (A/X/…), name, prefix, sort_order, is_active

clients
  id, series_id, client_code (unique), client_name, city, email, phone,
  header_balance, bank_*, notes, is_active, created_at, updated_at

client_stage_rates
  id, client_id, stage (S1–S4), amount, currency (PKR)

cases
  id, client_id, tm_no, tm_no_normalized, folder_no, case_ref,
  application_name, status, notes, created_at, updated_at

ledger_entries
  id, client_id, case_id (nullable),
  entry_date, entry_type (charge|receiving),
  stage (S1–S4 nullable), details,
  amount_due, amount_received, running_balance,
  payment_method, receipt_no, notes,
  voided_at, void_reason, linked_entry_id,
  created_at
```

Migrations live under `supabase/migrations/`:
- `001_initial_schema.sql` — core tables, normalize_tm, views, RLS (dev-open), RPC
- `002_void_and_link.sql` — voided_at / void_reason / linked_entry_id + improved RPC
- `003_client_contact.sql` — email, phone on clients

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML + CSS + JS (`index.html`, `app.js`, `gaps.js`, `gaps-print.js`, `brand-patch.js`, `styles.css`) |
| Design | Brandex Neo-Brutalism (locked) |
| Database | Supabase Postgres |
| Hosting | Vercel |

---

## Setup

1. Clone the repository.
2. Create a Supabase project.
3. Run the migrations in order (`001` → `002` → `003`).
4. Copy `.env.example` and set `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or use the localStorage overrides already supported in `app.js`).
5. Open `index.html` locally or deploy to Vercel (`vercel.json` present).

```bash
# Example with Supabase CLI
supabase db push
```

---

## Integration with Brandex-Database-CMS

CMS should treat this ledger as source of truth for payments. Call the read-only RPC:

```sql
get_stage_payment_status(tm_digits text)
→ { S1: {paid, paid_date, amount_due, amount_received, outstanding, entry_id}, … }
```

CMS may keep `stageX_paid` flags as a cache only.

---

## Community & contributing

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to propose changes
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md) — how to report vulnerabilities
- [SUPPORT.md](SUPPORT.md) — bug reports & feature requests
- [CHANGELOG.md](CHANGELOG.md) — what shipped and what is planned

---

## License

MIT — see [LICENSE](LICENSE)

---

**Author:** OutLawZ / Brandex Law Associates tooling  
**Companion:** [Brandex-Database-CMS](https://github.com/0utLawzz/Brandex-Database-CMS) · [Brandex-Excel-Addin](https://github.com/0utLawzz/Brandex-Excel-Addin)
