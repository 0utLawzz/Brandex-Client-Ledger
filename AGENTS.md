# Repository working rules

## Product boundary

- Brandex Client Ledger is the source of truth for client financial records: charges, receivings, receipts, balances, and Ledger-side client/case identifiers.
- Brandex Database CMS owns the fuller trademark case record and workflow. A CMS record may refer to a Ledger case; it must not create a second financial ledger.
- Case creation begins in the Ledger with the minimum identifying and financial details; the intended next action is to open/enrich that case in the CMS. The cross-app handoff is not yet implemented.
- Cases may first arrive at a later stage. The business rule is forward progression from the actual starting stage, not a requirement that every case have Stage 1. Current UI/database behavior must be audited against this rule before workflow changes.

## Change and deployment rules

- Every code change must be committed and pushed to GitHub.
- Use a branch and Vercel preview for review. Production merge/promotion requires the user's explicit approval of the preview.
- Do not apply database migrations to production as an incidental part of an application change. Inspect the target migration history and get approval for production data/schema changes.
- Preserve financial data. Prefer additive migrations and soft voids. Never rewrite applied migration history.
- Inspect callers, script load order, schema dependencies, and connected CMS behavior before editing or removing a function.
- Do not run or add tests unless requested; if a change is verified in another way, describe exactly what was inspected.
- Keep this file and `docs/PROJECT_MEMORY.md` authoritative for this repository. Update them when the user confirms a product decision.

## Current implementation cautions

- This is a static browser app; `.env.example` does not imply a Vite build pipeline.
- Several scripts override earlier functions. Check `index.html` order and runtime callers before changing them.
- Some receipt/stage rules are currently enforced in browser code. Do not treat UI-only gates as database guarantees.
- CMS integration is not complete. Do not claim automatic case handoff or synchronized workflow status.
