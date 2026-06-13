"# Jimvio

> Global Creator-Commerce Ecosystem

## Overview

Jimvio is a Next.js + TypeScript creator-commerce platform built for creator storefronts, marketplace commerce, order management, vendor workflows, user-generated content, and multi-gateway payments.

The app uses:
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Prisma + Supabase/Postgres
- Multi-provider payments (PesaPal, PawaPay, NowPayments, BinancePay, AfriPay)
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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (optional, used for auth links)

### Payments
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_ENV`
- `PAWAPAY_API_TOKEN`
- `PAWAPAY_ENV`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `NOWPAYMENTS_ENV`
- `AFRIPAY_APP_ID`
- `AFRIPAY_APP_SECRET`
- `BINANCE_PAY_API_KEY`
- `BINANCE_PAY_API_SECRET`

### Shopify
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_WEBHOOK_SECRET`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_WEBHOOK_SECRET`
- `SHOPIFY_API_VERSION`
- `JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID`
- `SHOPIFY_DEFAULT_PLATFORM_COMMISSION_RATE`

### AI / Social Media
- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
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
