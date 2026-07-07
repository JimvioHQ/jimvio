# Checkout

**Status:** ✅ Production · **Routes:** `/checkout`, `/checkout/error`, `/payment/session-expired`

## 1. Purpose

Convert cart intent into a **confirmed order** with shipping, payment method selection, and transparent pricing. Must feel fast, trustworthy, and never leave users wondering about charges.

## 2. Target Users

| User | Goal |
|------|------|
| Buyer | Complete purchase securely |
| Guest | Must sign in or create account (policy-dependent) |
| Seller | Receive order (downstream) |

## 3. Core Features

- Multi-vendor cart consolidation
- Shipping address and CJ shipping rates
- Payment method selector (`PaymentMethodSelector.tsx`)
- Order sync before payment (`lib/actions/checkout.ts`)
- Session expiry handling
- Error recovery pages
- Pending variant resolution (cart)
- Currency display via `CurrencyProvider`

## 4. User Journeys

**Standard checkout**
```
Cart → /checkout → Shipping → Payment method → Pay → Order confirmation → /orders/[id]
```

**Payment failure**
```
Pay → Error → Friendly message → Retry or change method → /checkout/error recovery
```

**Session expired**
```
Idle too long → /payment/session-expired → Return to cart with items preserved
```

## 5. Permissions

| Action | Guest | Buyer |
|--------|:-----:|:-----:|
| Access checkout | 🟡 | ✅ |
| Complete payment | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "What payment methods work in Kenya?"
- Shipping estimate explanation
- Cart optimization suggestions before checkout (future)

## 7. Notifications

- Payment success → order confirmation email + in-app
- Payment failure → retry prompt
- Session expiry → return to cart CTA

## 8. Analytics

- Checkout funnel: cart → checkout → payment → confirm
- Drop-off by step
- Payment method distribution
- Average checkout duration

## 9. KPIs

| KPI | Target |
|-----|--------|
| Checkout completion rate | ↑ |
| Payment failure recovery rate | ↑ |
| Checkout page LCP | < 2.5s |
| Session expiry rate | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Guest checkout (if policy allows) |
| v1.2 | Saved addresses and payment preferences |
| v1.3 | One-click reorder checkout |
| v2.0 | Apple Pay / Google Pay native |

## 11. Dependencies

- Cart, Payments, Orders, Products
- Payment providers (see Payments module)
- Shipping (CJ rates)
- Notifications, Email

## 12. Security Considerations

- **Never modify checkout logic without explicit approval** (Platform Law)
- Payment initiation server-side only
- CSRF protection on checkout actions
- Price recalculation server-side at payment time
- No card data touches Jimvio servers (gateway tokenization)

## 13. Accessibility Considerations

- Form fields with labels and error announcements
- Payment method cards keyboard selectable
- Loading state during payment (prevent double-submit)
- Error messages plain language, not error codes
- Focus trap in payment modal flows
