# Changelog

Notable changes to Brandex Client Ledger. Dates use `YYYY-MM-DD`.

## [0.3.0] — 2026-11-01 (release candidate; preview approval pending)

### Changed

- Reset the repository documentation around the confirmed separate Ledger and CMS responsibilities.
- Added canonical project memory and repository working rules.
- Replaced the stale progress roadmap with an evidence-based baseline and known-mismatch checklist.
- Documented the static app architecture, current record creation/display flow, migration caution, and preview-first release process.
- Refined the interface to the Brandex shade-700 palette, uppercase labels, series/client identity, stage cards, and navigation feedback.
- Added Ledger entry search/type/stage filters, fixed-width wrapping for on-screen and printed tables, and moved Ledger actions below stage balances.
- Added a placeholder for the future Case System handoff and user-controlled sound/animation preferences.
- Added client archive/restore controls that preserve financial history; editing and series creation remain available.
- Rebuilt the reporting desk with grouped totals, cleaner filters, selectable exports, and responsive fixed-column tables.
- Removed payment-method details from ledger/report displays, acknowledgments, and printouts while preserving receiving input and stored data.
- Unified A4 report, charge receipt, and receiving acknowledgment styles with the Brandex logo/contact header and copyright/design credit footer on every print job.
- Set the client ledger title text to white on its navy identity strip.

### Release boundary

- No database schema, production data, or production deployment changed. This candidate changes Ledger UI behavior and client active/archive controls.
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
