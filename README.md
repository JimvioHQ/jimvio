"# Jimvio

> The all-in-one creator commerce and digital business platform

## Overview

Jimvio is an all-in-one global creator-commerce and digital business platform. The public product includes marketplace commerce, seller and storefront tools, dropshipping inside Commerce, affiliate tracking, UGC and clipping campaigns, digital products, communities, live community sessions, wallet balances and supported payouts, and in-product AI assistance. Availability varies by account and country.

The app uses:
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Prisma + Supabase/Postgres
- Checkout and wallet payouts through the methods currently enabled in the product (card and mobile money via supported processors, crypto, bank, and Binance). PayPal, PesaPal, PawaPay, and AfriPay are not offered for new payments.
- Shopify integration and webhook handling
- OpenAI / Google generative APIs for AI-powered features

## Key Features

- Admin dashboard for orders, transactions, vendors, and community
- Public storefronts and checkout flow
- Creator / vendor content management
- UGC clipping / social media API sync
- Payment webhook processing and reconciliation
- Shopify store sync and vendor commission settings

## Project Layout

- `app/` - Next.js App Router pages and API routes
- `components/` - UI components and design system
- `lib/` - shared libraries, API integrations, utilities
- `prisma/` - Prisma schema and migration artifacts
- `public/` - static assets
- `scripts/` - helper scripts and verification utilities
- `docs/` - project documentation

## Prerequisites

- Node.js 20+ (recommended)
- npm
- Supabase project or Postgres database
- Environment variables configured from `.env.example`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy example env file:

```bash
copy .env.example .env.local
```

3. Fill `.env.local` with your values.

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Start the development server:

```bash
npm run dev
```

## Important Environment Variables

The project relies on the following configuration values. A full sample is available in `.env.example`.

### Supabase / Database
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred)
- `SUPABASE_SECRET_KEY` (preferred, server-only)
- Legacy server fallback (optional): `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (optional, used for auth links)

### Payments
- `FLW_SECRET_KEY` / `FLW_PUBLIC_KEY` (Flutterwave — cards + Mobile Money)
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `NOWPAYMENTS_ENV`
- `BINANCE_PAY_API_KEY`
- `BINANCE_PAY_API_SECRET`

Retired (do not configure for new checkouts): PesaPal, PayPal, AfriPay (`AFRIPAY_*`), PawaPay (`PAWAPAY_*`).

### Shopify
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_WEBHOOK_SECRET`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_WEBHOOK_SECRET`
- `SHOPIFY_API_VERSION`
- `JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID`
- `SHOPIFY_DEFAULT_PLATFORM_COMMISSION_RATE`

### AI / Social Media
- `OPENAI_API_KEY` — server-only key for live Jimvio AI (chat, shopping assistant, affiliate promotion, support, search intent, and sourcing drafts). Do not expose it to the browser.
- `OPENAI_MODEL` — optional model override. When unset, the app uses `gpt-4o-mini`.
- `GOOGLE_GENERATIVE_AI_API_KEY` — server-only Gemini fallback. Active routes call it only after an OpenAI timeout or service outage. Keep it until that fallback has been checked in production.
- `TIKTOK_ACCESS_TOKEN`
- `INSTAGRAM_ACCESS_TOKEN`
- `YOUTUBE_API_KEY`
- `X_BEARER_TOKEN`

### App Security
- `CRON_SECRET`

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - build production app
- `npm start` - run built app
- `npm run lint` - run ESLint
- `npm run type-check` - run TypeScript type check
- `npm run postbuild` - generate sitemap after build
- `npm run pesapal:verify` - verify PesaPal configuration
- `npm run pawapay:generate-signing-key` - generate PawaPay signing key

## Deployment Notes

- The site is designed to deploy on Vercel or any Next.js-compatible host.
- `next.config.ts` enables remote images and includes an API CORS header for BinancePay initiation.
- Make sure production env values are set securely and webhook urls are reachable by payment providers.

## Notes

- `package.json` is marked `private: true` so the repo is not intended for npm publishing.
- This README is a starting point; consult `docs/` for domain-specific workflows such as UGC clipping and payment integration.

## License

This repository does not include an explicit license file.
"
