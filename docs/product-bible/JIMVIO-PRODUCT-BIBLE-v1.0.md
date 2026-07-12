# Jimvio Product Bible v1.0

**The permanent source of truth for the Jimvio ecosystem**

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | July 2026 |
| **Classification** | Official · Confidential |
| **Owners** | Founder · CPO · CTO |

> *"Jimvio is the Creator Commerce Operating System — not another marketplace, not another affiliate tool, not another community app. It is the infrastructure where anyone, anywhere, builds, grows, and monetizes an online business from one connected platform."*

---

## How to use this document

| Reader | Start here |
|--------|------------|
| **Investor / Executive** | Parts 1, 2, 10 |
| **Product Manager** | Parts 2, 3, 7, 8, 10 |
| **Engineer** | Parts 5, 3 (+ [Technical Architecture](../technical-architecture/)) |
| **Designer** | Parts 6, 3 (+ [Design System](../design-system/)) |
| **AI Engineer** | Part 4 (+ [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md)) |
| **New hire (any role)** | Read Parts 1–3 fully; skim 4–10; dive into companion docs |

**Alignment rule:** Every feature, decision, and roadmap item must align with this Bible. Updates require CPO + CTO + Founder approval.

---

## Table of contents

1. [Company](#part-1--company)
2. [Product](#part-2--product)
3. [Platform](#part-3--platform)
4. [AI](#part-4--ai)
5. [Engineering](#part-5--engineering)
6. [Design](#part-6--design)
7. [Commerce](#part-7--commerce)
8. [Creator Economy](#part-8--creator-economy)
9. [Operations](#part-9--operations)
10. [Roadmap](#part-10--roadmap)

---

# PART 1 — COMPANY

## Vision

Build the world's most **trusted Creator Commerce Operating System** — the default infrastructure where creators, sellers, affiliates, brands, and communities build real businesses, not just audiences.

## Mission

Enable anyone, anywhere, to **build, grow, and monetize** an online business from **one connected platform**.

## Purpose

Jimvio exists because the creator economy is fragmented. Creators juggle Shopify for products, Patreon for communities, Linktree for links, TikTok for audience, PayPal for payouts, and spreadsheets for analytics. Sellers bolt affiliate tools onto marketplaces. Communities lack commerce. Commerce lacks community.

Jimvio unifies these into **one operating system** with one identity, one wallet, one design language, and one intelligence layer.

## Long-term ambition (10 years)

| Horizon | Ambition |
|---------|----------|
| **2026–2027** | Definitive Creator Commerce OS for emerging markets + global creators |
| **2028** | Native mobile; embeddable commerce; creator API |
| **2029** | Third-party app ecosystem on Jimvio platform |
| **2030+** | Global infrastructure for creator-led commerce — billions in enabled GMV |

**North Star metric:** Creator and seller **earnings enabled per active user** — not feature count.

## Core values

| Value | Meaning | In practice |
|-------|---------|-------------|
| **Trust** | Users never surprised | Transparent payments, honest errors, explain waiting |
| **Connection** | One ecosystem | No dead ends; modules feed each other |
| **Simplicity** | Simple before powerful | Progressive disclosure; clear primary actions |
| **Speed** | Interactions feel immediate | Skeleton loading, optimistic UI, lazy shells |
| **Ownership** | Users decide | AI assists; never overrides purchases or payouts |
| **Global** | Built for everywhere | Multi-currency, multi-gateway, mobile-first |
| **Quality** | Production always | No prototype debt in production paths |

## Culture

| Principle | Behavior |
|-----------|----------|
| **Build for users who succeed** | User success creates platform success |
| **Protect what works** | Never break payments, auth, or checkout casually |
| **Small safe changes** | Minimum diffs; reversible decisions |
| **Document why** | ADRs and specs before major work |
| **Debate in writing** | Specs and RFCs over hallway decisions |
| **Ship to learn** | Tier 5 experiments; measure; iterate or kill |

## Decision principles

Before any significant decision, ask:

1. Does this help users **succeed**?
2. Does this **reduce friction**?
3. Does this **save time**?
4. Does this **increase trust**?
5. Does this **improve earnings**?
6. Does this **improve discovery**?
7. Does this make Jimvio feel more **connected**?

**Product Decision Framework:** All ten questions in [Product Blueprint Part 1](../product-blueprint/JIMVIO-PRODUCT-BLUEPRINT-v1.0.md). If none apply — reject.

**When in doubt:** Choose simpler, safer, faster, more maintainable, more reusable, more valuable to users.

---

# PART 2 — PRODUCT

## Platform philosophy

| Principle | Detail |
|-----------|--------|
| **One platform** | Marketplace, communities, affiliate, UGC, courses, payments, AI — one product |
| **Operating System** | Shells (Super App, OS, ⌘K, Workspace) unify experience |
| **No dead ends** | Every screen leads to a meaningful next action |
| **Mobile-first** | Desktop is enhancement; 320px is the baseline |
| **AI-native** | Intelligence woven in; never bolted on |
| **Global by default** | Multi-gateway payments; multi-currency |

## Target users

| Persona | Who they are | What they need |
|---------|--------------|----------------|
| **Buyers** | Consumers discovering and purchasing | Trust, speed, discovery |
| **Sellers** | Vendors listing physical/digital products | Store, fulfillment, GMV |
| **Creators** | Influencers building audience + income | Profile, content, diversification |
| **Affiliates** | Promoters earning per sale | Links, analytics, payouts |
| **Brands** | Companies running campaigns | UGC ROI, reach, analytics |
| **Community owners** | Hub builders monetizing membership | Retention, subscriptions, content |
| **Students** | Learners in communities | Courses, progress, access |
| **Entrepreneurs** | Multi-role builders | Workspace, opportunities, AI guidance |

## User personas (detailed)

### Amina — Creator-Entrepreneur (Rwanda)
- **Roles:** Creator + Affiliate + Community owner
- **Journey:** Activates creator → builds profile → joins UGC → launches community → earns via products + affiliate + subscriptions
- **Pain today:** Too many tools; Jimvio = one dashboard
- **Success:** $500/month diversified earnings within 90 days

### James — Seller (Nigeria)
- **Roles:** Vendor
- **Journey:** Activates seller → lists products → fulfills orders → uses PawaPay/Flutterwave → withdraws to wallet
- **Pain today:** Payment fragmentation across Africa
- **Success:** First sale within 7 days; 95%+ fulfillment rate

### Sarah — Buyer (Kenya)
- **Roles:** Buyer
- **Journey:** Discovers via marketplace/search → purchases → tracks order → joins creator community → enrolls in course
- **Pain today:** Trust in online payments
- **Success:** Repeat purchase within 30 days

### David — Affiliate (Global)
- **Roles:** Affiliate
- **Journey:** Browses high-commission products → generates links → tracks clicks → earns commissions
- **Success:** 5%+ click-to-conversion rate

## Problems solved

| Problem | Jimvio solution |
|---------|-----------------|
| Fragmented creator stack | One OS: commerce + community + affiliate + UGC + AI |
| Payment barriers in emerging markets | PawaPay, PesaPal, Flutterwave, mobile money |
| Discovery without trust | Creator profiles + Commerce Graph + reviews |
| Monetization complexity | Wallet, unified earnings, one withdrawal flow |
| Community without commerce | Paid tiers, courses, live, product linking |
| AI as gimmick | Copilot: contextual, explanatory, bounded |

## Value proposition

**For creators:** *"Build your business, not your tool stack."*  
**For sellers:** *"Sell globally with local payments."*  
**For buyers:** *"Discover creators and products you trust."*  
**For affiliates:** *"Earn from every sale you drive."*  
**For communities:** *"Turn audience into recurring revenue."*

## Platform positioning

```
                    Enterprise
                        ↑
         Shopify ●      │      ● Salesforce
                        │
    Commerce-only ●     │     ● Community-only
         (Amazon)       │        (Discord/Circle)
                        │
                        │    ★ JIMVIO
                        │    Creator Commerce OS
                        │
              Creator-only ●
                   (Linktree/Kajabi)
                        ↓
                    Individual
```

**Jimvio occupies the center:** commerce + creator economy + community + AI — unified.

## Competitive advantages

| Advantage | Why it matters |
|-----------|----------------|
| **Unified OS** | One wallet, one identity, one graph — competitors are point solutions |
| **Emerging market payments** | PawaPay, PesaPal, mobile money native — Stripe-first competitors weak here |
| **Commerce Graph** | Product ↔ Creator ↔ Community ↔ Campaign connections — discovery moat |
| **Creator-first architecture** | Not marketplace-with-creators bolted on — built from creator economy up |
| **AI as assistant** | Context-aware Copilot across all modules — not a separate chatbot |
| **Additive architecture** | Ship fast without breaking production — velocity with stability |

---

# PART 3 — PLATFORM

Jimvio is organized into **five pillars** served by **global shells** and **domain modules**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     JIMVIO CREATOR COMMERCE OS                           │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────┤
│  COMMERCE   │   CREATOR   │     AI      │  BUSINESS   │   FOUNDATION   │
│             │   ECONOMY   │             │    INFRA    │                │
├─────────────┼─────────────┼─────────────┼─────────────┼────────────────┤
│ Marketplace │ UGC         │ Copilot     │ Analytics   │ Design System  │
│ Products    │ Affiliate   │ Search AI   │ Wallet      │ Auth/Security  │
│ Orders      │ Communities │ Opportunity │ Messages    │ Performance    │
│ Checkout    │ Courses     │   Engine    │ Notifications│ Accessibility │
│ Payments    │ Live        │ Automation  │ Workspace   │ Global scale   │
│ Seller Hub  │ Creator Hub │             │ Jimvio OS   │                │
└─────────────┴─────────────┴─────────────┴─────────────┴────────────────┘

Global shells: Super App Dock · Command Center (⌘K) · AI Copilot · Jimvio OS
```

*Deep specification: [Product Blueprint Part 3](../product-blueprint/JIMVIO-PRODUCT-BLUEPRINT-v1.0.md) · [System Architecture Part 2](../system-architecture/JIMVIO-SYSTEM-ARCHITECTURE-BLUEPRINT-v1.0.md)*

---

## Marketplace

| | |
|---|---|
| **Purpose** | Primary product discovery |
| **Responsibilities** | Browse, filters, flash deals, personalized rails, view tracking |
| **User journey** | Land → Browse/search → Product detail → Cart |
| **Permissions** | Public browse; authenticated personalization |
| **Future** | Social proof rails; embeddable storefront widgets |
| **Status** | ✅ Production |

## Seller Hub

| | |
|---|---|
| **Purpose** | Vendor operations command center |
| **Responsibilities** | Store setup, products, orders, inventory, campaigns, Shopify connect |
| **User journey** | Activate vendor → Setup → List → Fulfill → Analyze |
| **Permissions** | `vendor` role |
| **Future** | Multi-store; automated shipping; ERP integrations |
| **Status** | ✅ Production |

## Creator Hub

| | |
|---|---|
| **Purpose** | Creator identity and monetization |
| **Responsibilities** | Public profile, studio, UGC, affiliate, courses tab, Commerce/Business Graph |
| **User journey** | Activate creator → Build profile → Monetize → Share `/influencers/[slug]` |
| **Permissions** | `influencer` role (UI: "Creator") |
| **Future** | Verified badges; embed widget; creator API |
| **Status** | ✅ Production |

## Affiliate Hub

| | |
|---|---|
| **Purpose** | Performance-based promotion |
| **Responsibilities** | Link creation, click tracking, commissions, analytics |
| **User journey** | Generate link → Share → Click → Purchase → Commission → Wallet |
| **Permissions** | `affiliate` / `influencer` |
| **Future** | Tiered commissions; leaderboards; affiliate API |
| **Status** | ✅ Production |

## UGC Hub

| | |
|---|---|
| **Purpose** | Brand-creator content campaigns |
| **Responsibilities** | Campaign browse/join/submit, view tracking, payouts |
| **User journey** | Browse → Join → Create → Submit → Earn |
| **Permissions** | Creator submit; seller create campaigns |
| **Future** | In-app editor; automated view verification |
| **Status** | ✅ Production |

## Communities

| | |
|---|---|
| **Purpose** | Audience hubs with monetization |
| **Responsibilities** | Feed, spaces, tiers (free/paid/premium), `/c` hub, wallet |
| **User journey** | Discover → Subscribe → Engage → Purchase linked products |
| **Permissions** | `community_owner` + workspace roles (member/moderator/admin/owner) |
| **Future** | Cross-community events; discovery personalization |
| **Status** | ✅ Production |

## Courses

| | |
|---|---|
| **Purpose** | Structured learning in communities |
| **Responsibilities** | Lessons, progress, tier-gated access |
| **User journey** | Enroll → Complete lessons → Progress saved |
| **Permissions** | Tier-dependent access |
| **Future** | Quizzes; certificates; standalone marketplace |
| **Status** | ✅ Production |

## Wallet

| | |
|---|---|
| **Purpose** | Unified earnings ledger |
| **Responsibilities** | Balance, transactions, withdrawals, earnings breakdown |
| **User journey** | Earn → View wallet → Request withdrawal → Payout |
| **Permissions** | Own balance; admin approves payouts |
| **Future** | Multi-currency; automated schedules; tax docs |
| **Status** | ✅ Production · **Tier 1 protected** |

## Orders

| | |
|---|---|
| **Purpose** | Commercial transaction lifecycle |
| **Responsibilities** | Placement, fulfillment, tracking, cancellation, invoices |
| **User journey** | Purchase → Track → Receive → Reorder |
| **Permissions** | Buyer (own), vendor (store), admin (all) |
| **Future** | Returns flow; split shipments |
| **Status** | ✅ Production · **Tier 1 protected** |

## Checkout

| | |
|---|---|
| **Purpose** | Pre-payment orchestration |
| **Responsibilities** | Cart validation, shipping, payment method, session management |
| **User journey** | Cart → Checkout → Pay → Confirmation |
| **Permissions** | Authenticated buyer |
| **Future** | Guest checkout; saved methods; one-click reorder |
| **Status** | ✅ Production · **Tier 1 protected** |

## Payments

| | |
|---|---|
| **Purpose** | Multi-gateway money movement |
| **Responsibilities** | Flutterwave, PesaPal, PayPal, NowPayments, PawaPay, Binance, AfriPay; webhooks; finalization |
| **User journey** | Select method → Pay → Webhook → Order confirmed |
| **Permissions** | Buyer pay; admin refund |
| **Future** | Stripe Connect; split payments |
| **Status** | ✅ Production · **Tier 1 protected** |

## Search

| | |
|---|---|
| **Purpose** | Universal discovery |
| **Responsibilities** | Marketplace search, autocomplete, AI NL search, ⌘K Command Center |
| **User journey** | Query → Results → Destination |
| **Permissions** | Public search; ⌘K role-scoped |
| **Future** | Unified entity index (products + creators + communities) |
| **Status** | ✅ Production |

## Messaging

| | |
|---|---|
| **Purpose** | Direct and community communication |
| **Responsibilities** | Dashboard inbox, community chat, realtime |
| **User journey** | Open chat → Send → Realtime delivery |
| **Permissions** | Participant-scoped |
| **Future** | Full DM; push; rich media |
| **Status** | 🟡 Partial |

## Notifications

| | |
|---|---|
| **Purpose** | Cross-domain alert fabric |
| **Responsibilities** | In-app, email, toast, realtime badges |
| **User journey** | Event → Notification → Tap → Context |
| **Permissions** | Own notifications |
| **Future** | Push; granular preferences |
| **Status** | ✅ Production |

## Analytics

| | |
|---|---|
| **Purpose** | Role-specific metrics and reporting |
| **Responsibilities** | Dashboards per role, admin exports, Vercel Analytics |
| **User journey** | Open analytics → Identify trend → Act |
| **Permissions** | Own data; admin global |
| **Future** | Cohort analysis; forecasting |
| **Status** | ✅ Production |

## Workspace

| | |
|---|---|
| **Purpose** | Personalized dashboard command surface |
| **Responsibilities** | Widget grid, layout persistence, module shortcuts |
| **User journey** | Customize → Daily glance → Click through |
| **Permissions** | Own layout |
| **Future** | Role defaults; widget marketplace |
| **Status** | ✅ Production |

## Jimvio AI

| | |
|---|---|
| **Purpose** | Contextual intelligence across platform |
| **Responsibilities** | Copilot, Opportunity explanations, Search AI, bounded tools |
| **User journey** | In context → Ask → Actionable answer → User decides |
| **Permissions** | Authenticated; tools role-scoped |
| **Future** | Production LLM ([FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md)); agents |
| **Status** | 🟡 Scaffold |

## Admin

| | |
|---|---|
| **Purpose** | Platform operations |
| **Responsibilities** | Users, products, orders, payments, UGC, disputes, CJ import, system analysis |
| **User journey** | Alert → Review → Action → Notify parties |
| **Permissions** | `admin` role |
| **Future** | Support role; fraud dashboard |
| **Status** | ✅ Production |

## Settings

| | |
|---|---|
| **Purpose** | User and platform configuration |
| **Responsibilities** | Account, 2FA, roles, integrations, platform_settings |
| **User journey** | Activate role → Configure → Operate |
| **Permissions** | Own settings; admin platform |
| **Future** | Unified hub; API keys |
| **Status** | ✅ Production |

---

# PART 4 — AI

## AI philosophy

| Rule | Detail |
|------|--------|
| **Help** | Answer, suggest, explain |
| **Never interrupt** | Opt-in panels; no blocking flows |
| **Never replace decisions** | User approves all actions |
| **Always explain** | "Why this opportunity?" |
| **Feel native** | Same DS, same context as Jimvio |

## Jimvio Copilot

| | |
|---|---|
| **What** | Global contextual assistant (lazy-loaded) |
| **Where** | All authenticated surfaces via `JimvioCopilotLoader` |
| **Context** | Route-aware: dashboard, marketplace, product, community |
| **Status** | 🟡 Stub provider → Production per [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md) |
| **Boundaries** | Read-only tools; no payment/order writes |

## AI Search

| | |
|---|---|
| **What** | Natural language → product filters → `match_products` RPC |
| **Where** | Marketplace, Copilot tool |
| **Stack** | Gemini embeddings + intent parsing |
| **Status** | ✅ Production (API route) |

## AI Recommendations

| | |
|---|---|
| **What** | Opportunity Engine scoring; personalized marketplace rails |
| **Where** | Dashboard, marketplace browse |
| **Signals** | Cart, views, searches, role |
| **Status** | ✅ Opportunity Engine; ✅ Personalized feed |

## AI Seller Assistant

| | |
|---|---|
| **What** | Store insights, inventory suggestions, campaign tips |
| **Where** | Seller Hub, Copilot (context: vendor) |
| **Phase** | v1.1 with production Copilot |
| **Boundaries** | Suggestions only; seller approves all changes |

## AI Creator Assistant

| | |
|---|---|
| **What** | Earnings guidance, UGC matching, content strategy |
| **Where** | Creator Hub, Copilot (context: influencer) |
| **Phase** | v1.1 |
| **Boundaries** | No auto-publish; no auto-submit |

## AI Affiliate Assistant

| | |
|---|---|
| **What** | Product promotion recommendations, commission optimization |
| **Where** | Affiliate Hub, Opportunity Engine |
| **Phase** | v1.1 |
| **Boundaries** | Link generation requires user tap |

## AI Analytics

| | |
|---|---|
| **What** | Anomaly explanation, trend summaries, NL metric queries |
| **Where** | Analytics dashboards, Copilot |
| **Phase** | v1.2 |
| **Boundaries** | Own data only; no cross-user analytics |

## AI Automation

| | |
|---|---|
| **What** | Bounded workflows (e.g., daily digest, restock alerts) |
| **Phase** | v2.0 — user-approved agents only |
| **Rule** | Every automated action requires explicit user opt-in |

## AI Safety

| Category | Control |
|----------|---------|
| **Prompt injection** | Hardened system prompt; delimited user input |
| **PII** | No email/phone/payment details to LLM |
| **Financial** | AI never initiates payment, refund, or payout |
| **Rate limits** | 50 messages/user/day (configurable) |
| **Audit** | `ai_usage_logs` — tokens, tools, no message content |
| **Failover** | Friendly unavailable message; no fake data |
| **Human override** | User always has final authority |

*Full spec: [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md) · [Product Blueprint Part 6](../product-blueprint/JIMVIO-PRODUCT-BLUEPRINT-v1.0.md)*

---

# PART 5 — ENGINEERING

Engineering at Jimvio follows documented governance. **This section references — does not duplicate — official standards.**

*Implementation checklist: [Platform Standards v1.0](../platform-standards/JIMVIO-PLATFORM-STANDARDS-v1.0.md)*

## Engineering Constitution

| Principle | Rule |
|-----------|------|
| Protect existing functionality | Never break working features |
| Small safe changes | Minimum-file diffs |
| Reuse first | Search codebase before creating |
| Production-ready | Loading, error, empty, success states |
| Type-safe | Strict TypeScript; no `any` |
| Accessible | Keyboard, SR, reduced motion |

## Platform Laws

*Canonical reference: [Ten Commandments v1.0](../ten-commandments/JIMVIO-TEN-COMMANDMENTS-v1.0.md)*

| Law | Commandment | Summary |
|-----|-------------|---------|
| Do not break what works | 1 — Protect the Platform | Isolated changes only |
| Everything reusable | 3 — Reuse Everything | No one-page-only code |
| One source of truth | 3 — Reuse Everything | No duplicate components/hooks/services |
| One system language | 2 — One Ecosystem | DS tokens everywhere |
| Full async UX | 8 — Every Screen Must Create Value | Loading/success/error/empty/retry |
| Scale for millions | 9 — Every Feature Must Scale | Lazy load, GPU motion, stateless server |
| Performance required | 5 — Performance Is a Feature | CWV green |
| AI feels native | 7 — AI Should Feel Native | Not bolted on |
| No dead ends | 8 — Every Screen Must Create Value | Next action always |
| Every commit improves platform | 10 — Leave the Platform Better | No new debt |

## Design System (engineering)

- New UI: `@/components/design-system` (`Ds*` components)
- Tokens: `@/lib/design-system` + `styles/jimvio-design-system.css`
- Legacy: `components/ui/*` preserved until focused migration
- **Never** a third button/card/input implementation

*Full reference: [Design System](../design-system/README.md) · [ADR-001](../adr/001-design-system-foundation.md)*

## Architecture

| Document | Scope |
|----------|-------|
| [System Architecture](../system-architecture/) | Domains, events, communication, scale, DR |
| [Technical Architecture](../technical-architecture/) | Next.js 16, Supabase, APIs, frontend/backend |
| [ADRs](../adr/) | Decision records |

**Stack:** Next.js 16 · React 19 · TypeScript · Supabase Postgres · Vercel · Cloudinary · Multi-gateway payments

**Stance:** Modular monolith; extract services on evidence, not prematurely.

## Quality Gates

Eight blocking gates before production (tier-dependent):

Product → Architecture → Design → Security → Performance → Accessibility → QA → Release

*Full process: [Operating Model Part 4](../operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md)*

## Coding standards

| Standard | Detail |
|----------|--------|
| **Execution Protocol** | Understand → Plan → Implement → Verify → Quality → Review → Complete |
| **JPES** | No prototype code; production-grade always |
| **Protected domains** | Auth, payments, checkout, orders — Tier 1 lifecycle |
| **API** | Server actions (mutations) + REST (webhooks/cron) |
| **State** | Zustand UI only; business data in Postgres |
| **Commits** | Meaningful; no `console.log`; no dead code |
| **Testing** | `tsc` + lint required; automated tests (roadmap) |

---

# PART 6 — DESIGN

Design at Jimvio is **one language** — no exceptions.

## Design philosophy

Simple · Fast · Trustworthy · Modern · Accessible · Consistent · Professional

Never decorative. Never distracting. Motion: 150–220ms, GPU-only, `prefers-reduced-motion`.

## Design tokens

| Category | Source |
|----------|--------|
| Colors | `--color-*` (globals) + `dsColors` |
| Spacing | `--space-1` … `--space-10` |
| Radius | `--radius-sm` … `--radius-full` |
| Elevation | `--ds-elevation-0` … `4` |
| Typography | `--ds-text-xs` … `3xl` |
| Duration | `--ds-duration-fast/normal/slow` |
| Z-index | `--ds-z-*` |

## Typography

- **Primary font:** DM Sans (`--font-dm-sans`)
- **Scale:** xs (11px) → 3xl (24px) via DS tokens
- **Tracking:** `--ds-tracking-normal` (-0.01em) on headings

## Spacing

8px base grid via `--space-*` tokens. No arbitrary margin/padding in new code.

## Motion

| Utility | Use |
|---------|-----|
| `ds-motion-fade-in` | Panel enter |
| `ds-motion-slide-up` | Bottom sheets |
| `ds-motion-scale-in` | Cards |
| `ds-gpu` | Transform animations |
| `ds-focus-ring` | Focus states |

## Accessibility

| Requirement | Standard |
|-------------|----------|
| Keyboard | All interactive elements |
| Focus | Visible `ds-focus-ring` |
| Screen readers | Labels, `aria-*`, live regions |
| Color | Never sole indicator of state |
| Motion | `prefers-reduced-motion` respected |
| Target | WCAG 2.1 AA on new DS surfaces |

## Responsive

| Breakpoint | Target |
|------------|--------|
| Mobile | 320px+ (primary) |
| Tablet | 768px+ |
| Laptop | 1024px+ |
| Desktop | 1280px+ |
| Ultra-wide | 1920px+ |

Mobile-first. Touch targets ≥ 44px.

## Component library

| Layer | Path | Usage |
|-------|------|-------|
| **Design System** | `components/design-system/` | All new features |
| **Legacy UI** | `components/ui/` | Existing pages (incremental migration) |

**Key primitives:** `DsButton` · `DsInput` · `DsCard` · `DsProductCard` · `DsSkeleton` · `DsEmptyState` · `DsErrorState` · `DsDialog` · `dsToast` · `DsIcon`

*Full reference: [Design System README](../design-system/README.md)*

---

# PART 7 — COMMERCE

Commerce is Jimvio's **transaction engine** — protected Tier 1 domain.

## Products

| | |
|---|---|
| **Types** | Physical, digital, variants |
| **Ownership** | Vendor (seller) |
| **Lifecycle** | Draft → Published → Archived |
| **Media** | Cloudinary; signed uploads |
| **Supply** | CJ Dropshipping import (admin); Shopify sync |
| **Graph** | Commerce Graph rails on detail pages |

## Orders

| | |
|---|---|
| **Lifecycle** | Pending → Paid → Processing → Shipped → Delivered → (Cancelled/Refunded) |
| **Actors** | Buyer, vendor, admin, CJ fulfillment |
| **Realtime** | Supabase `postgres_changes` on status |
| **History** | `order_status_history` audit trail |
| **Rule** | Immutable financial record after payment |

## Checkout

| | |
|---|---|
| **Flow** | Cart → Shipping → Payment method → Pay |
| **Validation** | Server-side price recalculation at payment |
| **Session** | Expiry handling; cart preservation |
| **Multi-vendor** | Consolidated cart; split fulfillment |
| **Rule** | Order synced before payment initiation |

## Wallet

| | |
|---|---|
| **Model** | Internal ledger per user |
| **Credits** | Sales, commissions, UGC payouts, subscriptions |
| **Debits** | Withdrawals, refunds, adjustments |
| **RPC** | `increment_wallet_balance` — atomic |
| **Payouts** | Request → Admin approval → Gateway transfer |
| **Rule** | Server-authoritative balance only |

## Payments

| Gateway | Region / use |
|---------|--------------|
| Flutterwave | Africa cards/mobile |
| PesaPal | East Africa |
| PawaPay | Mobile money |
| PayPal | Global |
| NowPayments | Crypto |
| Binance Pay | Crypto |
| AfriPay | Africa |

| | |
|---|---|
| **Finalization** | `lib/payments/finalize-order-payment.ts` — single path |
| **Idempotency** | `webhook_events.idempotency_key` |
| **Community** | `community-payment-finalizer.ts` for subscriptions |
| **Rule** | Never finalize from client; webhook signature required |

## Refunds

| Trigger | Actor | Flow |
|---------|-------|------|
| Buyer cancellation (eligible) | System | Auto-initiate if rules met |
| Dispute resolution | Admin | Manual refund → wallet adjust |
| Payment failure reversal | System | No double-credit |

## Shipping

| Source | Detail |
|--------|--------|
| CJ Dropshipping | Rates at checkout; tracking sync |
| Vendor-managed | Seller provides tracking |
| Future | Multi-carrier labels (roadmap) |

## Taxes

| Status | Approach |
|--------|----------|
| **Today** | Price inclusive where required; vendor responsibility |
| **Future** | Tax calculation service by region (36-month roadmap) |

## Discounts & coupons

| Status | Detail |
|--------|--------|
| **Today** | Flash deals; vendor pricing |
| **Future** | Platform coupons; cart-level discounts (12-month) |

## Bundles

| Status | Roadmap |
|--------|---------|
| **Today** | — |
| **12-month** | Product bundles; upsell at checkout |

## Subscriptions

| Type | Implementation |
|------|----------------|
| **Community tiers** | free / paid / premium — `community-payment-finalizer` |
| **Future** | Seller subscription products; recurring billing |

---

# PART 8 — CREATOR ECONOMY

The creator economy is Jimvio's **differentiation** — not bolted onto commerce, but co-equal.

## Communities

| | |
|---|---|
| **Model** | Hub (`/c`) with feed, spaces, missions, leaderboard |
| **Monetization** | Paid/premium tiers → subscription revenue → wallet |
| **Roles** | Workspace: member, moderator, admin, owner |
| **Growth** | Discovery via Commerce Graph; creator profile linking |
| **Metric** | D30 member retention |

## UGC

| | |
|---|---|
| **Model** | Brands/sellers launch campaigns; creators submit content |
| **Payout** | Performance-based (views/approval) → wallet |
| **Pipeline** | Join → Submit → Review → View sync → Payout trigger |
| **Metric** | Campaign ROI; creator earnings per submission |

## Affiliate

| | |
|---|---|
| **Model** | Trackable links (`/ref/[code]`) → attribution → commission |
| **Attribution** | Server-enforced window; `affiliate_clicks` table |
| **Stacking** | Creators can be sellers + affiliates + UGC simultaneously |
| **Metric** | Click-to-conversion rate |

## Campaigns

| Type | Owner | Surface |
|------|-------|---------|
| UGC campaigns | Seller/brand | UGC Hub |
| Vendor campaigns | Seller | Seller Hub |
| Flash deals | Platform/vendor | Marketplace |
| Future: influencer campaigns | Brand | Creator Hub |

## Live Commerce

| | |
|---|---|
| **Surfaces** | Hub live, `/shorts`, `/live-activities`, video studio |
| **Tracking** | Clip views → creator profile → product |
| **Future** | Shoppable pins during live (12-month) |
| **Metric** | Live-to-commerce conversion |

## Courses

| | |
|---|---|
| **Model** | Structured lessons in communities; tier-gated |
| **Progress** | `lesson_progress` per user |
| **Future** | Certificates; standalone marketplace |
| **Metric** | Completion rate |

## Creator Growth

| Lever | Mechanism |
|-------|-----------|
| **Discovery** | Creator profile, Commerce Graph, Search |
| **Opportunity Engine** | Scored UGC/affiliate/campaign opportunities |
| **AI Copilot** | "What should I focus on?" guidance |
| **Workspace** | Personalized command center |
| **Cross-linking** | Product → Creator → Community → Course loops |

## Creator Reputation

| Today | Future |
|-------|--------|
| Profile completeness | Verified creator badge |
| UGC approval rate | Reputation score |
| Earnings history | Public trust indicators |
| Commerce Graph connections | Endorsements graph |

**Principle:** Reputation earned through platform activity — not bought.

---

# PART 9 — OPERATIONS

## Deployment

| Environment | Platform | Region |
|-------------|----------|--------|
| Development | Local `next dev` | — |
| Preview | Vercel PR | Auto |
| Production | Vercel | `fra1` (Frankfurt) |

Git-integrated deploys. Instant rollback via Vercel.

## Release process

| Phase | Detail |
|-------|--------|
| Tier 1–3 | Full lifecycle + review gates |
| Alpha → Beta → Limited → Gradual → Global | Per [Operating Model Part 5](../operating-model/) |
| Feature flags | `platform_settings` for instant disable |
| Cron | Vercel scheduled jobs (Shopify, CJ, UGC sync, webhook retry) |

## Monitoring

| Tool | Scope |
|------|-------|
| Vercel Analytics | Page views |
| Speed Insights | Core Web Vitals |
| Supabase dashboard | DB, auth |
| `webhook_events` | Payment audit |
| **Target** | Sentry, structured logging, `/api/health` |

## Incident response

| Severity | Response | Commander |
|----------|----------|-----------|
| P0 — payments down, data leak | 15 min | CTO + Founder |
| P1 — major feature broken | 1 hour | Eng lead |
| P2 — degraded | 4 hours | On-call |

Flow: Detect → Triage → Mitigate → Resolve → Retrospective (48h for P0/P1)

## Security

| Layer | Control |
|-------|---------|
| Auth | Supabase + 2FA TOTP + session revocation |
| Authz | RLS + server guards + role enum |
| Payments | Webhook signatures; idempotent finalization |
| Secrets | Vercel env + `platform_secrets`; never client |
| Uploads | Cloudinary signed; auth-gated |
| Admin | Role check + audit (expanding) |

## Compliance

| Area | Status |
|------|--------|
| PCI | No card data on Jimvio — gateway tokenization |
| GDPR | Account deletion; export (roadmap) |
| Regional payments | Gateway selection by market |
| SOC 2 | Future — audit log prerequisite |

## Business continuity

- **Maintenance mode** — non-admins signed out; admins operate
- **Multi-gateway payments** — router failover
- **Backups** — Supabase PITR; Cloudinary CDN
- **RTO/RPO** — T1: <1h / 0 data loss

*Full detail: [System Architecture Part 9](../system-architecture/JIMVIO-SYSTEM-ARCHITECTURE-BLUEPRINT-v1.0.md)*

---

# PART 10 — ROADMAP

Prioritized by **business impact**: revenue, retention, trust, creator/seller success.

## 12 months (2026–2027)

| Quarter | Theme | Key deliverables |
|---------|-------|------------------|
| **Q3 2026** | Foundation | DS adoption; Commerce/Business Graph; Workspace; Super App |
| **Q4 2026** | Intelligence | Production AI ([FS-001]); unified search; push notifications |
| **Q1 2027** | Commerce+ | Shoppable live; Stripe Connect; saved payments |
| **Q2 2027** | Growth | Affiliate tiers; course certificates; seller performance score |

**12-month targets:** 10K+ active creators · $1M+ quarterly GMV · 95%+ payment success · AI Copilot GA

## 24 months (2027–2028)

| Theme | Deliverables |
|-------|--------------|
| **Mobile** | Native iOS/Android apps (shared API) |
| **API** | `/api/v1` — products, orders, webhooks |
| **Creator API** | Embeddable profile/storefront widgets |
| **Intelligence** | ML personalization; demand forecasting |
| **Scale** | Redis cache; job queue; Sentry; CI/CD; test suite |
| **Enterprise** | Org accounts; SSO (early) |

**24-month targets:** 100K+ MAU · Multi-region deployment · Creator API partners

## 36 months (2028–2029)

| Theme | Deliverables |
|-------|--------------|
| **Ecosystem** | Third-party app marketplace |
| **Payments** | Jimvio Pay infrastructure; automated global payouts |
| **Logistics** | 3PL integrations; multi-carrier shipping |
| **AI** | User-approved bounded agents; RAG knowledge base |
| **Data** | Analytics warehouse; cohort/prediction tools |
| **Compliance** | Tax engine; GDPR export; SOC 2 path |

**36-month targets:** 1M+ MAU · Partner ecosystem launch · $100M+ annualized GMV enabled

## 60 months (2030)

| Theme | Deliverables |
|-------|--------------|
| **Platform** | Jimvio as commerce infrastructure (Stripe Connect analogy) |
| **Global** | Regional payment hubs; data residency |
| **AI** | Marketplace intelligence API; creator reputation graph |
| **Scale** | Service mesh; 10M+ user architecture |
| **Enterprise** | Full SSO; SLA tiers; white-label options |

**60-month vision:** Default Creator Commerce OS for emerging markets and global creator economy — trusted, connected, intelligent.

---

## Roadmap principles

1. **Commerce trust first** — never ship features that weaken payments
2. **Creator earnings** — every quarter must improve creator/seller monetization
3. **One platform feel** — shells and graphs before new modules
4. **AI assists** — production AI before autonomous agents
5. **Measure everything** — kill Tier 5 experiments that don't move metrics in 90 days

---

# APPENDIX — DOCUMENT LIBRARY

| Document | Purpose |
|----------|---------|
| **Product Bible (this)** | Permanent executive source of truth |
| [Product Blueprint](../product-blueprint/) | Detailed product specification |
| [System Architecture](../system-architecture/) | Domains, events, scale |
| [Technical Architecture](../technical-architecture/) | Implementation stack |
| [Operating Model](../operating-model/) | Lifecycle, tiers, release |
| [PRDs](../prd/) | Product requirements (PRD-NNN) |
| [Feature Specs](../feature-specs/) | Engineering intake (FS-NNN) |
| [Design System](../design-system/) | UI tokens and components |
| [ADRs](../adr/) | Architectural decisions |

---

## Bible maintenance

| Trigger | Action | Approvers |
|---------|--------|-----------|
| New platform module | Update Part 3 | CPO + CTO |
| AI strategy shift | Update Part 4 | CPO + CTO + AI lead |
| Major roadmap change | Update Part 10 | CPO + Founder |
| Values/culture change | Update Part 1 | Founder |
| **Quarterly review** | Full Bible review | CPO + CTO + Founder |

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Founder | | | Proposed |
| CPO | | | Proposed |
| CTO | | | Proposed |

---

**Jimvio Product Bible v1.0**

*Build the business. Not the tool stack.*

*One platform. One trust. One future.*

*End of document*
