# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows a practical semantic versioning approach for an internal tool.

## [Unreleased]

### Planned
- Configurable custom stages (beyond hard-coded S1–S4)
- Editable client account prefix / series branding settings UI
- Case-specific payment allocation polish
- Improved print / PDF / image export workflow (html2canvas full current-view export)
- Authorized signature block on acknowledgments
- Selected ledger-row printing
- Desktop-width and layout refinements
- Staff authentication + tightened RLS (replace open dev policies)
- Seed / migration path from legacy Excel / JSON ledger export
- Full end-to-end CMS sync using `get_stage_payment_status`
- Activity / audit log surface in UI

## [0.2.0] — 2026-10

### Added
- Multi-series support (A-Series, X-Series) with series banners and filter
- Per-client custom stage rates (S1–S4)
- Cases table centered on TM number + `tm_no_normalized` (digits-only join key with CMS)
- Charge (Add Record) and Receiving (Add Payment) flows with TM lookup / autofill
- Soft void (`voided_at`, `void_reason`) and link receiving → charge (`linked_entry_id`)
- Client contact fields (email, phone) — migration 003
- Dashboard KPIs and recent activity table
- Client list with search (code, name, city, phone, email) and series filter
- Client ledger with **Current View** (latest + previous rows) and case/TM filter
- Edit case (TM / folder / application name)
- Reports grouped by client / case / stage + Print A4
- Print acknowledgment / receipt for receivings; print ledger A4
- Payment methods: Cash, UBL, Meezan, EasyPaisa, JazzCash/Raast, Cheque, Online
- Bank / transfer date field when method is not Cash
- `get_stage_payment_status(tm_digits)` RPC for CMS integration
- Brandex Neo-Brutalism theme (locked visual language + assets)
- Production deployment on Vercel

### Database
- `001_initial_schema.sql` — series, clients, client_stage_rates, cases, ledger_entries, views, RLS, normalize helpers
- `002_void_and_link.sql` — void columns + linked_entry_id + improved RPC
- `003_client_contact.sql` — email, phone on clients

## [0.1.0] — Foundation

### Added
- Initial ledger concepts carried forward from the legacy Excel / monolithic ledger
- Vanilla HTML/JS + Supabase baseline
- Neo-Brutalism design system v1 applied
