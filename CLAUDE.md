# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js with TurboPack)
- `npm run build` - Build production optimized application
- `npm start` - Run built application
- `npm run lint` - Run ESLint for code linting
- `npm run type-check` - Run TypeScript type checking (tsc --noEmit)
- `npm run pesapal:verify` - Validate PesaPal configuration
- `npm run pawapay:generate-signing-key` - Generate PawaPay signing key
- `npm run icons:generate` - Generate round icons script
- `npm run postbuild` - Generate sitemap after build (see package.json)

## Codebase Structure

- **app/** - Next.js App Router directory containing:
  - Route groups: `(auth)`, `(public)`, `(creator)`, `(admin)`, etc.
  - API routes: `app/api/` (e.g., `app/api/communities/route.ts`)
  - Page components: `app/(public)/[slug]/page.tsx`, etc.
  - Layouts: `app/(group)/layout.tsx`
- **components/** - Reusable UI components and design system elements
  - Organized by feature: community, layout, hub, workspace, etc.
  - Includes UI primitives (Radix-based) and custom components
- **lib/** - Utilities, services, and business logic
  - `lib/actions/` - Server actions for mutations and data fetching
  - `lib/paymentgateways/` - Integrations with various payment providers (PesaPal, PawaPay, BinancePay, etc.)
  - `lib/ai/` - AI service integrations (OpenAI, Google Generative AI)
  - `lib/db.ts` - Database utilities (Prisma/Supabase)
  - `lib/supabase.ts` - Supabase client initialization
  - ` lib/uploadthing.ts` - File upload handling
  - `lib/formatters.ts` - Formatting utilities (dates, numbers, prices, weights)
  - `lib/theme.ts` - Tailwind theme and utility functions
  - `lib/validation.ts` - Zod validation schemas
  - `lib/actions/` - Feature-specific server actions (orders, products, vendors, communities, etc.)
- **prisma/** - Prisma schema and migration files
- **scripts/** - Helper scripts (verification, key generation, icon generation)
- **docs/** - Project documentation (referenced in README)
- **public/** - Static assets

## Key Technologies

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design system (colors, spacing, radius, shadows)
- **UI Primitives**: Radix UI components
- **ORM**: Prisma with PostgreSQL (via Supabase/Neon)
- **State Management**: Zustand (lightweight store)
- **Data Fetching**: SWR, React Query alternative (`swr`), and React Query not used; also custom fetches
- **Forms**: React Hook Form with Zod validation
- **Payments**: Multiple providers integrated via abstracted gateway layer
- **AI**: OpenAI and Google Generative AI APIs for content generation, search, etc.
- **File Upload**: Uploadthing integration
- **Search**: Meilisearch? (not in deps) - actually uses custom search? See lib/ai/
- **Analytics**: Vercel Analytics and Speed Insights
- **Maps**: MapLibre GL (open-source Mapbox alternative)
- **3D**: Three.js for globe visualization
- **Email**: Resend? (not in deps) - see lib/email.ts

## Development Guidelines

### Code Organization

- Server actions live in `lib/actions/` and are used directly in server components via `action` attribute.
- Form validation uses Zod schemas (see `lib/validation/` or alongside actions).
- Payment processing abstracted through `lib/paymentgateways/` with a unified interface in `lib/payments.ts`.
- UI components follow Radix primitives styling with Tailwind; see `tailwind.config.ts` for design tokens.
- Internationalization: basic i18n utilities in `lib/i18n.ts` (if used).
- Environment variables: referenced via `process.env`; prefix `NEXT_PUBLIC_` for client-exposed values.

### Database

- Prisma schema defines models; run `npx prisma migrate dev` after changes.
- Generate Prisma client: `npx prisma generate`.
- Supabase used for real-time? (see `lib/supabase.ts`).

### Styling & UI

- Tailwind configuration defines semantic color variables (see `tailwind.config.ts`).
- Dark mode via class strategy (`darkMode: "class"`).
- Custom CSS variables stored in `:root` (likely in a global CSS file; check `app/globals.css?` not listed but typical).
- Use `cn()` utility from `class-variance-authority` for conditional class merging (see `lib/utils`? not listed but common).

### Testing

- No test framework configured in package.json (no Jest, Vitest, or @testing-library).
- Testing appears to be manual or via end-to-end (Playwright/Cypress) not configured.
- Consider adding unit tests for utilities and integration tests for API routes.

### Linting & Formatting

- ESLint with Next.js core config (`eslint-config-next`).
- Prettier likely configured via separate config (not shown); ensure editor formatting matches.

### Environment Variables

See `.env.example` for required variables:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Payments: PesaPal, PawaPay, NowPayments, BinancePay, AfriPay
- Shopify: `SHOPIFY_CLIENT_ID`, `SHOPIFY_ACCESS_TOKEN`, etc.
- AI: `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- Social media tokens for UGC features
- Security: `CRON_SECRET`

## Common Tasks

### Adding a New Page
1. Create a route segment under `app/(group)/[slug]/page.tsx` (or appropriate route group).
2. Add layout if needed in same segment folder.
3. Link from navigation or sidebar components.

### Adding a Payment Provider
1. Create a new file in `lib/paymentgateways/` (e.g., `newprovider.ts`) implementing the gateway interface.
2. Export from `lib/payments.ts` union type and update switch logic.
3. Add required environment variables to `.env.example`.
4. Update any payment UI/components to include new provider.

### Modifying Database Schema
1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name <migration-name>`.
3. Push changes: `npx prisma db push` (if not using migrations).
4. Regenerate client: `npx prisma generate`.
5. Update any affected server actions or types.

### Updating UI Components
1. Edit component in `components/` directory.
2. Use existing Tailwind classes from design system; avoid hardcoding values.
3. For new variants, consider extending `tailwind.config.ts` or using `cva`.

### Running Specific Scripts
- `npm run pesapal:verify` - validates PesaPal credentials.
- `npm run pawapay:generate-signing-key` - generates key for PawaPay.
- `npm run icons:generate` - processes icons (see scripts/).

## Notes

- The app uses Next.js Server Actions extensively for mutations; ensure `useActionState` or `formAction` is used in client components.
- Error handling: server actions should throw `Error` or return formatted error objects; UI uses `useFormState` or `useActionState` from React.
- Performance: images optimized via Next.js Image with remote patterns configured in `next.config.ts`.
- Deployment: suited for Vercel or any Node.js hosting; ensure environment variables are set.