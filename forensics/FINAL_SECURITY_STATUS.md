# FINAL SECURITY STATUS

Date: 2026-08-25  
Mode: Phase 11 closure. No secret values, JWTs, API keys, cookies, or Authorization headers are printed here.

## INCIDENT

2026-08-11 wipe. Fingerprint: Node 24.18.0, supabase-js 2.111.0, `service_role`, IP 154.68.68.75. Person and execution host remain UNKNOWN.

## CURRENT PRODUCTION SHA

**Live www.jimvio.com:** `90f5ef57b25a955ee87dd070cc0981c67c217dc8`  
**Live deployment:** `dpl_HGBsQWf7iQ3ztYBBjiWSttdAUpvd` READY  
**Phase 11:** this repository commit on `main` (see git history for `complete final security hardening`). Not deployed to Production yet.  

Phase 11 code is on local `main` and was **not** promoted to Production, because a Preview env cleanup deleted shared Production+Preview Vercel variable records for payment/Shopify secrets. Vercel applies env changes only to **new** deployments. The live deployment still has its previous env snapshot. A new Production deploy is blocked until those Production-only secrets are restored.

## SUPABASE STATUS

- Project: `vsfhwfimudpdipdkxbww` (eu-west-1)
- Legacy anon JWT: DISABLED (not re-enabled)
- Legacy service_role JWT: DISABLED (not re-enabled)
- Browser uses `sb_publishable_`
- Server uses `SUPABASE_SECRET_KEY` then `SUPABASE_SERVICE_ROLE_KEY`
- Leftover `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` removed from Vercel Production (and Preview / leftover branch overlay)
- `SUPABASE_JWT_SECRET`: **NOT rotated**. Wipe packet does not prove JWT-secret exposure. Classification: UNKNOWN / POTENTIALLY COMPROMISED. Rotation would invalidate all sessions and needs a dedicated plan.
- `POSTGRES_PASSWORD` / `SUPABASE_DB_PASSWORD` / `POSTGRES_URL*`: **NOT rotated**. Wipe fingerprint is HTTP Data API + service_role, not proven DB-password theft. Classification: UNKNOWN / POTENTIALLY COMPROMISED. No SQL reset.

## CJ STATUS

- Old CJ API key: REVOKED (Phase 10A)
- New CJ credential: ACTIVE
- Stored `cj_credentials.open_id`: PRESENT (boolean check only)
- `CJ_WEBHOOK_SECRET`: ABSENT on Vercel (not set; do not set until CJ Dashboard sends the matching header)
- Code (this change): fail-closed. If `CJ_WEBHOOK_SECRET` is set, header must match. Else stored `open_id` must match payload `openId`. If neither can be verified: HTTP 401. Unsigned destructive events are not accepted.
- Preview: CJ webhooks and CJ import/catalog mutation APIs are blocked.

Manual if CJ webhooks start 401ing after deploy: confirm CJ payloads include `openId`. Optional extra: create a webhook secret in CJ Dashboard, add the same value as Production `CJ_WEBHOOK_SECRET`, send it as `x-cj-webhook-secret` or `x-webhook-secret`. Do not add the env var first.

## PAYMENT STATUS

Provider dashboard rotations were **not** performed (no Dashboard access in this session; no real charges).

| Provider | Rotation | Notes |
|---|---|---|
| Afripay | MANUAL REQUIRED (dashboard) | Hardcoded fallbacks already removed. Git history still treated as burned. Production env restored from local `.env.local` after the Preview rm accident (Production-only). Rotate in Afripay Dashboard, then replace Production env, then revoke old. |
| Flutterwave | MANUAL REQUIRED | Production Vercel record missing after Preview rm of a shared variable. Restore Production-only, then rotate in Flutterwave Dashboard. |
| PayPal | MANUAL REQUIRED | Same restore-then-rotate. Keep `PAYPAL_WEBHOOK_ID` on Production. |
| PesaPal | MANUAL REQUIRED | Same. |
| PawaPay | MANUAL REQUIRED | Same. |
| NowPayments | MANUAL REQUIRED | Same. |
| Binance Pay | MANUAL REQUIRED | Same. |

**Do not deploy Production until the restore list in Remaining manual actions is complete.** Live checkout on SHA `90f5ef57` should still use the previous deployment env snapshot.

## SHOPIFY STATUS

- Platform `SHOPIFY_ACCESS_TOKEN` / `SHOPIFY_WEBHOOK_SECRET`: server-only in code; connect/sync already session+ownership gated
- Vendor `shopify_credentials`: disconnect moved off the browser client to `POST /api/shopify/disconnect` (session + vendor owner or platform admin)
- Cleanup remains archive-only (unchanged)
- Browser connect form no longer deletes credentials from the client
- Provider rotation: MANUAL REQUIRED
- Production Vercel `SHOPIFY_ACCESS_TOKEN` and `SHOPIFY_WEBHOOK_SECRET` must be restored Production-only before the next deploy

## CRON STATUS

- Production `CRON_SECRET`: **rotated** (new sensitive Production-only value; value not printed)
- Preview `CRON_SECRET`: **removed** (Vercel crons are Production; Preview cron is code-disabled)
- Hosted cron auth: timing-safe compare; missing secret on hosted = 503; Preview = 403; no query-string secret
- Remaining cron routes now use `assertCronAuthorized`
- Live check (current SHA): cron without auth = 401; cron with invalid Bearer = 401
- Destructive cron jobs were not executed. Scheduled execution was not force-run.

## RLS STATUS

- Phase 6/8/10A/131 controls remain live
- Wallet mutation RPCs remain service_role only (migration 130)
- `wallet_deposits` SELECT-only; UGC escrow SELECT-only; transactions client writes revoked; orders anon writes revoked; `platform_secrets` fail-closed
- Advisors: no CRITICAL/ERROR. WARN residuals: SECURITY DEFINER `search_path` mutable, anon/authenticated EXECUTE on some definer functions, RLS-enabled tables with no policies (mostly CJ internals)
- SECURITY DEFINER functions still missing `search_path` (counter/trigger helpers). Not patched in this phase (production trigger risk). Documented MEDIUM.

## ADMIN STATUS

- Canonical gate: `assertPlatformAdmin` (`getUser()` + DB admin role or bootstrap `ADMIN_EMAILS` on session email)
- Preview: platform admin denied; `/admin` and `/api/admin/*` blocked in middleware
- Auto-heal, bulk-delete, CJ admin, credits remain server-authorized
- No client-only admin authorization introduced

## IDOR STATUS

Known payment IDORs from Phase 10 remain closed (session + `buyer_id`, server-derived amounts, PayPal `custom_id` match, Flutterwave cancel, PawaPay confirm fail-closed).  
Shopify disconnect now server-authorized.  
No production records were mutated for testing.  
No newly proven user-facing IDOR was left unfixed in this change set.

## MONEY STATUS

- Wallet balance mutations: service_role / locked RPCs (Phase 8/130)
- Wallet deposits: pending before verification (Phase 10)
- Transactions: client writes blocked (131)
- Payments: amount derived from owned order rows (Phase 10)
- Orders: ownership enforced on user payment paths
- Webhooks: signature/provider verification as previously hardened; CJ now fail-closed
- Idempotency: unchanged; not re-tested with live charges
- No real payments, no fake production money movements

## PREVIEW STATUS

**Preview is NOT a separate database.** It still shares Production Supabase (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`). That is intentional until a planned second project exists. Do not claim Preview is isolated.

Safe isolation completed (env + code), not a DB split:

- Removed Preview copies of payment/Shopify/cron/legacy anon JWT env records
- Code: Preview cannot run admin, payments, webhooks, cron, Shopify connect/sync/disconnect, CJ import
- Browser still must not receive server secrets (unchanged architecture)

Preview still holds Production-class: `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`, `SUPABASE_JWT_SECRET`, `CJ_API_KEY`, LiveKit, Cloudinary, OpenAI/Gemini. Any unblocked server route that uses the secret key remains a privileged client of Production.

### Separate Supabase project (NOT executed)

1. Create a Preview Supabase project (new ref, new keys). Do not copy Production data dumps containing PII unless scrubbed.
2. Apply the same migration chain (`database/migrations` / `supabase/migrations`) to Preview.
3. Seed non-production catalog/users only.
4. Point Preview Vercel env at Preview URL + Preview publishable + Preview secret key. Do not put Production `SUPABASE_SECRET_KEY` or `POSTGRES_*` on Preview.
5. Deploy a Preview branch and verify login, marketplace, and that Production rows are untouched.
6. Only then remove remaining Production credentials from Preview.
7. Never migrate by pointing Preview at a new DB without this plan.

## BROWSER SECRET STATUS

Scan of live www.jimvio.com client chunks (current SHA `90f5ef57`, 50 scripts):

| Pattern | Count |
|---|---|
| `sb_publishable_` | > 0 (2) |
| `sb_secret_` | 0 |
| anon JWT role | 0 |
| service_role JWT role | 0 |
| `eyJ` JWT literals | 0 |
| `SUPABASE_SECRET_KEY` literal | 0 |
| `SUPABASE_SERVICE_ROLE_KEY` literal | 0 |
| `CRON_SECRET` literal | 0 |

CJ API key, Shopify secret, payment secrets, DB password: not observed as literals in those chunks.

## TEST STATUS

| Gate | Result |
|---|---|
| `npm test` (all `scripts/tmp/verify-*.mjs`, including Phase 11) | PASS |
| `npm run type-check` | PASS |
| `npm run lint` | PASS (warnings only; no errors) |
| `npm run build` | PASS |
| `git diff --check` | PASS |

## DEPLOYMENT STATUS

- Production live: READY at SHA `90f5ef57` / `dpl_HGBsQWf7iQ3ztYBBjiWSttdAUpvd`
- Phase 11 Production deploy: **NOT PERFORMED** (blocked by missing Production payment/Shopify env records)
- www.jimvio.com does **not** yet run the Phase 11 SHA

### Live GET (current Production)

| Check | Result |
|---|---|
| GET `/` | 200 |
| GET `/marketplace` | 200 |
| GET `/login` | 200 |
| GET `/admin` unauthenticated | redirect to `/login` |
| GET `/dashboard` unauthenticated | redirect to `/login` |
| GET `/wallet` unauthenticated | redirect to `/login` |
| GET `/api/ops/health` | 200, SHA `90f5ef57…` |
| GET cron without auth | 401 |
| GET cron invalid auth | 401 |

---

## STEP 1 INVENTORY (names only)

| NAME | ENVIRONMENT | CONSUMER | PRODUCTION/PREVIEW | SERVER/BROWSER | ROTATION REQUIRED? | ROTATION METHOD | STATUS |
|---|---|---|---|---|---|---|---|
| SUPABASE_SECRET_KEY | Vercel | Server admin/webhooks | Prod + Preview + Dev | Server | Already on new path; incident co-located | Supabase Dashboard new secret key | ACTIVE; Preview still has Production key |
| SUPABASE_SERVICE_ROLE_KEY | Vercel | Legacy server fallback | Prod + Preview | Server | Legacy JWT disabled | Do not re-enable JWT | DISABLED as JWT; env name still present |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY | Vercel | Browser + RLS client | Prod + Preview | Browser + server | No | n/a | ACTIVE |
| NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY | Vercel | Unused leftovers | Removed | Browser/server | Remove leftover JWT material | `vercel env rm` | REMOVED |
| SUPABASE_JWT_SECRET | Vercel | Auth signing | Prod + Preview | Server | Unknown exposure | Dashboard JWT secret + session migration | NOT ROTATED; UNKNOWN / POTENTIALLY |
| POSTGRES_PASSWORD / SUPABASE_DB_PASSWORD / POSTGRES_URL* | Vercel | Unused Prisma (commented) | Prod + Preview | Server | Unknown exposure | Supabase DB password dashboard | NOT ROTATED; UNKNOWN / POTENTIALLY |
| DATABASE_URL | Vercel | n/a | Absent | n/a | n/a | n/a | ABSENT |
| CJ_API_KEY | Vercel | CJ API | Prod + Preview | Server | Done Phase 10A | CJ Dashboard | ACTIVE new key |
| CJ_WEBHOOK_SECRET | Vercel | CJ webhook | Absent | Server | Optional | CJ Dashboard + Vercel together | ABSENT; fail-closed via open_id |
| CRON_SECRET | Vercel | Cron | Production only | Server | Yes | App secret rotate | ROTATED Production; Preview removed |
| AFRIPAY_APP_ID / AFRIPAY_APP_SECRET | Vercel | Afripay | Production only (after restore) | Server | Yes (git history) | Afripay Dashboard | PRODUCTION RESTORED from local; dashboard rotate still required |
| FLW_SECRET_KEY / FLW_ENCRYPTION_KEY / FLW_WEBHOOK_SECRET | Vercel | Flutterwave | Missing from project env | Server | Yes + restore | Flutterwave Dashboard | PROJECT ENV DELETED; live deploy snapshot still old |
| FLW_PUBLIC_KEY | Vercel | Flutterwave | Prod + Preview | Server | Low | Dashboard | PRESENT |
| PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID | Vercel | PayPal | Missing from project env | Server | Yes + restore | PayPal Dashboard | PROJECT ENV DELETED |
| PAYPAL_CLIENT_ID | Vercel | PayPal | Prod + Preview | Server | Low | Dashboard | PRESENT |
| PESAPAL_CONSUMER_SECRET | Vercel | PesaPal | Missing | Server | Yes + restore | PesaPal Dashboard | PROJECT ENV DELETED |
| PESAPAL_CONSUMER_KEY | Vercel | PesaPal | Prod + Preview | Server | Low | Dashboard | PRESENT |
| PAWAPAY_API_TOKEN | Vercel | PawaPay | Missing | Server | Yes + restore | PawaPay Dashboard | PROJECT ENV DELETED |
| NOWPAYMENTS_API_KEY / NOWPAYMENTS_IPN_SECRET | Vercel | NowPayments | Missing | Server | Yes + restore | NowPayments Dashboard | PROJECT ENV DELETED |
| BINANCE_PAY_API_KEY / BINANCE_PAY_API_SECRET | Vercel | Binance Pay | Missing | Server | Yes + restore | Binance Dashboard | PROJECT ENV DELETED |
| SHOPIFY_ACCESS_TOKEN / SHOPIFY_WEBHOOK_SECRET | Vercel | Shopify | Missing | Server | Yes + restore | Shopify Admin | PROJECT ENV DELETED |
| SHOPIFY_CLIENT_ID | Vercel | Shopify | Prod + Preview | Server | Low | Dashboard | PRESENT |
| LIVEKIT_API_KEY / LIVEKIT_API_SECRET | Vercel | Live | Prod + Preview | Server | Unknown | LiveKit Cloud | NOT ROTATED |
| CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET | Vercel | Media | Prod + Preview | Server | Unknown | Cloudinary | NOT ROTATED |
| OPENAI_API_KEY | Vercel | AI | Prod + Preview | Server | Unknown | OpenAI | NOT ROTATED |
| GOOGLE_GENERATIVE_AI_API_KEY | Vercel | Gemini | Prod + Preview | Server | Unknown | Google AI | NOT ROTATED |
| RESEND_API_KEY | Vercel | Email | Absent | Server | n/a | Resend | ABSENT |
| ADMIN_SECRET_KEY | Vercel | Extra admin header | Absent | Server | n/a | n/a | ABSENT |
| DOWNLOAD_SIGNING_SECRET | Vercel | Downloads + view salt fallback | Prod + Preview | Server | Created post-incident | App secret | PRESENT |
| VIEW_HASH_SALT | Vercel | Clip views | Absent | Server | Optional | App secret | ABSENT; hardcoded fallback removed |

---

## CRITICAL

| severity | file/provider | risk | production exposure | remediation | status |
|---|---|---|---|---|---|
| CRITICAL | Vercel env: Flutterwave, PayPal, PesaPal, PawaPay, NowPayments, Binance Pay, Shopify secrets | `vercel env rm <NAME> preview` deleted the **shared** Production+Preview variable record, not only Preview | Live SHA `90f5ef57` still has the previous deployment env snapshot. **Next Production deploy would boot without those secrets and break checkout/Shopify.** | Re-add each secret **Production-only** from the operator password manager / provider dashboard. Do not add them back to Preview. Then deploy Phase 11. | OPEN — MANUAL REQUIRED before deploy |
| CRITICAL (prior, closed as JWT) | Legacy Supabase anon/service_role JWTs | Historical wipe | Disabled | Keep disabled | CLOSED |

## HIGH

| severity | file/provider | risk | production exposure | remediation | status |
|---|---|---|---|---|---|
| HIGH | Preview `SUPABASE_SECRET_KEY` / service_role / Postgres | Preview remains a Production DB privileged client | Shared Production database | Separate Preview Supabase (plan above). Code path blocks reduce but do not eliminate this. | OPEN — not isolated |
| HIGH | Flutterwave / PayPal / PesaPal / PawaPay / NowPayments / Binance / Afripay / Shopify credentials | Co-located with compromised service_role host; not proven stolen | Live deployment still uses old snapshot secrets | Restore Production env, then rotate at each provider dashboard, update Production, revoke old | OPEN — MANUAL REQUIRED |
| HIGH (mitigated in code) | CJ unsigned webhooks | Destructive catalog/order webhook without auth | Stored open_id already present; Phase 10 checked it when present. Phase 11 fail-closed if neither secret nor open_id | Deploy Phase 11 after env restore | CODE DONE, NOT LIVE |

## MEDIUM

| severity | file/provider | risk | production exposure | remediation | status |
|---|---|---|---|---|---|
| MEDIUM | SECURITY DEFINER functions missing `search_path` | search_path hijack if a caller can set path | Advisor WARN; trigger/counter functions | Dedicated migration `SET search_path = pg_catalog, public`; revoke PUBLIC EXECUTE where trigger-only | OPEN |
| MEDIUM | anon/authenticated EXECUTE on SECURITY DEFINER counters | Anyone authenticated/anon may increment some counters | Advisor WARN | Revoke PUBLIC; grant to needed roles only | OPEN |
| MEDIUM | `CJ_WEBHOOK_SECRET` unset | Relies on stored open_id in payload | Production has open_id | Optional Dashboard secret, set together with Vercel | OPEN — optional |
| MEDIUM | LiveKit / Cloudinary / OpenAI / Gemini keys on Preview | Preview can call billed/prod APIs | Preview env | Remove from Preview if unused; rotate if incident host had them | OPEN |
| MEDIUM | `DOWNLOAD_SIGNING_SECRET` used as view-hash fallback | View-hash tied to download signing | Server only | Set dedicated `VIEW_HASH_SALT` | OPEN |

## LOW

| severity | file/provider | risk | production exposure | remediation | status |
|---|---|---|---|---|---|
| LOW | RLS-enabled CJ tables with no policies | Fail-closed (no client access) unless service_role | Advisor INFO | Add policies if client access is required; otherwise leave fail-closed | INFO/LOW |
| LOW | `RESEND_API_KEY` / `ADMIN_SECRET_KEY` absent | Email / extra header unused | None | Add only if those features are required | INFO |
| LOW | Admin settings demo API key UI | Cosmetic fake key | None | Replaced `sk_live_…` demo string | CLOSED |

## INFO

- Phase 6/8/10/131 wallet, RLS, admin, payment IDOR, Afripay fallback removal: remain in force on live SHA `90f5ef57`.
- `lib/prisma.ts` DATABASE_URL usage remains commented; app does not use Postgres URL at runtime via Prisma.
- Hardcoded `VIEW_HASH_SALT` fallback `jimvio-salt-2025` removed.
- Shopify disconnect is no longer a client-side table delete.
- Cron query-string secrets remain absent.

---

## FINAL CLASSIFICATION

**SECURE WITH DOCUMENTED RESIDUALS**

Not **SECURE**:

- CRITICAL Production payment/Shopify Vercel env records are missing for the next deploy
- HIGH Preview still shares Production Supabase secret key
- HIGH provider rotations are not completed and are not proven unnecessary
- Phase 11 code is not live on www.jimvio.com

Never claim SECURE because the application builds.

---

## REMAINING MANUAL ACTIONS (order)

1. **Do not redeploy Production** until step 2 is done.
2. In Vercel → jimvio → Environment Variables, add **Production only** (sensitive), values from the operator vault / provider dashboard (not from chat):
   - `FLW_SECRET_KEY`
   - `FLW_ENCRYPTION_KEY`
   - `FLW_WEBHOOK_SECRET`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_WEBHOOK_ID`
   - `PESAPAL_CONSUMER_SECRET`
   - `PAWAPAY_API_TOKEN`
   - `NOWPAYMENTS_API_KEY`
   - `NOWPAYMENTS_IPN_SECRET`
   - `BINANCE_PAY_API_KEY`
   - `BINANCE_PAY_API_SECRET`
   - `SHOPIFY_ACCESS_TOKEN`
   - `SHOPIFY_WEBHOOK_SECRET`
3. Confirm `vercel env ls` shows those names on Production and **not** on Preview.
4. Push Phase 11 to `main` and wait for READY. Confirm `/api/ops/health` SHA matches the new commit. Confirm cron without auth = 401. Confirm public pages 200.
5. Rotate each payment/Shopify credential in the provider Dashboard, update Production env, revoke old, no real charges.
6. Afripay: rotate in Afripay Dashboard even though Production env was restored from local.
7. Optional: set `CJ_WEBHOOK_SECRET` only together with CJ Dashboard header config.
8. Do not rotate `SUPABASE_JWT_SECRET` or DB passwords without a session/DB access plan.
9. Separate Preview Supabase when ready (plan above). Do not auto-create it.
