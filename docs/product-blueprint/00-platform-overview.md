# Platform Overview

## Mission

Enable anyone, anywhere, to **build, grow, and monetize** an online business from one connected platform.

Jimvio is the **Creator Commerce Operating System** — not another marketplace, not another affiliate tool, not another community app. It is the infrastructure layer where commerce, creator economy, AI, and business tools converge.

---

## North Star questions (every feature)

Before implementing anything, every feature must answer **yes** to at least one:

1. Does this help users **succeed**?
2. Does this **reduce friction**?
3. Does this **save time**?
4. Does this **increase trust**?
5. Does this **improve earnings**?
6. Does this **improve discovery**?
7. Does this make Jimvio feel more **connected**?

If none apply — reject or rethink.

---

## Target ecosystem users

| Persona | Primary modules | Success metric |
|---------|-----------------|----------------|
| **Buyers** | Marketplace, Checkout, Orders, Communities | Purchase confidence, repeat rate |
| **Sellers** | Seller Hub, Products, Orders, Analytics | GMV, fulfillment rate |
| **Creators** | Creator Profiles, UGC, Live, Courses | Audience growth, earnings |
| **Affiliates** | Affiliate Hub, Products, Wallet | Clicks, conversions, commissions |
| **Brands** | Seller Hub, UGC, Campaigns, Analytics | Campaign ROI, brand reach |
| **Community owners** | Communities, Courses, Live, Wallet | Member retention, subscription revenue |
| **Students** | Courses, Communities | Completion rate, satisfaction |
| **Entrepreneurs** | Workspace, Opportunity Engine, AI Copilot | Time to first sale |

---

## Global platform shells

These layers make Jimvio feel like **one product** across all modules:

| Shell | Purpose | Scope |
|-------|---------|-------|
| **Jimvio Super App** | Universal dock — modules, wallet, messages, notifications | Global (`app/layout.tsx`) |
| **Command Center (⌘K)** | Universal search and navigation | Global |
| **AI Copilot** | Contextual assistant | Global |
| **Jimvio OS** | Dashboard launcher and workspace switcher | Dashboard |
| **Jimvio Workspace** | Customizable widget grid | Dashboard |
| **Design System (`Ds*`)** | Unified visual language | All new UI |

---

## Commerce intelligence layers

| Layer | Purpose | Surfaces |
|-------|---------|----------|
| **Commerce Graph** | Product ↔ Creator ↔ Community ↔ Campaign relationships | Product pages, creator profiles, communities |
| **Business Graph** | Commercial network, collaborations, discovery | Creator profiles, communities, products |
| **Opportunity Engine** | Scored growth opportunities (UGC, affiliate, campaigns) | Dashboard |
| **Personalized Feed** | Signal-based marketplace rails | Marketplace browse |

---

## Technical architecture (product view)

| Layer | Responsibility |
|-------|----------------|
| **Public surface** | Marketplace, product pages, communities, UGC browse, creator profiles |
| **Authenticated dashboard** | Role-specific hubs (`/dashboard/*`) |
| **Creator Hub (`/c`)** | Community workspace — feed, messages, courses, live, wallet |
| **Admin (`/admin`)** | Platform operations, CJ import, disputes, system analysis |
| **API boundary** | Server actions + REST routes; no client-side business logic for payments |
| **State** | Server state in Supabase; UI state in Zustand stores (workspace, OS, command center) |

---

## Payment ecosystem (global)

Supported gateways (region-configurable):

Flutterwave · PesaPal · PayPal · NowPayments · PawaPay · Binance Pay · AfriPay

Community subscriptions and vendor payouts have dedicated finalization flows.

---

## Data and trust principles

- **Transparency** — explain loading, waiting, payments, and errors in plain language
- **No surprises** — confirm destructive actions; show price breakdowns before pay
- **User owns decisions** — AI recommends; users approve
- **Global by default** — multi-currency, multi-gateway, mobile-first

---

## Long-term evolution (2026–2030)

| Phase | Focus |
|-------|-------|
| **v1.0 (now)** | Connected modules, DS foundation, AI scaffolds, commerce graphs |
| **v1.5** | Deeper cross-module journeys, DS migration of high-traffic surfaces |
| **v2.0** | Native mobile apps sharing same API layer |
| **v3.0** | Creator Commerce Graph as platform API for third-party integrations |

---

## Related documents

- [User Roles & Permissions](./01-user-roles.md)
- [ADR-002: Additive Platform Modules](../adr/002-additive-platform-modules.md)
- [ADR-001: Design System Foundation](../adr/001-design-system-foundation.md)
