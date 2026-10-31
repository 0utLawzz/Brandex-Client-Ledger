# Post-release handover: annotations and workflow review

**Prepared:** 2026-11-01
**Repository:** Brandex Client Ledger
**Production baseline:** `v0.3.0` (`main`, PR #7; production at `brandex-client-ledger.vercel.app`)
**Status:** pending review; no app or database implementation was made for this handover.

## Scope and instructions

The user asked to record the pending work only. Do not treat the browser annotations below as permission to implement them in this handover. Review the relationships, callers, database behavior, and print/receipt paths before taking up any item. Follow the repository's preview-first and commit/push rules in `AGENTS.md`; production changes require preview approval.

## Browser annotations still pending

1. **Edit Client modal title:** make “EDIT CLIENT” white against its dark header.
2. **Series selector:** add an option to create/manage series from the client form. Display only the series name (for example, `X-Series`), without the description. Preserve the existing association and avoid orphaning clients when series are edited or removed.
3. **Client code uniqueness:** allow the same client code in different series (for example, `X / 001` and `A / 001`) if that is the intended identity model. The current duplicate-entry error suggests uniqueness may be global. Inspect the deployed schema/indexes and all lookup/display paths before deciding whether the composite key is series plus code; do not change constraints without checking existing duplicates and dependent references.
4. **Client address:** add a Mailing/Postal Address field. Inspect schema, client edit/create forms, display, export, and print requirements before deciding storage and migration.
5. **Void action:** investigate why the selected receiving row remains visible with a “VOID · PAYMENT” marker after voiding. Establish whether this is the intended soft-void audit display or a failed write/state refresh. Preserve financial history and verify the recalculation path before changing it.
6. **Client dropdown labels:** display client options as `PREFIX — CODE — NAME` (example: `X — 4 — A1 CLIENT`). Apply consistently to relevant selectors.
7. **Amount entry:** format amounts as PKR currency and show a live amount-in-words rendering. Keep the stored value numeric and assess rounding/locale behavior.
8. **Charge evidence image:** allow an optional image upload with a charge. Inspect available Supabase Storage configuration, access policies, file-size/type constraints, retention, and receipt/report display before implementing.
9. **Charge modal context:** when opened from a specific client's ledger, show that client's prefix, code, and name in the modal title/context.
10. **Folder number:** automatically assign a three-digit folder number (`001`, `002`, …) where appropriate. Investigate concurrency-safe allocation and uniqueness before choosing where the sequence is generated. The user also asked whether a Drive folder picker is possible; assess Google Drive authorization/API integration and whether a local folder number should remain authoritative.
11. **Saved stage rates:** investigate why the charge amount does not populate from saved client stage rates. Trace rate loading, selected client/stage changes, and save validation.
12. **Ledger refresh:** add a refresh control and fix stale entries after posting. Prefer correcting the data reload/state invalidation path so entries update automatically; a manual refresh can remain a recovery option.
13. **Entry image thumbnail:** show an uploaded evidence-image thumbnail after the date in ledger rows, with a usable full-size view and appropriate authorization.
14. **Ledger section caption:** remove the “amounts in PKR” caption where annotated.
15. **Charge stage options:** show only the next valid forward stage(s), based on recorded stage completion and the case's actual starting stage. The selected example had Stages 1–3 charged/completed while Stage 4 was selected. Reconcile with the confirmed later-stage-start and forward-only rules; do not assume all cases begin at Stage 1.
16. **Trademark Number naming/context:** use the full label “Trademark Number” instead of “TM” throughout user-facing UI. In the charge match summary, put the client identity (prefix, code, name) and folder in boxed columns immediately after Trademark Number. Review responsive layouts and exports too.
17. **Completed cases and ribbon:** when all four stages are cleared, identify the case as completed. Add an optional 🎀/🎗 ribbon marker and distinguish marked cases in ledger display. Clarify/define whether the ribbon is a completion decoration or a separate user-controlled case attribute; do not conflate it with payment status.
18. **Ledger entry classes:** add/display a class column and use distinct colors for class values. Define where the class is entered, stored, filtered, exported, and printed; coordinate with the separate workflow request for classes 1–45.

## Workflow and relationship issues (user-confirmed)

- A client-specific ledger view should not offer a selector to switch to another client. Determine which global actions need a client selector and scope the restriction to the individual ledger context.
- Add a class selector containing numeric values **1–45**. Confirm the intended entity and relationship (case, application, or ledger entry) before schema/UI changes; the annotation also asks for a class display column.
- Case workflow must progress forward from its actual starting stage and must not move backward. Later-stage starts remain valid. Keep workflow state distinct from whether a financial stage charge/payment is posted or cleared unless the data model proves they are the same concept.
- Completed stages need a clear relationship to their underlying charge and receiving records. The current display does not make this relationship evident enough to prevent or correct duplicate stage payments. Trace case/stage identity, charge-to-receiving links, status calculation, void behavior, and CMS consumption before proposing enforcement.

## Suggested review order (not authorization to implement)

1. Inspect live and repository schema/constraints plus record relationships for series/client identity, classes, folders, stage completion, voids, and upload storage.
2. Reproduce and diagnose the duplicate-code, void, saved-rate, and stale-refresh issues before changing behavior.
3. Agree which annotations are presentation-only and which require schema or product decisions. In particular, settle the class owner and whether the ribbon is independent of completion.
4. Prepare one scoped branch and preview; document any migration separately and verify the target's applied migration history. Preserve financial/audit rows.
5. Obtain review of the preview before production deployment, then commit/push and update the release record.

## Not included

This handover does not claim that any listed item is fixed. No application code, Supabase schema/data, Vercel deployment, or production release was changed for these pending requests.
