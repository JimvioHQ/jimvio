# Jimvio CI — GitHub-Hosted Default, Self-Hosted Optional

Jimvio's repository is public. Standard GitHub-hosted `ubuntu-latest` runners are free and unlimited for public repositories, so the required CI, release, Supabase migration, CodeQL, and preview workflows use `ubuntu-latest` by default. This avoids indefinite queues when an optional self-hosted machine is offline.

The self-hosted runner scripts below remain available as an optional fallback for future private workloads or controlled infrastructure needs. They are not required for current production CI.

Vercel, Supabase, LiveKit, Resend, Cloudinary, Stripe, and Flutterwave deployment targets are unchanged.

---

## Commands (npm)

| Command | Purpose |
|---|---|
| `npm run ci:deploy` | **Production deploy orchestrator** (deps → register → systemd → health report) |
| `npm run ci:readiness` | Infra readiness report (does not invent Online/Idle) |
| `npm run ci:verify` | Full local quality gate (no GitHub minutes) |
| `npm run ci:bootstrap` | OS deps only (Ubuntu/Debian, root) |
| `npm run ci:runner:setup` | Interactive registration + systemd |
| `npm run ci:runner:test` | Connectivity / labels / pickup check |
| `npm run ci:runner:health` | Detailed health JSON |
| `npm run ci:runner:recover` | Safe restart + recovery matrix |
| `npm run ci:secrets` | Fail if required secrets missing locally |
| `npm run ci:secrets:guide` | Secret inventory + workflow mapping |
| `npm run ci:audit` | Full infra audit → `.next/ci-audit-report.json` |
| `npm run ci:status` | Compact dashboard |

---

## Optional self-hosted fallback

No self-hosted runner is required for the current public-repository workflows. Only provision one when a future job genuinely needs a persistent or private network environment. In that case, use a dedicated Linux server and a short-lived GitHub runner registration token from **Repository → Settings → Actions → Runners**.

---

## First deployment (production host)

```bash
# On the Linux host — clone the repo first
cd /opt/jimvio   # or your clone path

# A) Root: install Node 22+, Git, npm, Python, Supabase CLI, build tools
sudo npm run ci:deploy -- --bootstrap-only
# equivalent: sudo npm run ci:bootstrap

# B) Dedicated user (recommended)
sudo useradd --create-home --shell /bin/bash jimvio-runner || true
sudo chown -R jimvio-runner:jimvio-runner /opt/jimvio

# C) Create registration token in GitHub UI (expires quickly — do not commit)

# D) Runner user: interactive URL / name / labels / token → systemd → health report
sudo -u jimvio-runner -H bash -lc 'cd /opt/jimvio && npm run ci:deploy'

# E) Confirm Idle in GitHub UI, then:
sudo -u jimvio-runner -H bash -lc 'cd /opt/jimvio && npm run ci:runner:test && npm run ci:status'
```

Health report path: `.next/ci-deploy-health-report.json`

Only when that report (or GitHub UI) shows **Online/Idle** is deployment complete.

### Deploy flags

| Flag | Meaning |
|---|---|
| `--bootstrap-only` | Install host deps (root) |
| `--verify-only` | Health report only |
| `--skip-setup` | Assume already registered |

---

## Interactive configuration

`ci:deploy` / `ci:runner:setup` request only:

- GitHub repository URL  
- Runner name  
- Labels (must include `self-hosted`, `linux`, `x64`)  
- Registration token (hidden — **never printed or saved**)

---

## Local readiness (laptop / CI without a runner)

```bash
npm run ci:readiness
npm run ci:audit
npm run ci:status
npm run ci:secrets:guide
npm run ci:verify   # full quality gate when you need it
```

On macOS, `ci:deploy` exits with status **2** and writes a **blocked** health report — expected.

---

## Upgrades

```bash
sudo npm run ci:bootstrap
sudo bash scripts/ci/runner/update-runner.sh \
  --runner-dir /home/jimvio-runner/actions-runner \
  --with-service-stop
sudo systemctl restart jimvio-actions-runner.service
npm run ci:runner:test
```

## Replacing the runner

1. Remove the old runner in the GitHub UI  
2. New host: `ci:deploy -- --bootstrap-only` then `ci:deploy` with a **new** token  
3. Confirm Idle  

## Removing the runner

```bash
sudo systemctl stop jimvio-actions-runner.service
sudo systemctl disable jimvio-actions-runner.service
sudo systemctl disable jimvio-runner-health.timer
# As runner user, from the runner directory:
cd ~/actions-runner && ./config.sh remove --token <REMOVE_TOKEN>
# Remove token from: Settings → Actions → Runners → (runner) → Remove
sudo rm -rf /etc/systemd/system/jimvio-actions-runner.service \
            /etc/systemd/system/jimvio-runner-health.service \
            /etc/systemd/system/jimvio-runner-health.timer
sudo systemctl daemon-reload
```

## Rotating registration tokens

Registration tokens are **one-time** and short-lived. To re-register:

1. Stop service: `sudo systemctl stop jimvio-actions-runner.service`  
2. Remove old config: `cd ~/actions-runner && ./config.sh remove --token <TOKEN>` (or delete `.runner` only after UI remove)  
3. Create a **new** token in GitHub UI  
4. `npm run ci:runner:setup` (or `npm run ci:deploy`)  
5. Never commit tokens; never write them to files or shell history if avoidable  

## Recovering from failure

```bash
npm run ci:runner:recover
npm run ci:runner:test
npm run ci:status
```

| Problem | Root cause | Recovery | Verify |
|---|---|---|---|
| Service stopped | unit inactive | `sudo systemctl restart jimvio-actions-runner.service` | `ci:runner:test` |
| Disconnected | listener dead | `ci:runner:recover` | `ci:status` |
| Network down | no API HTTPS | fix DNS/firewall | `curl -fsS https://api.github.com/zen` |
| Invalid registration | missing `.runner` | new token + `ci:runner:setup` | `test -f ~/actions-runner/.runner` |

Automatic recovery restarts systemd **only when** the runner is already registered and GitHub is reachable.

---

## Secrets

```bash
npm run ci:secrets
npm run ci:secrets:guide
```

Required for Actions: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

The canonical Supabase project secret is `SUPABASE_PROJECT_REF`. Workflows do not read `SUPABASE_PROJECT_ID`.

---

## Workflow runner selection

```yaml
runs-on: ubuntu-latest
```

This is the default for all required public-repository workflows. Standard GitHub-hosted runners on public repositories are free and unlimited. Keep self-hosted runners only for jobs that explicitly need private network access or a persistent host.

---

## Security best practices

- Dedicated non-root user (`jimvio-runner`)  
- Never commit tokens, `.credentials*`, or `.runner`  
- Prefer GitHub/Vercel secrets over shell profiles  
- Keep OS/Node patched via periodic bootstrap  
- Prefer GitHub-hosted `ubuntu-latest` for public workflows; use self-hosted only when technically required  
- Restrict SSH to the runner host; least-privilege firewall  

---

## FAQ

**Q: Is the runner online after pushing these scripts?**  
A: **No.** You still need a Linux host and a GitHub registration token.

**Q: When is deployment “complete”?**  
A: Only when GitHub shows the runner **Online/Idle** (or `ci-deploy-health-report.json` has `status: "online_idle"`).

**Q: Do required checks need a self-hosted server?**  
A: No. The required public-repository workflows use `ubuntu-latest`, which GitHub currently provides free and unlimited for public repositories.

---

## Scripts reference

| Path | Role |
|---|---|
| `scripts/ci/deploy-runner.sh` | Production deploy orchestrator |
| `scripts/ci/readiness-report.mjs` | Readiness report |
| `scripts/ci/bootstrap.sh` | Host deps |
| `scripts/ci/runner/setup.sh` | Interactive register + service |
| `scripts/ci/runner/health-check.sh` | Health JSONL |
| `scripts/ci/runner/recover.sh` | Recovery matrix + safe restart |
| `scripts/ci/runner/test-connectivity.mjs` | Online/Idle checks |
