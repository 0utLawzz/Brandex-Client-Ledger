# Contributing to Brandex Client Ledger

Thank you for helping improve Brandex Client Ledger.

## Development principles

- Keep changes focused and reviewable.
- Do not mix unrelated features in one change.
- Preserve existing data compatibility unless a migration is explicitly planned and documented.
- Avoid destructive changes to user ledger data (prefer soft void / additive columns).
- Follow the existing Brandex Neo-Brutalism design system (theme is locked).
- Test UI changes in a desktop browser and a mobile-sized viewport.
- Prefer small, descriptive commits.

## Pull requests

A pull request should include:

1. A clear description of the problem and the solution.
2. The exact files changed.
3. Manual test steps (happy path + at least one edge case).
4. Any compatibility or data-storage impact (new migration? RLS change?).
5. Screenshots for significant UI changes.

## Commit messages

Prefer short, conventional-style messages:

- `feat: add configurable stages`
- `fix: exclude voided entries from outstanding`
- `style: tighten ledger table spacing`
- `docs: update setup instructions`
- `db: add migration 004 for …`

## Scope control

Feature work is intentionally incremental. If a change request covers several independent features, split them into separate PRs whenever practical.

## Database changes

- All schema changes must be additive migrations under `supabase/migrations/`.
- Do not edit already-applied migration files; add a new numbered migration.
- Update `CHANGELOG.md` and the schema section of `README.md` when the schema changes.

## Code of conduct

This project follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). By participating you agree to uphold it.
