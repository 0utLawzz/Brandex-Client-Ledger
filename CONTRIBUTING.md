# Contributing to Brandex Client Ledger

## Product and data rules

- Read [`AGENTS.md`](AGENTS.md) and [`docs/PROJECT_MEMORY.md`](docs/PROJECT_MEMORY.md) before changing behavior.
- Ledger owns charges, receipts, payments, balances, and its client/case identifiers. CMS owns full case details and legal workflow.
- Trace the complete create → store → display → consume path, including script wrappers, SQL functions, migrations, and CMS callers, before changing a connected flow.
- Preserve financial history. Prefer additive SQL migrations and soft voids. Never edit a migration already applied to an environment.
- Avoid dead or duplicate functions; verify every changed function's callers and later-script overrides.

## Branch, preview, and release

1. Make a focused branch from the current `main`.
2. Commit every code change and push the branch to GitHub.
3. Review the Vercel preview before merge. Production merge/promotion requires the user's explicit approval of that preview.
4. Handle database migrations separately: compare applied migration history and target environment first. Do not apply production SQL without explicit approval.
5. After an approved release, update `CHANGELOG.md`, version/tag, and this status as applicable.

## Review notes

Pull requests should describe the user-visible change, the data/schema impact, affected callers and connected systems, and how the change was verified. Add screenshots for meaningful interface changes. Keep unresolved assumptions visible rather than silently choosing a product rule.

## Commit messages

Use a short, clear prefix such as `feat:`, `fix:`, `style:`, `docs:`, or `db:`.

## Code of conduct

This project follows [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
