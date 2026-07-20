# Versioning — Jimvio

## Scheme

Semantic Versioning: **MAJOR.MINOR.PATCH** → tags `vX.Y.Z`

| Bump | When |
|------|------|
| **MAJOR** (`v2.0.0`) | Breaking API/schema or incompatible product changes |
| **MINOR** (`v1.1.0`) | Backward-compatible features (Creator Economy, Growth, Ops) |
| **PATCH** (`v1.0.1`) | Fixes, hardening, docs, CI |

Current production baseline after public launch: start from **`v1.0.0`** (or next patch from existing tags).

## Automation

`release.yml` on successful production deploy:

1. Reads previous git tag (or starts at `v1.0.0`)
2. Auto-bumps **patch** by default
3. Prepends `CHANGELOG.md`
4. Creates annotated tag + GitHub Release notes

For minor/major: cut a PR titled `release: vX.Y.0` and create the tag manually, or extend the workflow with a `workflow_dispatch` input `bump=minor|major`.

## Commit messages (Conventional Commits)

Prefer:

- `feat:` → minor (when manually bumping)
- `fix:` → patch
- `feat!:` / `BREAKING CHANGE:` → major
- `chore(release):` → release commits only

## Artifacts

- `CHANGELOG.md` — human-readable history
- GitHub Releases — customer/engineering notes
- Vercel deployment URL + commit SHA in Actions summary
