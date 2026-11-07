# UGC authenticated E2E — secrets setup

Authenticated tenant-isolation, payment sandbox, and admin verification E2E
are **fail-closed**. They never invent credentials and never use real customer
accounts. Guest production probes can run without these secrets.

## Required GitHub Actions secrets / vars

Create **disposable test-only** accounts in the staging (preferred) or a
dedicated sandbox project. Store Playwright storage states on the self-hosted
runner under `.auth/` (gitignored) or inject them as encrypted secrets that the
workflow writes to disk at job start.

| Secret / env | Purpose |
| --- | --- |
| `UGC_E2E_ALLOW=1` | Opt in to signed-in isolation tests |
| `UGC_E2E_BASE_URL` | Target origin (use preview/staging; avoid prod unless intentional) |
| `UGC_E2E_PRODUCTION_TARGET=1` | Required only if `UGC_E2E_BASE_URL` is a jimvio.com host |
| `UGC_E2E_USER_A_STORAGE` | Path to User A storage state (default `.auth/ugc-user-a.json`) |
| `UGC_E2E_USER_B_STORAGE` | Path to User B storage state (default `.auth/ugc-user-b.json`) |
| `UGC_E2E_ADMIN_STORAGE` | Path to admin storage state (default `.auth/ugc-admin.json`) |
| `UGC_E2E_MUTATE=1` | Opt in to campaign create/edit/funding mutations |
| `UGC_E2E_ADMIN=1` | Opt in to Admin Verification Center flows |
| `UGC_E2E_PAYMENT_SANDBOX=1` | Opt in to wallet / Flutterwave / MoMo sandbox |
| `UGC_E2E_SANDBOX_CONFIRMED=1` | Confirms only sandbox keys are configured (no live charges) |
| `UGC_E2E_PROBE_PRODUCTION=1` | Guest probes against `https://www.jimvio.com` |

## Storage-state files (never commit)

| File | Identity |
| --- | --- |
| `.auth/ugc-user-a.json` | Brand / User A (owns campaigns for isolation A→B deny) |
| `.auth/ugc-user-b.json` | Brand / User B (separate tenant) |
| `.auth/ugc-admin.json` | Platform admin with Verification Center access |

Generate with Playwright:

```bash
npx playwright codegen --save-storage=.auth/ugc-user-a.json "$UGC_E2E_BASE_URL/login"
```

Do the same for User B and Admin. Confirm User A and User B are **not**
members of each other's brands.

## Payment sandbox keys (app env, not repo)

Only configure legitimate sandbox credentials:

- Flutterwave **test** secret / public keys
- Supported mobile-money sandbox credentials
- Wallet test rails if used

Never set live payment keys when `UGC_E2E_PAYMENT_SANDBOX=1`.

## Suggested CI job gates

1. **Isolation (read-only):** `UGC_E2E_ALLOW=1` + User A/B storage; leave mutate/payment unset.
2. **Mutations:** add `UGC_E2E_MUTATE=1` on staging only.
3. **Admin:** add Admin storage + `UGC_E2E_ADMIN=1`.
4. **Payments:** add `UGC_E2E_PAYMENT_SANDBOX=1` and `UGC_E2E_SANDBOX_CONFIRMED=1` with sandbox keys only.

## Exact blocker when missing

Without the storage states and opt-in flags above, `e2e/ugc-acceptance.spec.ts`
skips authenticated suites. That is intentional. Fill secrets on
`Jimvio-CI-Runner` (or as Actions secrets written to `.auth/` at runtime) to
unblock full acceptance.
