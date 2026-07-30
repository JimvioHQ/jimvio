# Jimvio CI — Self-Hosted Runners (GitHub Free–friendly)

GitHub-hosted Actions minutes on the JimvioHQ Free plan are exhausted / billing-blocked.
Jimvio workflows default to **self-hosted** runners so validation does **not** consume hosted minutes.

Vercel, Supabase, LiveKit, Resend, Cloudinary, Stripe, and Flutterwave deployments are unchanged.

---

## Quick start

### 1. Local verification (no GitHub runners)

From the app root (`jimvio/`):

```bash
npm run ci:verify
```

This fail-closed pipeline runs:

```bash
npm ci
npm run lint
npm run type-check
npm run test
npm run build
npm run ci:prepush
supabase migration list --linked
supabase migration up --linked
```

### 2. Register a self-hosted runner

1. Open **Repo → Settings → Actions → Runners → New self-hosted runner**.
2. Choose **Linux** / **x64**.
3. Follow GitHub’s download + configure commands (they include a one-time token).

Recommended labels (must match workflows):

- `self-hosted`
- `linux`
- `x64`

Configure example:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# curl -o actions-runner-linux-x64-VERSION.tar.gz -L https://github.com/actions/runner/releases/download/...
# tar xzf ./actions-runner-linux-x64-VERSION.tar.gz
./config.sh --url https://github.com/JimvioHQ/jimvio --token <TOKEN_FROM_GITHUB_UI> \
  --labels self-hosted,linux,x64 \
  --name jimvio-ci-1
```

### 3. Required packages on the runner host

| Package | Purpose |
|---|---|
| Node.js **22+** (see `.nvmrc`) | `npm ci`, lint, type-check, build |
| npm **10+** | Installs |
| Git | Checkout |
| Python 3 | Supabase migration JSON check |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Migration list / up |
| Optional: Docker | Local Supabase stack (not required for linked remote checks) |

Install Node via nvm or nodesource; install Supabase CLI via npm or official install script.

### 4. Start the runner

Foreground:

```bash
cd ~/actions-runner
./run.sh
```

Install as a service (auto-start on boot):

```bash
cd ~/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

Update the runner:

```bash
cd ~/actions-runner
sudo ./svc.sh stop
# download newer runner package per GitHub UI instructions, or:
./run.sh  # prompts to update when outdated
sudo ./svc.sh start
```

---

## Workflow runner selection

All Jimvio workflows use:

```yaml
runs-on: ${{ vars.USE_GITHUB_HOSTED_RUNNERS == 'true' && fromJSON('["ubuntu-latest"]') || fromJSON('["self-hosted","linux","x64"]') }}
```

| Mode | How |
|---|---|
| **Default (self-hosted)** | Do nothing — no hosted minutes |
| **GitHub-hosted** | Set repository variable `USE_GITHUB_HOSTED_RUNNERS=true` (requires available Actions minutes / billing) |

---

## When heavy jobs run

| Workflow | Default triggers | Notes |
|---|---|---|
| **CI** | `push` / `pull_request` to `main` | Full gate on self-hosted |
| **Supabase migration checks** | `push` / `pull_request` to `main` | Needs Supabase secrets |
| **Release** | `push` to `main` + `workflow_dispatch` | Gates + optional Vercel prod deploy |
| **CodeQL** | `workflow_dispatch`, weekly `schedule`, optional push when `ENABLE_CODEQL_ON_PUSH=true` | Not on every PR by default |
| **Preview** | `workflow_dispatch`, or PR with label `preview`, or `ENABLE_PREVIEW_CI=true` | Avoids expensive preview builds on every PR |

---

## Required secrets / variables

### Repository variables

| Variable | Purpose |
|---|---|
| `USE_GITHUB_HOSTED_RUNNERS` | `true` → use `ubuntu-latest` |
| `ENABLE_CODEQL_ON_PUSH` | `true` → CodeQL also on `main` push |
| `ENABLE_PREVIEW_CI` | `true` → Preview job on every PR |

### Secrets (unchanged product deploy)

| Secret | Used by |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Migration workflow |
| `SUPABASE_PROJECT_REF` | Migration workflow |
| `SUPABASE_DB_PASSWORD` | Optional linked DB ops |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Release / Preview CLI |
| `NEXT_PUBLIC_APP_URL` | Post-deploy health |

Runtime product secrets (LiveKit, Resend, Stripe, etc.) stay on **Vercel / Supabase** — not required on the runner for CI gates (CI uses build placeholders).

---

## Troubleshooting

### Jobs stuck “Queued”

No online runner with labels `self-hosted,linux,x64`. Start `./run.sh` or the systemd service and confirm the runner shows **Idle** in GitHub.

### “Listening for jobs” but workflow still uses hosted / fails billing

Confirm `USE_GITHUB_HOSTED_RUNNERS` is **not** set to `true`. Hosted runners still hit the Free-plan minute / billing wall.

### `npm ci` fails on runner

Use Node 22+ matching `.nvmrc`. Clear `node_modules` and retry. Ensure enough disk for `npm ci` + Next build.

### Supabase migration step fails

- Install Supabase CLI on the runner PATH.
- Set `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`.
- Or run locally: `npm run ci:verify` after `supabase link`.

### CodeQL / Preview not running on PR

Intentional. Use **Actions → workflow_dispatch**, add PR label `preview`, or set the enable variables above.

### Permission errors writing `.next`

Run the runner as a user with write access to the work directory GitHub Actions uses (usually `_work` under the runner folder).

---

## Validation without GitHub

```bash
npm run ci:verify
```

If that passes, quality gates are satisfied without any GitHub-hosted runner.
