# Security Policy

## Supported versions

The latest commit on the default branch (`main`) is the primary supported version.

## Reporting a vulnerability

Please **do not** publish sensitive vulnerability details in a public GitHub issue.

Instead, report security concerns privately to the repository maintainer:

- Prefer GitHub’s private vulnerability reporting (if enabled on the repository), or
- Contact the owner privately via the profile contact methods.

Include when possible:

- A clear description of the issue
- Steps to reproduce
- Affected files or functionality
- Potential impact
- A suggested fix, if known

Please allow reasonable time for investigation and remediation before any public disclosure.

## Notes specific to this project

- The current RLS policies are intentionally open for development. Production deployments should replace them with authenticated staff policies before exposing the app more widely.
- Never commit real Supabase service-role keys or production client data.
- Ledger data may contain sensitive client and payment information — treat exports and screenshots accordingly.
