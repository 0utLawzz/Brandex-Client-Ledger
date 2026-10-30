# Changelog

Notable changes to Brandex Client Ledger. Dates use `YYYY-MM-DD`.

## [0.2.1] — 2026-10-31 (release candidate; preview approval pending)

### Changed

- Reset the repository documentation around the confirmed separate Ledger and CMS responsibilities.
- Added canonical project memory and repository working rules.
- Replaced the stale progress roadmap with an evidence-based baseline and known-mismatch checklist.
- Documented the static app architecture, current record creation/display flow, migration caution, and preview-first release process.

### Release boundary

- Documentation-only changes; no application logic, schema, production database, or production deployment changed.
- This version is a candidate until the Vercel preview is reviewed and the user approves merge and release.

## [0.2.0] — 2026-10

### Added

- Multi-series client accounts and per-client S1–S4 rates.
- Cases centered on trademark number with normalized TM lookup.
- Charge and receiving flows, case linking, printable receipts, and soft voids.
- Client/case views, dashboard, reporting, print, and export functions.
- Supabase Auth/staff access policies and the stage-payment status RPC.
- Brandex visual styling and Vercel production deployment.

### Database

- Migrations 001–006 establish the schema, void/link behavior, client contacts, staff access/stage calculations, policy reconciliation, and zero-charge stage-payment correction.

## [0.1.0] — Foundation

- Initial static HTML/CSS/JavaScript and Supabase Ledger baseline.
