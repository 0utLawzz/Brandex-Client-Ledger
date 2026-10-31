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
10. [x] **Folder number:** automatically assign a three-digit folder number (`001`, `002`, …) where appropriate. Investigate concurrency-safe allocation and uniqueness before choosing where the sequence is generated. The user also asked whether a Drive folder picker needs Google OAuth/API configuration; it is not implemented. Sequence-backed local folder numbers remain authoritative.
11. [x] **Saved stage rates:** investigate why the charge amount does not populate from saved client stage rates. Trace rate loading, selected client/stage changes, and save validation.
12. [x] **Ledger refresh:** add a refresh control and fix stale entries after posting. Prefer correcting the data reload/state invalidation path so entries update automatically; a manual refresh can remain a recovery option.
13. [x] **Entry image thumbnail:** show an uploaded evidence-image thumbnail after the date in ledger rows, with a usable full-size view and appropriate authorization.
14. [x] **Ledger section caption:** remove the “amounts in PKR” caption where annotated.
15. [x] **Charge stage options:** show only the next valid forward stage(s), based on recorded stage completion and the case's actual starting stage. The selected example had Stages 1–3 charged/completed while Stage 4 was selected. Reconcile with the confirmed later-stage-start and forward-only rules; do not assume all cases begin at Stage 1.
16. [x] **Trademark Number naming/context:** use the full label “Trademark Number” instead of “TM” throughout user-facing UI. In the charge match summary, put the client identity (prefix, code, name) and folder in boxed columns immediately after Trademark Number. Review responsive layouts and exports too.
17. [x] **Completed cases and ribbon:** when all four stages are cleared, identify the case as completed. Add an optional 🎀/🎗 ribbon marker and distinguish marked cases in ledger display. The ribbon is an independent user-controlled case attribute, separate from payment status.
18. [x] **Ledger entry classes:** add/display a class column and use distinct colors for class values. Define where the class is entered, stored, filtered, exported, and printed; coordinate with the separate workflow request for classes 1–45.

## Workflow and relationship issues (user-confirmed, implemented on branch)

- [x] Client-specific ledger hides the client selector in charge/receiving dialogs.
- [x] Class 1–45 is associated with the case/application; this is the implementation assumption for preview review.
- [x] Financial stage progression is forward-only from its actual start; CMS legal workflow remains a separate concern.
- [x] Case stage summaries expose charge/payment totals and open matching case+stage ledger entries. Linked receipts identify their charge; stage allocations without direct links are labeled explicitly.

## Review and release steps

1. [x] Inspect live schema/constraints, record relationships, and storage setup.
2. [x] Diagnose duplicate codes, void history, saved rates, and refresh behavior.
3. [x] Prepare app changes and additive migration proposal; class is case-level and ribbon is independent.
4. [x] Prepare and push scoped branch and separate migration proposal; migration not applied.
5. [ ] Review the protected Vercel preview (READY) without test writes. The preview shares Production Supabase credentials; an isolated database is needed to review migration-dependent behavior before production promotion.

## Not included

Application code is prepared on the feature branch; no Supabase schema/data or production release has changed. Google Drive picker setup and preview DB migration/review remain outstanding. Confirm Vercel preview environment mapping before entering test transactions.
