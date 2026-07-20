# Security — Release Pipeline

## Automated scanning

| Control | Location | Notes |
|---------|----------|-------|
| CodeQL | `.github/workflows/codeql.yml` | javascript-typescript; weekly + PR/push |
| npm audit | `.github/workflows/ci.yml` | critical = fail; high = report |
| Dependabot | `.github/dependabot.yml` | npm + GitHub Actions weekly |
| Gitleaks | CI job | secret scanning (non-blocking if action unavailable) |
| Dependency review | CI (PRs) | GitHub Dependency Review Action |

## Secrets

- Never commit `.env`, `.env.local`, or credential files
- Production secrets live in Vercel + GitHub Actions secrets
- `.env.example` documents required keys without values

## Branch protection

See [branch-protection.md](./branch-protection.md). Require CI + CodeQL status checks before merge to `main`.

## Reporting

Security findings → triage in GitHub Security tab; SEV1 follow [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md).
