# Orders

**Status:** ✅ Production · **Routes:** `/orders/[id]`, `/dashboard/orders`, `/dashboard/orders/[id]`, `/dashboard/vendor/orders/*`, `/admin/orders/*`

## 1. Purpose

End-to-end **order lifecycle management** — from placement through fulfillment, tracking, cancellation, and refunds. Single source of truth for transaction history across buyer, seller, and admin views.

## 2. Target Users

| User | Goal |
|------|------|
| Buyer | Track purchases, cancel, reorder |
| Seller | Fulfill, manage vendor orders |
| Admin | Oversee disputes, CJ fulfillment, exports |
| Support | Resolve order issues (future) |

## 3. Core Features

- Buyer order list and detail (`/dashboard/orders`)
- Vendor order management (`/dashboard/vendor/orders`)
- Admin order panel with CJ integration
- Order lifecycle states (`lib/actions/order-lifecycle.ts`)
- Realtime order updates (Supabase)
- Invoice generation
- Reorder / add-to-cart from past orders
- Order status history
- Tracking card (`components/orders/TrackingCard.tsx`)

## 4. User Journeys

**Buyer tracks order**
```
Purchase complete → /dashboard/orders → Order detail → Tracking updates → Delivery confirmation
```

**Seller fulfills**
```
/dashboard/vendor/orders → New order alert → Mark processing → Ship → Tracking added
```

**Buyer cancels**
```
Order detail → Cancel (if eligible) → Refund initiated → Notification
```

## 5. Permissions

| Action | Buyer | Seller | Admin |
|--------|:-----:|:------:|:-----:|
| View own orders | ✅ | — | ✅ |
| View vendor orders | — | Own store | ✅ |
| Cancel | Own (rules) | ❌ | ✅ |
| Refund | ❌ | ❌ | ✅ |
| Export | Own | Own | ✅ |

## 6. AI Opportunities

- Copilot: "Where is my order #12345?"
- Proactive delay notifications with explanation
- Reorder suggestions based on purchase history

## 7. Notifications

- Order confirmed (email + in-app)
- Payment success/failure
- Shipped with tracking
- Delivered
- Cancelled / refunded
- Types: `order`, `payment` in notifications table

## 8. Analytics

- Orders by status over time
- Average fulfillment time
- Cancellation rate
- Revenue per order (admin reports)
- CJ order sync success rate

## 9. KPIs

| KPI | Target |
|-----|--------|
| Order confirmation latency | < 3s |
| Fulfillment SLA compliance | ↑ |
| Cancellation rate | ↓ |
| Buyer reorder rate | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Proactive shipping delay alerts |
| v1.2 | Split shipments per vendor |
| v1.3 | Buyer-initiated return flow |
| v2.0 | Order API for external ERP |

## 11. Dependencies

- Checkout, Payments, Wallet, Notifications
- CJ order service (`services/cj/cj-order-service.ts`)
- Email transactional (`lib/email/transactional.ts`)

## 12. Security Considerations

- Buyers see only own orders (server-enforced)
- Vendors see only own store orders
- Admin actions audited
- No payment credentials in order detail UI
- PII minimized in exports

## 13. Accessibility Considerations

- Order status communicated with text + icon (not color alone)
- Timeline keyboard navigable
- Screen reader announces status changes (realtime)
- Cancel confirmation dialog accessible
