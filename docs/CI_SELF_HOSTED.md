# Jimvio CI — Production Self-Hosted Runner Infrastructure

JimvioHQ Free-plan **GitHub-hosted Actions minutes are exhausted / billing-blocked**.
All workflows default to a **self-hosted** runner (`self-hosted`, `linux`, `x64`) so quality gates do **not** consume hosted minutes.

Vercel, Supabase, LiveKit, Resend, Cloudinary, Stripe, and Flutterwave deployments are **unchanged**.

---

## Architecture

| Layer | Responsibility |
|---|---|
| **Local** `npm run ci:verify` | Full quality gate on any developer machine (no GitHub minutes) |
| **Self-hosted runner** | Executes GitHub workflow jobs for CI / Release / Supabase / CodeQL / Preview |
| **systemd** | Keeps the runner alive across reboot/crash |
| **Health timer** | Every 5 minutes: disk/memory/GitHub/Node/Supabase checks + auto-recover |

---

## Quick start — local validation (no runner required)

From the app root (`jimvio/`):

```bash
npm run ci:verify
```

Fail-closed pipeline:

1. `npm ci`
2. `npm run lint`
3. `npm run type-check`
4. `npm run test`
5. `npm run build`
6. `npm run ci:prepush`
7. Workflow structure check
8. Secrets check (required)
9. `supabase migration list --linked`
10. `supabase migration up --linked`
11. Runner health (informational on laptops)
12. Writes `.next/ci-verify-report.json`

Strict infrastructure mode (also fail if runner unhealthy / secrets incomplete):

```bash
CI_VERIFY_STRICT_INFRA=1 npm run ci:verify
```

---

## Provision a production runner host

### Supported OS

- Ubuntu 22.04+
- Ubuntu 24.04+
- Debian 12+

### 1. Install host dependencies (root)

```bash
cd /path/to/jimvio
sudo bash scripts/ci/runner/install-deps.sh
# Optional Docker:
# sudo INSTALL_DOCKER=1 bash scripts/ci/runner/install-deps.sh
```

Installs / verifies: Node.js 22+, npm, Git, Python 3, build-essential, curl, unzip, jq, Supabase CLI.

### 2. Create a dedicated user (recommended)

```bash
sudo useradd --create-home --shell /bin/bash jimvio-runner
sudo usermod -aG docker jimvio-runner   # only if Docker installed
```

Clone or sync the repo to a path readable by that user (e.g. `/opt/jimvio`).

### 3. Register the GitHub runner

1. GitHub → **JimvioHQ/jimvio** → **Settings → Actions → Runners → New self-hosted runner**
2. Copy the **registration token**
3. As the runner user:

```bash
sudo -u jimvio-runner -H bash
cd /opt/jimvio
bash scripts/ci/runner/install-runner.sh \
  --token <REGISTRATION_TOKEN> \
  --dir /home/jimvio-runner/actions-runner \
  --name jimvio-ci-1 \
  --labels self-hosted,linux,x64
```

### 4. Install systemd service + health timer (root)

```bash
sudo bash scripts/ci/runner/install-service.sh \
  --runner-dir /home/jimvio-runner/actions-runner \
  --user jimvio-runner
```

This enables:

- `jimvio-actions-runner.service` — auto-start, restart on failure, structured logs
- `jimvio-runner-health.timer` — health + recovery every 5 minutes

### 5. Verify

```bash
systemctl status jimvio-actions-runner.service
sudo bash scripts/ci/runner/health-check.sh
# or from repo:
npm run ci:runner:health
```

In GitHub → Settings → Actions → Runners the machine should show **Idle**.

---

## Scripts reference

| Script | Purpose |
|---|---|
| `scripts/ci/runner/install-deps.sh` | OS packages + Node 22 + Supabase CLI |
| `scripts/ci/runner/install-runner.sh` | Download + configure Actions runner |
| `scripts/ci/runner/install-service.sh` | systemd units + timer |
| `scripts/ci/runner/health-check.sh` | Health JSONL + optional `--auto-recover` |
| `scripts/ci/runner/recover.sh` | Restart service / actionable diagnostics |
| `scripts/ci/runner/update-runner.sh` | Update runner binaries |
| `scripts/ci/verify-local.mjs` | `npm run ci:verify` |
| `scripts/ci/verify-secrets.mjs` | `npm run ci:secrets` |

Logs (default): `/var/log/jimvio-ci/runner.log`, `runner.err.log`, `health.jsonl`, `recover.log`

---

## Workflow runner selection

Every workflow uses:

```yaml
runs-on: ${{ vars.USE_GITHUB_HOSTED_RUNNERS == 'true' && fromJSON('["ubuntu-latest"]') || fromJSON('["self-hosted", "linux", "x64"]') }}
```

| Mode | How |
|---|---|
| **Default (self-hosted)** | No variable set |
| **GitHub-hosted** | Repo variable `USE_GITHUB_HOSTED_RUNNERS=true` (needs available hosted minutes) |

### Heavy job triggers

| Workflow | When it runs |
|---|---|
| **CI** | push / PR to `main`, `workflow_dispatch` |
| **Supabase** | push / PR to `main`, `workflow_dispatch` |
| **Release** | push to `main`, `workflow_dispatch` |
| **CodeQL** | `workflow_dispatch`, weekly schedule, or push when `ENABLE_CODEQL_ON_PUSH=true` |
| **Preview** | `workflow_dispatch`, PR label `preview`, or `ENABLE_PREVIEW_CI=true` |

If no self-hosted runner is online, jobs **queue** (they do not fall back to hosted minutes unless `USE_GITHUB_HOSTED_RUNNERS=true`).

---

## Secrets

### Required (CI / release / migrations)

| Secret | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | CLI link / migration list |
| `SUPABASE_PROJECT_REF` | Project ref |
| `VERCEL_TOKEN` | CLI deploys |
| `VERCEL_ORG_ID` | Vercel team |
| `VERCEL_PROJECT_ID` | Vercel project |

### Optional / product

| Secret | Purpose |
|---|---|
| `SUPABASE_DB_PASSWORD` | Some linked DB ops |
| `NEXT_PUBLIC_APP_URL` | Post-deploy health |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Live platform |
| `RESEND_API_KEY` | Email |

Validate without printing values:

```bash
npm run ci:secrets
npm run ci:secrets -- --github    # also inventory gh secret names
npm run ci:secrets -- --strict    # fail if optionals missing
```

Runtime product secrets should live on **Vercel / Supabase**, not necessarily on the runner host. CI build steps use placeholders.

---

## Update

```bash
# Runner binaries
sudo bash scripts/ci/runner/update-runner.sh \
  --runner-dir /home/jimvio-runner/actions-runner \
  --with-service-stop

# Host packages
sudo bash scripts/ci/runner/install-deps.sh
sudo systemctl restart jimvio-actions-runner.service
```

## Rollback

1. Stop service: `sudo systemctl stop jimvio-actions-runner.service`
2. Restore previous runner tarball from backup (see below) **or** re-download a known Actions runner version
3. Keep `.runner` / `.credentials*` files
4. `sudo systemctl start jimvio-actions-runner.service`

## Runner replacement

1. In GitHub UI, remove the old runner
2. On the new host: `install-deps.sh` → `install-runner.sh --token …` → `install-service.sh`
3. Confirm Idle in GitHub

## Backup

Back up (private, encrypted):

- `$RUNNER_DIR/.runner`
- `$RUNNER_DIR/.credentials`
- `$RUNNER_DIR/.credentials_rsaparams`
- systemd unit files under `/etc/systemd/system/jimvio-*.service`
- `/var/log/jimvio-ci/` (optional)

Do **not** commit credentials to git.

## Security best practices

- Dedicated non-root user (`jimvio-runner`)
- Least privilege systemd (`NoNewPrivileges`, `ProtectSystem=full`)
- Never store production Stripe/LiveKit secrets in the runner unless required for smoke tests
- Rotate GitHub registration tokens; treat `.credentials` as secrets
- Keep Node / OS patched (`install-deps.sh` on a schedule)
- Prefer org/repo secrets over writing secrets into shell profiles

## Disaster recovery

| Failure | Action |
|---|---|
| Host lost | Provision new VM → install-deps → register new runner → install-service |
| Service crash loop | `journalctl -u jimvio-actions-runner -e`, check disk/memory, `recover.sh` |
| GitHub unreachable | Fix network/DNS; health check will keep failing until API responds |
| Runner removed in UI | Re-run `install-runner.sh` with a fresh token |
| Hosted minutes still billed | Ensure `USE_GITHUB_HOSTED_RUNNERS` is **not** `true` |

## Troubleshooting

### Jobs stuck “Queued”

No online runner with labels `self-hosted,linux,x64`. Start the service and confirm Idle.

### Health check fails on a laptop

Expected — laptops are not the runner. Use `npm run ci:verify` for quality gates; provision a server for GitHub job execution.

### `npm ci` OOM on runner

Increase RAM / swap; ensure `NODE_OPTIONS=--max-old-space-size=8192` in workflows (already set for heavy steps).

### Migration check fails missing secrets

Set `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` as GitHub secrets (or run `npm run ci:verify` on a linked machine).

---

## Performance

Workflows already use `actions/setup-node` with `cache: npm`. On self-hosted runners, retain `~/.npm` between jobs for faster `npm ci`. Do not delete `_work` caches unnecessarily.

---

## Manual steps (cannot be done from the repo alone)

1. Provision a Linux VM / bare-metal host  
2. Create the GitHub runner registration token in the UI  
3. Run `install-deps.sh` / `install-runner.sh` / `install-service.sh` on that host  
4. Add required GitHub Actions secrets in the repo/org settings  
5. Confirm the runner shows **Idle** and re-run failed workflow runs  

Until step 3–5 are done, GitHub checks will **queue** on self-hosted labels (they will not spend hosted minutes).
