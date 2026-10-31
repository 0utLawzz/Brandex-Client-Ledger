# Brandex Client Ledger — Project Memory

**Status:** canonical working memory, reviewed 1 November 2026
**Product baseline:** Ledger is the financial system; CMS is the full case/workflow system.  
**Production:** https://brandex-client-ledger.vercel.app

This file captures user-confirmed direction and facts inspected in the current repository. It is not an implementation roadmap. The user wants the existing Ledger baseline understood and stabilized before new features are planned.

## Confirmed product model

- The welcome experience will eventually offer two destinations: **Ledger** and **Database/CMS**.
- Case/client matters begin in the **Ledger**, using the minimum details needed for account, identification, stage charge, and payment tracking.
- Opening a Ledger case should take staff to the **CMS** to fill out the richer case record and monitor legal workflow.
- The **Ledger owns money facts**: charges, payments, receipt details, and balances. The CMS owns the expanded case data and workflow. There must be one Ledger, not a CMS-local duplicate.
- Ledger payment status can be consumed by CMS through a trusted server-side integration. Browser code must never receive Supabase service-role credentials.
- Cases are not all required to start at Stage 1. A matter may enter at Stage 2 or Stage 3; the progression rule is to move forward from its actual stage. Do not infer that a skipped earlier stage is unpaid, required, or should be fabricated.
- The user expects relationship/dependency review before feature work: identify where data is created, stored, displayed, linked, and consumed; point out dead or duplicate paths and recommend a better approach when evidence supports it.
- Until the Case System is built, the Ledger's **Open Case** button remains a clear placeholder. The full case view will eventually open from this button once the systems are linked.
- Client editing and series creation should remain available. Client removal must preserve linked financial history; a recoverable inactive/archive state is the safe current implementation.
- Every code change is committed and pushed. Review changes in a preview environment first. Production deployment/promotion follows only after the user approves the preview.

## Current Ledger record model (source inspection)

The browser UI uses these linked entities:

```text
series 1 ── many clients
client 1 ── many client_stage_rates
client 1 ── many cases
client 1 ── many ledger_entries
case   1 ── many ledger_entries (case_id can be null)
charge 1 ── many? receiving links by linked_entry_id (optional)
```

`clients` carry the account identity and client-specific S1–S4 rates. `cases` carry case identifiers and descriptive details such as TM number, folder number, application name, and case reference. `ledger_entries` represent separate charge or receiving events. A case may exist without a TM at initial Stage 1 under the current UI; later-stage charge forms require a TM. Receiving can be general or linked to a case/stage/charge. The UI can create a case while posting a charge or while recording a receiving, so records are not yet created through a single dedicated “minimal case” flow.

### Where users see the records

- Dashboard: account/payment totals, recent ledger activity, charts.
- Clients: client list/search and account ledger.
- Cases/folders: TM/case list, filters, dates, stages, payment states.
- Stage summary and reports: charges, applied receipts, outstanding amounts.
- Receipt and print views: individual charge receipts, receiving acknowledgments, client ledgers, and selected/grouped reports. These share one A4 style with a Brandex logo/contact header and copyright/design credit footer on each job; payment method remains stored but is not printed or shown in ledger/report rows.
- CSV/image exports: current or selected ledger data.
- App footer: Brandex public website, email, WhatsApp, LinkedIn and copyright/build credit.

These flows are loaded across `index.html`, `app.js`, `gaps.js`, `gaps-print.js`, `assets.js`, `brand-patch.js`, `ui-interactions.js`, and the dynamically loaded `phase2.js`/`phase2.css`. Later scripts wrap or replace earlier functions. Treat load order as a dependency and trace every caller before editing.

## Confirmed vs. observed vs. unresolved

### Confirmed by the user

- Separate Ledger and CMS responsibilities and no duplicate ledger.
- Minimal case start in Ledger, then fuller case completion/workflow in CMS.
- Later-stage entry is valid; progression is forward from the actual starting stage.
- Preview first, production only after preview approval; every code change gets committed and pushed.
- Existing Ledger is the accepted financial baseline; pause new feature planning until the baseline/memory is clear.

### Observed in current code or database migrations

- The current Add Record flow combines case lookup/creation and charge creation. Add Receiving can also create a case.
- Stage gates are implemented in multiple browser script layers. `brand-patch.js` and `phase2.js` wrap `saveCharge()` and calculate prior-stage payment state; the interface therefore currently expects earlier stages to clear before later-stage charges. That conflicts with the confirmed later-stage-entry rule and needs a focused behavior audit before any workflow implementation.
- Receipt numbers are assembled in browser code (`R-` plus a timestamp) in the current save flow. Do not assume database-enforced uniqueness/sequencing without verifying the deployed schema.
- The `get_stage_payment_status(text)` RPC was corrected in migration 006 for zero-due stage status and restricted to `service_role` execution; authenticated and anonymous direct execution are revoked in the migration.
- Migrations 001–006 are present locally. The live project's migration history previously inspected in the October 2026 work did not list all of these migrations in the same form/order (it showed entries named `cms_stage_payment_bridge` and `fix_zero_charge_stage_payment_status`). Treat migration-history reconciliation as an operational risk; do not replay, rename, or rewrite historical migrations without inspecting the live environment.
- Staff table policies exist in migration 005; the application must still be validated against the target Supabase Auth setup and deployment environment.
- The CMS repository currently contains an older CMS-local ledger schema/integration attempt and documentation that disagrees with this confirmed boundary. PRs #6 and #10 were closed without merging; their branches were preserved. CMS code/data was not altered by closing them.
- The Ledger has controls to show and restore inactive clients. Charge and receiving selectors omit inactive clients; archived accounts retain their Ledger history.

### Decisions still needed before feature implementation

1. What exact minimum fields are mandatory when creating a Ledger case, and can the initial entry be created before the first charge/payment?
2. How should the app represent the case's actual starting stage so the next permitted stage is unambiguous? Existing financial stages S1–S4 and the case's current workflow stage may be distinct concepts.
3. What stable key will link Ledger and CMS records (normalized TM alone may be ambiguous; a durable Ledger case ID or explicit approved link may be safer)?
4. Should a receiving create a case when none exists, or must it link to an existing Ledger case/client balance? Current code allows case creation in a receiving path.
5. Which CMS deployment/database is the target for the future one-way payment-status read, and what trusted server mechanism will authenticate it?

These are implementation questions, not a speculative roadmap. Keep them unresolved until they affect a concrete requested feature.

## Current repository and release baseline

- GitHub: `0utLawzz/Brandex-Client-Ledger`; primary branch: `main`.
- Hosting: Vercel production at `brandex-client-ledger.vercel.app`; use branch previews before merge/promotion.
- Frontend: static HTML/CSS/JS; no `package.json` or framework build. `.env.example` mentions `VITE_*`, but the current static page does not automatically read Vite variables.
- Data layer: Supabase Postgres/Auth. Never expose service-role credentials in frontend code.
- Migrations are additive SQL under `supabase/migrations/`; do not alter already-applied files.
- Current production design uses a Brandex palette including navy `#344c68`/`#293a50`, coral `#c63d33`, and related shade-700 colors.
- Current scripts are runtime-loaded and interdependent; no files were proven safe to delete in this audit. Preserve them until call/reference tracing proves otherwise.

## Work completed in the October 2026 reset

- [x] Audited Ledger repository structure, record creation, display paths, migration list, and current documentation.
- [x] Closed CMS PR #6 and PR #10 because they are old integration approaches that do not implement the confirmed Ledger-first boundary; both PR branches and commits remain available; neither was merged.
- [x] Established this memory and repository rules on a preview branch.
- [x] Implemented the user-provided UI annotations and recoverable client archive controls on that preview branch; no schema or production data change.
- [ ] Review the resulting Vercel preview and approve or request changes.
- [ ] After approval, merge and create tag/release `v0.3.0`.

## Memory maintenance

Update this file when the user confirms a product rule or when inspected behavior materially changes. Mark the evidence as **user-confirmed**, **source-inspected**, or **environment-verified**. Do not turn unresolved questions into assumed requirements, and do not add broad feature roadmaps here.
