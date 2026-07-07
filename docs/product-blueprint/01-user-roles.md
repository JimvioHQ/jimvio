# User Roles & Permissions

## Overview

Jimvio uses a **multi-role model**: one account can hold multiple platform roles. Dashboard navigation and feature access are gated by active role. Community workspaces have a **separate role hierarchy** independent of platform roles.

---

## Platform roles

### Implementation mapping

| Blueprint role | DB `user_role` | Dashboard nav | Status |
|----------------|----------------|---------------|--------|
| Guest | *(none — unauthenticated)* | Public routes only | ✅ |
| Buyer | `buyer` | Buyer dashboard sections | ✅ |
| Seller | `vendor` | Vendor hub, products, orders | ✅ |
| Creator | `influencer` | Influencer hub, studio, UGC | ✅ |
| Affiliate | `affiliate` | Links, affiliate products, analytics | ✅ |
| Brand | `vendor` *(brand storefront)* | Vendor + campaigns | 🟡 Brand is a business type, not separate role |
| Community Owner | `community_owner` | Community analytics, hub admin | ✅ |
| Moderator | *(workspace role)* | Community moderation tools | ✅ |
| Support | *(admin subset — future)* | Ticket queue, user lookup | 🔜 |
| Administrator | `admin` | `/admin/*` full platform ops | ✅ |
| Super Administrator | `admin` + `ADMIN_EMAILS` | Maintenance bypass, system config | ✅ |

> **Naming note:** UI says "Creator"; database stores `influencer`. Activation at `/dashboard/activate/creator`.

---

## Role capabilities matrix

| Capability | Guest | Buyer | Seller | Creator | Affiliate | Comm. Owner | Moderator | Admin |
|------------|:-----:|:-----:|:------:|:-------:|:---------:|:-----------:|:---------:|:-----:|
| Browse marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase / checkout | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create products | ❌ | ❌ | ✅ | 🟡 | ❌ | ❌ | ❌ | ✅ |
| UGC campaigns | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Affiliate links | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Create community | ❌ | ❌ | 🟡 | ✅ | ❌ | ✅ | ❌ | ✅ |
| Moderate community | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Wallet / withdrawals | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Admin panel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

🟡 = requires role activation or additional setup

---

## Role activation flow

```
Sign up (default: buyer)
    ↓
/dashboard/activate/vendor     → Seller
/dashboard/activate/creator    → Creator (influencer)
/dashboard/activate/affiliate  → Affiliate
Community creation             → community_owner (on create)
Admin assignment               → admin (by super admin)
```

Post-login routing priority: **admin → vendor → affiliate → influencer → buyer**

---

## Community workspace roles

Separate from platform roles (`types/workspace.ts`):

| Role | Capabilities |
|------|-------------|
| **member** | View feed, join spaces, participate in courses, chat |
| **moderator** | Moderate content, manage members (scoped) |
| **admin** | Manage spaces, settings, missions (scoped) |
| **owner** | Full community control, billing, ownership transfer |

### Membership tiers (access control)

| Tier | Access |
|------|--------|
| `free` | Public community content |
| `paid` | Paid subscription content |
| `premium` | Premium tier content and spaces |

---

## Permission enforcement layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| **Middleware** | `lib/supabase/middleware.ts` | Session, `/dashboard`, `/admin`, `/settings` |
| **Hub auth** | `lib/community/hub-auth.ts` | `/c/*` public vs auth-required paths |
| **API guards** | `lib/auth/api-helpers.ts` | `requireAdmin()`, `requireVendorOwnerOrAdmin()` |
| **Account status** | `lib/users/account-status.ts` | Blocks suspended, banned, frozen, deleted |
| **Maintenance mode** | `lib/platform-maintenance.ts` | Non-admins signed out during maintenance |
| **2FA** | `lib/actions/security.ts` | Optional TOTP for account security |
| **Session revocation** | Middleware check | Force sign-out on revoked sessions |

---

## Guest access

Guests can:

- Browse marketplace (physical, digital, flash deals)
- View product detail pages
- Browse communities (partial public content)
- Browse UGC campaigns
- View creator profiles
- Use search (limited personalization)

Guests cannot:

- Checkout, wallet, dashboard, messaging, or role-specific hubs
- Join paid communities or submit UGC without account

---

## Security considerations

- **Least privilege** — roles grant minimum required access
- **Server-side enforcement** — never trust client role state for payments or admin
- **Service role isolation** — service role client only in server API routes
- **Account status gates** — suspended/banned users blocked at middleware
- **Admin audit** — admin actions on users, products, orders should be logged

---

## Accessibility considerations

- Role switcher must be keyboard navigable with visible focus
- Permission-denied states must explain *why* and offer next action (sign in, activate role, upgrade)
- Screen readers should announce role changes in dashboard context

---

## Future roadmap

| Item | Priority |
|------|----------|
| Dedicated Support role with scoped admin read access | Medium |
| Brand role as distinct from vendor (brand verification badge) | Medium |
| Fine-grained permissions (RBAC) beyond role enum | Long-term |
| Organization / team accounts (multi-user seller) | Long-term |

---

## Dependencies

- `user_roles` table (Supabase)
- `lib/auth/post-login-redirect.ts`
- `components/dashboard/sidebar.tsx` (nav gating)
- `app/admin/layout.tsx` (admin guard)
