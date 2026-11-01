# Post-release handover: annotations and workflow review

**Prepared:** 2026-11-01
**Repository:** Brandex Client Ledger
**Production baseline:** `v0.3.0` (`main`, PR #7; production at `brandex-client-ledger.vercel.app`)
**Status:** implementation prepared on `feature/post-release-annotations`; awaiting Vercel preview review and an isolated Supabase preview migration.

## Scope and instructions

The user later asked to complete this handover. UI and application changes are prepared on the feature branch. The additive migration is a proposal only and has not been applied to any database. Follow repository preview-first and commit/push rules in `AGENTS.md`; production changes require preview approval.

## Browser annotations and implementation status

1. [x] **Edit Client modal title:** make “EDIT CLIENT” white against its dark header.
2. [x] **Series selector:** add an option to create/manage series from the client form. Display only the series name (for example, `X-Series`), without the description. Preserve the existing association and avoid orphaning clients when series are edited or removed.
3. [x] **Client code uniqueness:** allow the same client code in different series (for example, `X / 001` and `A / 001`) if that is the intended identity model. The current duplicate-entry error suggests uniqueness may be global. Inspect the deployed schema/indexes and all lookup/display paths before deciding whether the composite key is series plus code; do not change constraints without checking existing duplicates and dependent references.
4. [x] **Client address:** add a Mailing/Postal Address field. Inspect schema, client edit/create forms, display, export, and print requirements before deciding storage and migration.
5. [x] **Void action:** investigate why the selected receiving row remains visible with a “VOID · PAYMENT” marker after voiding. Establish whether this is the intended soft-void audit display or a failed write/state refresh. Preserve financial history and verify the recalculation path before changing it.
6. [x] **Client dropdown labels:** display client options as `PREFIX — CODE — NAME` (example: `X — 4 — A1 CLIENT`). Apply consistently to relevant selectors.
7. [x] **Amount entry:** format amounts as PKR currency and show a live amount-in-words rendering. Keep the stored value numeric and assess rounding/locale behavior.
8. [x] **Charge evidence image:** allow an optional image upload with a charge. Inspect available Supabase Storage configuration, access policies, file-size/type constraints, retention, and receipt/report display before implementing.
9. [x] **Charge modal context:** when opened from a specific client's ledger, show that client's prefix, code, and name in the modal title/context.
10. [x] **Folder number:** automatically assign a three-digit folder number (`001`, `002`, …) where appropriate. Sequence-backed local folder numbers remain authoritative. A separate optional Google Drive folder link is implemented in the case editor; OAuth/API credentials still need to be configured in the correct Brandex Cloud project.
11. [x] **Saved stage rates:** investigate why the charge amount does not populate from saved client stage rates. Trace rate loading, selected client/stage changes, and save validation.
12. [x] **Ledger refresh:** add a refresh control and fix stale entries after posting. Prefer correcting the data reload/state invalidation path so entries update automatically; a manual refresh can remain a recovery option.
13. [x] **Entry image thumbnail:** show an uploaded evidence-image thumbnail after the date in ledger rows, with a usable full-size view and appropriate authorization.
14. [x] **Ledger section caption:** remove the “amounts in PKR” caption where annotated.
15. [x] **Charge stage options:** show only the next valid forward stage(s), based on recorded stage completion and the case's actual starting stage. The selected example had Stages 1–3 charged/completed while Stage 4 was selected. Reconcile with the confirmed later-stage-start and forward-only rules; do not assume all cases begin at Stage 1.
16. [x] **Trademark Number naming/context:** use the full label “Trademark Number” instead of “TM” throughout user-facing UI. In the charge match summary, put the client identity (prefix, code, name) and folder in boxed columns immediately after Trademark Number. Review responsive layouts and exports too.
17. [x] **Completed cases:** automatically show a Completed label once the case reaches Stage 4 and all charged stages are cleared. A manual ribbon marker was removed per the user's later instruction.
18. [x] **Ledger entry classes:** add/display a class column and use distinct colors for class values. Define where the class is entered, stored, filtered, exported, and printed; coordinate with the separate workflow request for classes 1–45.

## Workflow and relationship issues (user-confirmed, implemented on branch)

- [x] Client-specific ledger hides the client selector in charge/receiving dialogs.
- [x] Class 1–45 is associated with the case/application; this is the implementation assumption for preview review.
- [x] Financial stage progression is forward-only from its actual start; CMS legal workflow remains a separate concern.
- [x] Case stage summaries expose charge/payment totals and open matching case+stage ledger entries. Linked receipts identify their charge; stage allocations without direct links are labeled explicitly.

## Latest browser comments (2026-11-01)

- [x] Ledger title now shows only series and client code; client name and “CLIENT LEDGER” were removed from that title.
- [x] Case stage badges now show only `STAGE N CLEARED/DUE`, without payment totals.
- [x] Void action now checks the soft-void write, refreshes data, and reports the actual outcome. A voided row intentionally remains visible as audit history. Production RLS was inspected and allows authenticated staff updates; no production payment rows were changed.
- [ ] Class edits remain dependent on migration 007. The current production schema has no `cases.class_no`; the UI now explains the missing migration and avoids partial case updates when a class is selected.
- [x] Removed the manual ribbon option. Completion is derived automatically from Stage 4 plus cleared charged stages.
- [x] Added optional Drive folder picker integration and storage field to migration 007. OAuth client, restricted API key, project number, and authorized origins remain to be configured in a Brandex Cloud project. The currently open Google Cloud project is labeled “DriveMCP 50738”; it was not changed because it may belong to another integration.
- [ ] Evidence upload depends on migration 007 creating the private `ledger-evidence` bucket and policies. Production currently has no bucket; no production migration was applied.

## Review and release steps

1. [x] Inspect live schema/constraints, record relationships, and storage setup.
2. [x] Diagnose duplicate codes, void history, saved rates, and refresh behavior.
3. [x] Prepare app changes and additive migration proposal; class is case-level and ribbon is independent.
4. [x] Prepare and push scoped branch and separate migration proposal; migration not applied.
5. [ ] Review the new Vercel preview without test writes. The preview shares Production Supabase credentials; an isolated database is needed to review migration-dependent behavior before production promotion.
6. [ ] Set up Google Picker API, browser OAuth client, and referrer-restricted API key in the correct Brandex Google Cloud project; populate `google-drive-config.js` after credentials are created.
7. [ ] Apply migration 007 to an isolated preview database and verify class, Drive folder link, evidence bucket/upload, folder sequence, and stage gate there. The connected Supabase plan does not support branching; do not use the production database for preview writes or apply this migration without separate approval.
8. [ ] Confirm final preview, then request explicit user approval before merging/promoting to production.

## Not included

The feature branch includes the latest title, stage-status, void-verification, and automatic completion updates. The voided ledger row remains visible as a soft-void audit record by design. Application code is committed separately from production schema changes; migration 007 has not been applied to any database. Google OAuth credentials and an isolated preview database remain outstanding. Confirm Vercel preview environment mapping before entering test transactions.
