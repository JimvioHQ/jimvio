# AGENTS.md

## Commands

```bash
npm run dev          # dev server (Turbopack, requires NODE_OPTIONS=--use-system-ca via cross-env)
npm run build        # production build (requires --use-system-ca, handled automatically)
npm run lint         # ESLint (next lint)
npm run type-check   # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
```

**Verify before merge:** `npm run lint && npm run type-check && npm run test`

> **Build perf:** `next.config.ts` has `typescript.ignoreBuildErrors: true` to skip TS checking during build (it's the slowest step). `tsconfig.json` uses narrowed `include` (no `**/*.ts` glob) + `incremental: true` + `tsBuildInfoFile: ".tsbuildinfo"` for caching. Run `npm run type-check` when you need type verification. Delete `.tsbuildinfo` if types get stale.

## Architecture

- **Next.js 16 App Router** with React 19. Route groups: `(auth)`, `(public)`, `admin/`, `dashboard/`.
- **Database:** Supabase (Postgres). Prisma schema exists as `schema.sql` + migrations in `database/migrations/`. The Prisma client in `lib/prisma.ts` is **commented out**. All DB access goes through Supabase client (`lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/service-role.ts`). Do not import from `lib/prisma.ts`.
- **Path alias:** `@/` maps to project root (tsconfig + vitest alias).
- **Payments:** Multi-gateway abstraction in `lib/payments/` (router, providers: pesapal, nowpayments, afripay, etc.) and `lib/` root (pesapal.ts, nowpayments.ts, afripay.ts, paypal.ts, pawapay-convert.ts).
- **File uploads:** Cloudinary via `next-cloudinary` (not uploadthing).
- **Schema output:** Prisma generates to `lib/generated/prisma` — do not hand-edit.

## WebRTC 1:1 Calls

The peer-to-peer audio/video call system is the active live session system. Key files:

- `components/community/call-context.tsx` — global `CallProvider` + `useCall()` hook (WebRTC state, incoming call detection via Supabase Realtime, ringtones, call UI overlays)
- `components/community/chat/ChatRoom.tsx` — integrates `useCall()`, has `startNativeCall()`
- `hooks/useChatRoom.ts` — subscribes to Realtime on `community_messages` and `community_inbox_messages`, detects `call_start`/`call_signal` message types
- `components/community/chat/CallOverlay.tsx` — active call UI (local/remote video)
- `components/community/chat/IncomingCallModal.tsx` — incoming call popup
- `lib/community/message-signaling.ts` — `isCallSignalingMessage()` filters SDP/ICE from chat display

**Signaling flow:** Call initiation sends `call_start` message via API → Supabase Realtime picks up INSERT → `CallProvider` shows `IncomingCallModal` → accept creates `RTCPeerConnection` with Google STUN → SDP/ICE exchanged as `call_signal` messages in DB.

**No TURN server configured** — NAT traversal may fail for some users.

## Space-Based Live Sessions

Live sessions are tied to **spaces** within communities. Members can only join sessions from spaces they have access to.

**Schema relationships:**
- `spaces` table: `id`, `community_id`, `name`, `slug`, `access_type` (`"free"` | `"paid"` | `"premium"`), `price`
- `rooms` table: `space_id` FK, `access_type` (`"inherit"` by default — inherits from parent space)
- `community_memberships.space_access`: UUID array of space IDs the member can access

**Access control logic:**
- Server: `services/accessControl.ts` — `canAccessSpace(userId, spaceId)`, `canAccessRoom(userId, roomId)`
- Client: `lib/community-workspace-access.ts` — `canAccessSpace()`, `canAccessRoomNav()`
- Free spaces → always allowed. Paid → active membership required. Premium → yearly/lifetime plan OR specific space in `space_access` array.

**Current state:** Live session UI (`components/community/hub/hub-live-page.tsx`) is **mock data only** — no server-side session persistence or access gating. `LiveSessionItem` and `LiveSessionLite` types already have `space_id` fields. `start-live-dialog.tsx` uses hardcoded mock spaces.

**Important:** When implementing real live session access, check space membership using the existing `canAccessSpace()` function before allowing join.

## Conventions

- **Server Actions** for mutations (in `lib/actions/`). Client components use `useActionState`.
- **Styling:** Tailwind with CSS custom properties (`--color-*`, `--space-*`, `--radius-*`). Dark mode via `darkMode: "class"`. Use `cn()` (clsx + tailwind-merge) for conditional classes.
- **Forms:** React Hook Form + Zod validation (`lib/validation/`).
- **Email:** Resend (not a direct dep; configured via env `RESEND_API_KEY`).
- **Data fetching:** SWR for client-side. No React Query.
- **State:** Zustand for client stores.
- **Testing:** Vitest + jsdom + `@testing-library/jest-dom`. Tests in `*.test.ts(x)` colocated with source. Only 1 test exists currently.

## Gotchas

- `next dev` requires `NODE_OPTIONS=--use-system-ca` (handled by npm scripts via `cross-env`).
- Schema file is `schema.sql` + `database/migrations/`, not `prisma/schema.prisma` — CLAUDE.md references are stale.
- No uploadthing integration despite CLAUDE.md claim — file uploads use Cloudinary (`next-cloudinary`).
- `vercel.json` defines cron jobs (shopify-sync, cj-catalog-sync, cj-enrichment, cj-intelligence-daily, ugc views sync, retry-failed-webhooks). These are Vercel-only.
- `instrumentation.ts` runs a one-time Shopify sync on server boot (delayed 10s).
- BinancePay CORS header is configured in `next.config.ts` for `/api/payments/binancepay/initiate` only.
- Payment providers exist in both `lib/payments/` (abstraction layer) and `lib/` root (direct integrations).