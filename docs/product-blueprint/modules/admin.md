# Admin

**Status:** ✅ Production · **Routes:** `/admin/*`

## 1. Purpose

**Platform operations center** — user management, product moderation, order oversight, payment monitoring, UGC governance, disputes, verifications, system analysis, and configuration.

## 2. Target Users

| User | Goal |
|------|------|
| Administrator | Day-to-day platform ops |
| Super Administrator | System config, maintenance, critical actions |
| Support (future) | Scoped user assistance |

## 3. Core Features

**User & vendor management**
- Users, vendors, role toggling (`lib/actions/admin-users.ts`)
- Verifications (`/admin/verifications`)

**Commerce ops**
- Products (`/admin/products/*`), CJ import intel
- Orders (`/admin/orders/*`), CJ order panel
- Payments & transactions (`/admin/payments/*`, `/admin/transactions/*`)
- Disputes (`admin-disputes-table`)
- Payouts (`/dashboard/admin/payouts`)

**Content & community**
- UGC moderation (`/admin/ugc`)
- Reports (`/admin/reports`)
- Messages oversight (`/admin/messages`)

**Platform**
- System analysis (`/admin/system-analysis`)
- Settings (`/admin/settings/*`)
- Shopify admin (`/admin/shopify`)
- Export tools (CSV, XLSX, PDF)
- Maintenance mode (`lib/platform-maintenance.ts`)

## 4. User Journeys

**Moderate product**
```
/admin/products → Review pending → Approve/publish or reject with reason → Seller notified
```

**Resolve dispute**
```
/admin/disputes → Review evidence → Resolve → Wallet adjusted → Parties notified
```

**Revenue report**
```
/admin/reports → Select period → Generate → Export PDF
```

## 5. Permissions

| Action | User | Admin | Super Admin |
|--------|:----:|:-----:|:-----------:|
| Access /admin | ❌ | ✅ | ✅ |
| User role management | ❌ | ✅ | ✅ |
| Maintenance mode | ❌ | ❌ | ✅ |
| Payment refunds | ❌ | ✅ | ✅ |
| System settings | ❌ | 🟡 | ✅ |

## 6. AI Opportunities

- System analysis insights (anomaly detection)
- Dispute resolution summaries
- CJ import recommendations
- Fraud pattern alerts

## 7. Notifications

- Admin alerts for failed payments, disputes
- System health notifications (future)
- Sellers/creators notified of admin actions on their content

## 8. Analytics

- Platform revenue reports
- User growth, role distribution
- CJ import success rates
- Dispute resolution time
- Payment gateway health

## 9. KPIs

| KPI | Target |
|-----|--------|
| Moderation turnaround | < 24h |
| Dispute resolution time | ↓ |
| Admin action audit coverage | 100% |
| Platform uptime | 99.9% |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Support role with scoped access |
| v1.2 | Admin activity audit log UI |
| v1.3 | Automated fraud detection dashboard |
| v2.0 | Multi-region admin delegation |

## 11. Dependencies

- All platform modules
- `lib/actions/admin-*.ts`, `lib/admin/*`
- Service role Supabase client
- Email, Notifications

## 12. Security Considerations

- Admin guard: `user_roles.role === "admin"` + layout check
- `ADMIN_EMAILS` env for maintenance bypass
- Service role only in server routes
- All destructive actions require confirmation
- Audit trail for role changes and payouts
- 2FA recommended for admin accounts

## 13. Accessibility Considerations

- Admin tables keyboard navigable
- Confirmation dialogs accessible
- Status badges with text labels
- High contrast for critical actions (danger variants)
