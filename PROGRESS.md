# Project status

**Reviewed:** 1 November 2026

**Production application:** [brandex-client-ledger.vercel.app](https://brandex-client-ledger.vercel.app)

**Code baseline:** `main` at `d6e1356` when this review began.
**This branch:** UI and repository baseline candidate; awaiting preview review.

## Current baseline

- [x] Client accounts, series, stage rates, cases, charges, and receivings exist in the Ledger.
- [x] Dashboard, client/case ledger views, stage balances, reports, print views, and exports are present in the repository.
- [x] Supabase Auth and staff-targeted table policies are represented in repository migrations.
- [x] Stage-payment status RPC correction is present in migration 006 and was previously deployed/verified in the October 2026 work record.
- [x] Brandex shade-700 palette update is present on `main`.
- [x] CMS integration PRs #6 and #10 closed without merging; branches retained.
- [x] Product boundary and repository change rules are written in `AGENTS.md` and `docs/PROJECT_MEMORY.md`.
- [x] Stale implementation roadmap removed from this status page and CHANGELOG.
- [x] Updated identity, uppercase UI text, page headers, client/series colors, stage summary, and navigation feedback.
- [x] Added Ledger entry filters and fixed column wrapping for reports and print layouts.
- [x] Moved Ledger controls below stage balances; documented the future Case System link as a placeholder.
- [x] Added client archive/restore while preserving case and financial history; edit and add-series controls remain available.
- [x] Reworked grouped reports with totals, refreshed filter layout, and set client ledger title text to white on navy.
- [x] Unified A4 report, ledger, charge receipt, and receiving acknowledgment formatting with Brandex header/footer; omitted payment method from display/print while retaining it in transaction data.
- [x] Added public Brandex contact/social footer and M. Nadeem design/build credit.
- [ ] Review the Vercel preview; approval is required before merge/release.
- [ ] After approval: merge, tag, and publish release `v0.3.0`.

## Known mismatches and operational cautions

- User-confirmed policy allows a case to begin at a later stage, but current browser wrappers enforce prior-stage clearance. Do not assume this is already implemented correctly.
- Case creation is coupled to posting a charge or receiving in the current UI; a distinct minimal case creation/handoff flow is not implemented.
- CMS handoff/payment-status consumption is not complete. Closed PRs are preserved as historical attempts, not active implementation plans.
- Client removal is a recoverable archive (`is_active = false`) so existing financial references are not erased; inactive accounts can be shown and restored.
- Receipt numbers are assembled in browser code in the inspected path; verify database constraints and live behavior before treating their uniqueness/sequence as guaranteed.
- Local SQL migration files and the previously viewed live Supabase migration history do not align cleanly. Inspect target history before applying any migration.
- No files were established as safe to delete: the layered browser scripts are runtime dependencies and references. The old planning content was removed from README/CHANGELOG/PROGRESS rather than deleting functional code or historical SQL.

See [Project Memory](docs/PROJECT_MEMORY.md) for system relationships, evidence labels, and unresolved decisions. This file records current status, not a feature roadmap.
