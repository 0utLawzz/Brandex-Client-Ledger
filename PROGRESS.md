# Brandex Client Ledger — Progress Report

**Generated:** 2026-10-08  
**Repository:** https://github.com/0utLawzz/Brandex-Client-Ledger  
**Production:** https://brandex-client-ledger.vercel.app  
**Local snapshot folder:** `artifacts/Brandex-Ledger` (older monolithic variant + community docs draft)

---

## 1. What has been done (shipped)

### Product / UI
- [x] Neo-Brutalism Brandex theme (locked colors, fonts, hard shadows)
- [x] Multi-series accounts (A / X) with series banners and filter
- [x] Client CRUD-ish flow (create client + stage rates S1–S4)
- [x] Client contact fields (email, phone) + city
- [x] Case model centered on TM number + application name + folder
- [x] Add Record (Charge) with stage rate autofill and TM lookup
- [x] Add Receiving (Payment) with methods, bank date, link-to-charge, receipt number
- [x] Soft void of ledger entries
- [x] Dashboard KPIs (clients, received, outstanding, entries) + recent activity
- [x] Client list search & series filter
- [x] Client ledger view + **Current View** (last ~6 rows)
- [x] Case / TM filter on ledger
- [x] Edit case (TM / folder / app name)
- [x] Reports (by client / case / stage) + Print A4
- [x] Print acknowledgment / receipt for receivings
- [x] Print ledger A4

### Data layer
- [x] Supabase schema: series, clients, client_stage_rates, cases, ledger_entries
- [x] `tm_no_normalized` + `normalize_tm()` helper
- [x] `get_stage_payment_status(tm_digits)` RPC (CMS-ready)
- [x] Migration 002: voided_at, void_reason, linked_entry_id
- [x] Migration 003: email, phone
- [x] Client balances view
- [x] Dev-open RLS (temporary)

### Ops / docs
- [x] Vercel deployment + `vercel.json`
- [x] `.env.example`
- [x] README, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT (community health files)
- [x] Assets (logos, favicon, social preview)

### Companion tools
- [x] Related repo: Brandex-Excel-Addin (export to PDF/PNG)
- [x] Companion: Brandex-Database-CMS (consumer of payment status)

---

## 2. What is pending (near-term gaps)

| Item | Notes |
|------|--------|
| Stage outstanding panel in ledger | Stub exists in gaps.js (`renderStageOutstanding`); needs full implementation |
| Auth + tight RLS | Currently open policies for anon; required before broader exposure |
| Seed / import from legacy Excel / JSON | Old local `Brandex-Ledger` and Excel workbook are the source; no automated seed in current repo |
| Full CMS integration | RPC exists; CMS side still needs to call it and stop treating manual flags as source of truth |
| Image / PDF export of current view | Mentioned in early design; partial print path exists |
| Selected-row print | Planned |
| Signature block on acks | Planned |
| Configurable stages beyond S1–S4 | Hard-coded today |
| Branding / prefix settings UI | Planned |
| Activity / audit log UI | Not yet surfaced |
| Desktop layout polish | Planned refinements |

---

## 3. Future / longer-term

- Staff authentication (Supabase Auth) and role-based access
- Automated reconciliation reports
- Multi-currency (if ever needed beyond PKR)
- Mobile-first refinements
- Optional offline / local-first cache
- Deeper Excel add-in round-trip (ledger → Excel → ledger)
- Public status page or client-facing receipt portal (if required)

---

## 4. Local vs GitHub

| Location | Role |
|----------|------|
| `github.com/0utLawzz/Brandex-Client-Ledger` | **Canonical** current product (modular JS, full schema, production) |
| `artifacts/Brandex-Ledger/` | Older monolithic `index.html` (~116 KB) + early community docs; useful as reference / migration source, **not** the live app |

---

## 5. Recommended next actions

1. Run migrations 001–003 on the production Supabase project if not already applied.
2. Implement stage-outstanding summary on the client ledger page.
3. Add staff Auth and replace open RLS policies.
4. Build a one-time seed script from the legacy Excel/JSON data.
5. Wire Brandex-Database-CMS to `get_stage_payment_status`.
6. Keep CHANGELOG and this PROGRESS file updated with each meaningful ship.

---

*This report was generated from a full read of the GitHub repository tree, key source files (`app.js`, `gaps.js`, migrations, README), and the local artifacts snapshot. No prior project memory / progress file was present.*
