# PawaPay sandbox on localhost (ngrok)

This project includes a minimal flow to test **PawaPay Merchant API v2** in **sandbox** from your machine:

| Piece | Path |
|--------|------|
| Deposit API | `POST /api/deposit` |
| Webhook (callbacks) | `POST /api/webhook` |
| Test / env check | `GET` or `POST /api/test-pawapay` |
| UI | `/pawapay-sandbox` |

## 1. Environment (`.env.local`)

```bash
# Override API host — sandbox or production base URL (no trailing slash)
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
PAWAPAY_API_TOKEN=your_sandbox_token_from_dashboard

# Optional: defaults to MTN_MOMO_RWA (Rwanda MTN, RWF)
# PAWAPAY_DEFAULT_PROVIDER=MTN_MOMO_RWA
```

For **production**, point `PAWAPAY_BASE_URL` at `https://api.pawapay.io` and use a **production** token from [dashboard.pawapay.io](https://dashboard.pawapay.io).

The shared `lib/pawapay.ts` reads `PAWAPAY_BASE_URL` when set; otherwise it falls back to `PAWAPAY_ENV` + default hosts.

## 2. Run Next.js

```bash
npm run dev
```

App listens on `http://localhost:3000` by default.

## 3. Run ngrok

In another terminal:

```bash
npx ngrok http 3000
```

(or `ngrok http 3000` if installed globally.)

### Public URL

ngrok prints a **Forwarding** line, for example:

`https://abc123.ngrok-free.app -> http://localhost:3000`

Use the **https** URL as your public base (e.g. `https://abc123.ngrok-free.app`).

**Important:** Each time you restart ngrok (free tier), the subdomain often **changes**. Update the PawaPay dashboard callback URL when it does.

## 4. Configure PawaPay sandbox dashboard

1. Open [PawaPay sandbox dashboard](https://dashboard.sandbox.pawapay.io) → **System configuration** → **Callback URLs**.
2. Under **Deposits**, set the callback URL to:

   `https://<your-ngrok-host>/api/webhook`

   Example:

   `https://abc123.ngrok-free.app/api/webhook`

3. Save, then create or use an **API token** and put it in `PAWAPAY_API_TOKEN`.

You can use the **same** webhook URL for other operation types if the form requires them, until you implement separate handlers.

## 5. Test

1. Open `http://localhost:3000/pawapay-sandbox`.
2. Enter a valid **sandbox** Rwanda test MSISDN and an amount in **RWF**.
3. Click **Pay now** — watch the **terminal** where `npm run dev` runs for:
   - `[api/deposit]` lines: `Sending request to PawaPay...`, `BASE_URL=...`, full request payload, `Response received from PawaPay`, response body.
   - `[PawaPay /api/webhook]` logs when PawaPay POSTs the callback to ngrok.

### Isolated API test

```bash
curl http://localhost:3000/api/test-pawapay
curl -X POST http://localhost:3000/api/test-pawapay
```

Optional: `PAWAPAY_TEST_PHONE=2507XXXXXXXX` in `.env.local` for the POST test MSISDN.

### HTTP 401 `HTTP_SIGNATURE_ERROR` (signature verification failed)

Your sandbox merchant has **signed financial requests** turned on, so Bearer-only calls are rejected.

**Option A — Quick test (no signatures)**  
[PawaPay sandbox dashboard](https://dashboard.sandbox.pawapay.io) → **System configuration** / **API tokens** → turn off **signed requests** (wording may vary). Optionally set `PAWAPAY_HTTP_SIGNING_DISABLED=true` in `.env` so the app never tries to sign.

**Option B — Keep signing on (production-like)**  
From the project root:

```bash
npm run pawapay:generate-signing-key
```

Copy the **public** key into the dashboard, copy the **Key ID** the dashboard shows into `PAWAPAY_HTTP_SIGNING_KEY_ID`, and put the **private** key line into `PAWAPAY_HTTP_SIGNING_PRIVATE_KEY`. Restart `npm run dev`. Optional: `PAWAPAY_HTTP_SIGNING_ALG` — default `ecdsa-p256-sha256` (must match your key type).

See [PawaPay signatures](https://docs.pawapay.io/v2/docs/signatures) and the [Node example](https://github.com/pawaPay/signatures-node-example).

### Why deposits might not show in the dashboard

- Use **[sandbox dashboard](https://dashboard.sandbox.pawapay.io)** → **Finances / History / Deposits** (wording may vary), not only a generic “Transactions” search.
- `PAWAPAY_BASE_URL` must be **`https://api.sandbox.pawapay.io`** and the token must be a **sandbox** token from that same environment.
- If `isSandbox: false` appears in `/api/deposit` JSON `debug`, you are hitting **production** API — sandbox UI will stay empty.

### Request shape (API v2)

Deposits use **`POST /v2/deposits`** with `payer.type: "MMO"` and `accountDetails.provider` (e.g. `MTN_MOMO_RWA`), not legacy `MSISDN` / `MTN_RWA` field names.

## 6. Production checklist

- `PAWAPAY_BASE_URL=https://api.pawapay.io`
- Production token + callback URL using your **real** domain, e.g. `https://yourdomain.com/api/webhook` (or the existing checkout callback under `/api/payments/pawapay/callback` for the main app).
