# Seller Hub

**Status:** ✅ Production · **Routes:** `/dashboard/vendor/*`, `/dashboard/inventory`, `/dashboard/customers`

## 1. Purpose

Operational **command center for sellers** — store setup, catalog management, order fulfillment, campaigns, inventory, and customer relationships.

## 2. Target Users

| User | Goal |
|------|------|
| Seller (vendor) | Run online store on Jimvio |
| Brand | Campaign-driven selling |
| Admin | Vendor oversight |

## 3. Core Features

- Store setup (`/dashboard/vendor/setup`)
- Storefront management (`/dashboard/vendor/store`)
- Vendor orders (`/dashboard/vendor/orders`)
- Vendor campaigns (`/dashboard/vendor/campaigns`)
- Inventory management (`/dashboard/inventory`)
- Customer list (`/dashboard/customers`)
- Shopify connect (`/api/shopify/connect`)
- Vendor analytics (`/dashboard/vendor/analytics`)
- Role activation (`/dashboard/activate/vendor`)

## 4. User Journeys

**New seller onboarding**
```
Activate vendor → /dashboard/vendor/setup → Store details → Add products → First sale
```

**Daily operations**
```
/dashboard/vendor/orders → Fulfill → Update tracking → /dashboard/vendor/analytics
```

**Campaign launch**
```
/dashboard/vendor/campaigns → Create → Link products → Promote via affiliate/creator
```

## 5. Permissions

| Action | Buyer | Seller | Admin |
|--------|:-----:|:------:|:-----:|
| Access vendor hub | ❌ | ✅ | ✅ |
| Manage store | ❌ | Own | ✅ |
| View vendor orders | ❌ | Own | ✅ |
| Shopify connect | ❌ | Own | ✅ |

## 6. AI Opportunities

- Copilot: "What are my top-selling products this week?"
- Inventory reorder suggestions
- Pricing optimization recommendations
- Campaign performance insights

## 7. Notifications

- New order (realtime)
- Low stock (future)
- Campaign milestone
- Payout credited

## 8. Analytics

- GMV, orders, AOV
- Campaign analytics API
- Customer repeat rate
- Fulfillment SLA

## 9. KPIs

| KPI | Target |
|-----|--------|
| Seller activation completion | ↑ |
| Time to first product listed | ↓ |
| Order fulfillment rate | ↑ |
| Seller retention (30-day) | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Bulk order fulfillment |
| v1.2 | Automated shipping labels |
| v1.3 | Seller performance score |
| v2.0 | Multi-store per account |

## 11. Dependencies

- Products, Orders, Payments, Wallet
- Shopify integration
- Vendor actions (`lib/actions/vendor.ts`)
- Opportunity Engine (seller opportunities)

## 12. Security Considerations

- Vendor data isolation (own store only)
- Shopify OAuth token secure storage
- Admin vendor actions audited

## 13. Accessibility Considerations

- Dashboard tables keyboard navigable
- Order status not color-only
- Setup wizard step indicators for screen readers
