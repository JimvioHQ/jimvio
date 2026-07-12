# Wallet

**Status:** ✅ Production · **Routes:** `/dashboard/wallet`, `/dashboard/withdrawals`, `/dashboard/earnings`, `/c/(hubs)/wallet`

## 1. Purpose

Unified **earnings and balance management** for sellers, creators, affiliates, and community owners. Transparent ledger of credits, debits, and payout requests.

## 2. Target Users

| User | Goal |
|------|------|
| Seller | View sales revenue, request payouts |
| Creator | UGC + affiliate + course earnings |
| Affiliate | Commission balance |
| Community Owner | Subscription revenue |
| Admin | Oversee payouts, failed credits |

## 3. Core Features

- Balance display with realtime updates (Supabase)
- Transaction history by role
- Withdrawal requests (`/dashboard/withdrawals`)
- Earnings breakdown (`/dashboard/earnings`)
- Community hub wallet (`/c/(hubs)/wallet`)
- Vendor wallet API (`/api/vendor/wallet`)
- Super App wallet panel (global quick view)
- Payout via Binance, vendor payout request flow

## 4. User Journeys

**Creator checks earnings**
```
/dashboard/earnings → Breakdown by source (UGC, affiliate, products) → /dashboard/wallet → Request withdrawal
```

**Community owner**
```
/c/(hubs)/wallet → Subscription revenue → Payout request
```

**Payout processing**
```
Request withdrawal → Admin review → Payout sent → Email notification
```

## 5. Permissions

| Action | Buyer | Seller | Creator | Affiliate | Comm. Owner | Admin |
|--------|:-----:|:------:|:-------:|:---------:|:-----------:|:-----:|
| View balance | ❌ | Own | Own | Own | Own | All |
| Request payout | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve payout | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "How much did I earn this month?"
- Earnings forecast based on trends
- Payout timing recommendations

## 7. Notifications

- Payout sent (email + in-app)
- Failed credit alert (admin)
- Minimum payout threshold reminder (future)
- New earnings credited

## 8. Analytics

- Total platform payouts
- Earnings by role and source
- Average time to payout
- Failed credit rate

## 9. KPIs

| KPI | Target |
|-----|--------|
| Payout processing time | ↓ |
| Wallet page load (realtime) | < 1s |
| Earnings transparency score | ↑ |
| Payout failure rate | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Multi-currency wallet display |
| v1.2 | Automated payout schedules |
| v1.3 | Tax document generation |
| v2.0 | Wallet API for third-party apps |

## 11. Dependencies

- Payments, Orders, UGC, Affiliate, Communities
- `lib/actions/wallet.ts`
- Admin payouts (`/dashboard/admin/payouts`)
- Email transactional

## 12. Security Considerations

- Balance reads server-authoritative only
- Payout requests require authenticated role
- Admin payout actions audited
- No balance manipulation client-side
- Withdrawal limits and fraud checks

## 13. Accessibility Considerations

- Balance announced with currency and context
- Transaction table keyboard navigable
- Payout request form fully labeled
- Loading skeleton for balance (prevent layout shift)
