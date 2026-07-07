# Payments

**Status:** ✅ Production · **Routes:** `/dashboard/payments`, `/admin/payments/*`, `/admin/transactions/*`, `/api/payments/*`, `/api/webhooks/*`

## 1. Purpose

**Multi-gateway payment infrastructure** for checkout, community subscriptions, and vendor payouts. Region-flexible, webhook-driven, with unified verification and order finalization.

## 2. Target Users

| User | Goal |
|------|------|
| Buyer | Pay securely with local/global methods |
| Seller / Creator | Receive funds (via Wallet) |
| Community Owner | Collect subscriptions |
| Admin | Monitor transactions, resolve failures |

## 3. Core Features

**Gateways (configurable):** Flutterwave, PesaPal, PayPal, NowPayments, PawaPay, Binance Pay, AfriPay

- Payment initialization (`payments/initialize`, `initialize-cart`)
- Provider-specific initiate routes
- Unified webhook handler (`webhooks/payment`)
- Payment verification (`payments/verify/[id]`)
- Order finalization (`lib/payments/finalize-order-payment.ts`)
- Community subscription finalizer
- Failed credit recovery (admin)
- Payment method selector UI
- Provider router (`lib/payments/router.ts`)

> **Note:** Stripe referenced in schema/settings for vendor accounts; live card flow routes through configured gateways.

## 4. User Journeys

**Buyer pays**
```
Checkout → Select method → Redirect/SDK → Gateway → Webhook → Order confirmed → Wallet credited (seller)
```

**Crypto payment**
```
Select NowPayments → QR/address → IPN webhook → Verify → Confirm
```

**Mobile money (PawaPay)**
```
Select PawaPay → Phone prompt → Callback → Sync status → Confirm
```

## 5. Permissions

| Action | Buyer | Seller | Admin |
|--------|:-----:|:------:|:-----:|
| Initiate payment | Own checkout | ❌ | ❌ |
| View transactions | Own | Own store | All |
| Refund / void | ❌ | ❌ | ✅ |
| Configure gateways | ❌ | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "Which payment method is cheapest for me?"
- Failed payment diagnosis in plain language
- Fraud pattern alerts (admin, future)

## 7. Notifications

- Payment success (email + in-app)
- Payment failure with retry CTA
- Payout sent
- Admin: failed webhook alerts

## 8. Analytics

- Revenue by gateway
- Payment success/failure rate
- Average payment completion time
- Webhook processing latency
- Admin revenue reports (`lib/admin/build-revenue-report.ts`)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Payment success rate | > 95% |
| Webhook processing time | < 5s |
| Failed payment recovery | ↑ |
| Gateway uptime | 99.9% |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Stripe Connect live integration |
| v1.2 | Saved payment methods |
| v1.3 | Split payments multi-vendor |
| v2.0 | Payment orchestration dashboard |

## 11. Dependencies

- Checkout, Orders, Wallet
- All gateway SDKs/APIs
- Email, Notifications
- Platform settings (`lib/platform-settings-shared.ts`)

## 12. Security Considerations

- **Never modify payment logic without explicit approval**
- Webhook signature verification per provider
- Idempotent finalization (no double-credit)
- PCI: no raw card storage on Jimvio
- Service role for webhook DB writes only
- Secrets in environment variables only

## 13. Accessibility Considerations

- Payment method options keyboard selectable
- Loading state with "Processing payment" announcement
- Error messages human-readable
- No timeout without explanation and retry
