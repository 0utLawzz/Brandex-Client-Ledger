# Brandex Client Ledger

The client-side financial ledger for Brandex Law Associates. It records client accounts, trademark cases, stage charges, receipts, balances, and printable/exportable reports.

**Production:** [brandex-client-ledger.vercel.app](https://brandex-client-ledger.vercel.app)

**Repository:** [0utLawzz/Brandex-Client-Ledger](https://github.com/0utLawzz/Brandex-Client-Ledger)
**Current baseline:** `0.3.0` release candidate (preview review pending)

## Product boundary

Brandex Client Ledger owns financial records: client accounts and rates, TM-linked cases, charges, payments, receipts, and payment balances. Brandex Database CMS owns the fuller case record and case-workflow details. The Ledger is the financial source of truth; the CMS must not create a competing financial ledger.

The intended entry flow is to create a case in the Ledger with the minimum required financial and identifying details, then open that case in the CMS to complete its fuller record. The CMS connection for this flow is not yet complete. The Ledger's **Open Case** button remains a clear placeholder until the Case System is ready. See [Project Memory](docs/PROJECT_MEMORY.md) for the observed implementation and unresolved decisions.

## Current capabilities

- Staff sign-in backed by Supabase Auth; database table policies target authenticated users.
- Client accounts, account series, contact details, and client-specific S1–S4 rates.
- Client editing, series creation, and recoverable client archiving that preserves financial history.
- TM-linked charges and receiving entries, optional case/folder/application details, payment methods, and printable receipts.
- Client and case views, stage balances, dashboard totals, filters, reports, CSV export, and print layouts.
- Grouped reporting with per-client or case totals; payment methods remain stored for reconciliation but are omitted from ledger/report displays and printouts.
- Consistent A4 ledger, report, charge receipt, and receiving acknowledgment styles with a shared Brandex logo/contact header and copyright/design credit footer on every print job.
- Public Brandex website/contact/social links and a site credit for design/build.
- Soft-void support and a stage-payment status RPC intended for trusted CMS server-side use.
- Ledger-entry search, type/stage/date filters, and sound/animation preferences.

These descriptions reflect the current repository and migrations; they do not imply that Ledger-to-CMS handoff is already implemented.

## How records are created and displayed

1. Staff sign in, choose a client, and use **Add Record** to post a stage charge. The current form can create or find a case as part of that charge; Stage 1 allows a missing TM number, while the current UI requires a TM number for later stages.
2. The case row stores the client relationship and identifying fields such as TM number, folder number, application name, and case reference. The financial event is stored separately as a `ledger_entries` charge linked to that case.
3. **Add Receiving** creates a separate receiving entry and can associate it with a case, stage, or charge. Receivings display in client/case ledgers and may produce a printable receipt.
4. Dashboard, client ledger, case list, stage balance summary, reports, and print/export views read the account and entry records. Voided entries are excluded from payment calculations.

Creation and linking details are based on source inspection, not a new end-to-end test. Read [Project Memory](docs/PROJECT_MEMORY.md) before changing this flow.

## Architecture

| Area | Current implementation |
|---|---|
| Interface | Static HTML, CSS, and browser JavaScript; no framework build step |
| Database and sign-in | Supabase Postgres and Supabase Auth |
| Hosting | Vercel |
| Primary files | `index.html`, `app.js`, `gaps.js`, `gaps-print.js`, `brand-patch.js`, `phase2.js`, CSS files |
| Database changes | Ordered SQL files in `supabase/migrations/` |

The scripts layer additions and overrides over earlier functions. Their load order is functional; do not remove or rearrange scripts based only on filenames or apparent duplication.

## Local setup

1. Serve this directory with a local static web server, or open `index.html` for limited inspection.
2. Configure the Supabase URL and publishable anon key using the app's supported configuration. `.env.example` is a reference only: this project has no Vite build to read `VITE_*` variables automatically.
3. Create staff accounts in Supabase Auth; public self-registration is not part of the app.
4. For a new database, review and apply migrations in order. Existing environments must first be compared with their applied migration history; do not replay or edit historical migrations blindly.

Never put a service-role key in the browser or commit credentials. Authenticated access, staff role grants, and environment configuration must be checked in the target environment.

## Database map

- `series`: account grouping and display order.
- `clients`: client identity, contact details, balance/configuration fields.
- `client_stage_rates`: client-specific S1–S4 charge amounts.
- `cases`: client-linked trademark/case identifiers and descriptive fields.
- `ledger_entries`: separate charge and receiving events, optionally linked to cases and charges.
- RPCs and views: normalized TM lookup, stage payment status, balances, and stage calculations.

The database is authoritative for financial facts. The CMS may consume a narrowly scoped status result through a trusted server-side path; it must not write or infer Ledger financial events from CMS-side cached flags.

## Release and change workflow

- Work on a branch and push every code change to GitHub in a commit.
- Vercel preview is the review environment. Do not merge to production or promote a deployment until the user approves the preview.
- Database migrations require separate environment review; do not apply production SQL as a side effect of a code deployment.
- Keep changes focused. Preserve financial history; prefer additive migrations and soft voids over destructive edits.
- Follow [Contributing](CONTRIBUTING.md), [Project Memory](docs/PROJECT_MEMORY.md), and [Progress](PROGRESS.md).

## License and project policies

MIT. See [Security](SECURITY.md), [Support](SUPPORT.md), and [Code of Conduct](CODE_OF_CONDUCT.md).
