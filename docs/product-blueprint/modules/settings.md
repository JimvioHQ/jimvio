# Settings

**Status:** ✅ Production · **Routes:** `/dashboard/settings`, `/dashboard/security`, `/dashboard/roles`, `/c/(hubs)/settings`, `/admin/settings/*`

## 1. Purpose

**Account and platform configuration** — profile, security, role activation, payment preferences, commerce defaults, integrations, and feature toggles. Trust foundation for all users.

## 2. Target Users

| User | Goal |
|------|------|
| All authenticated users | Manage account and preferences |
| Seller / Creator | Commerce and integration settings |
| Community Owner | Hub settings |
| Admin | Platform-wide configuration |

## 3. Core Features

**User settings** (`/dashboard/settings`)
- Account profile
- Feature preferences
- Payment settings
- Commerce settings
- Integration connections
- Defaults (`defaults-form.tsx`)
- Storefront form (`storefront-form.tsx`)

**Security** (`/dashboard/security`)
- 2FA TOTP setup (`lib/actions/security.ts`)
- Password management
- Session management

**Roles** (`/dashboard/roles`)
- View and activate roles
- Role activation actions (`lib/actions/account-settings.ts`)

**Community** (`/c/(hubs)/settings`)
- Hub-specific preferences

**Admin** (`/admin/settings/*`)
- Platform settings (`lib/platform-settings*.ts`)
- Payment gateway configuration
- Maintenance mode
- Feature flags

## 4. User Journeys

**Activate creator role**
```
/dashboard/roles → Activate creator → /dashboard/activate/creator → Profile setup → Creator hub unlocked
```

**Enable 2FA**
```
/dashboard/security → Setup TOTP → Scan QR → Verify → 2FA enabled
```

**Configure storefront**
```
/dashboard/settings → Storefront → Logo, banner, bio → Save → Public storefront updated
```

## 5. Permissions

| Action | User | Admin |
|--------|:----:|:-----:|
| Edit own settings | ✅ | ✅ |
| Activate roles | ✅ (eligible) | ✅ |
| Platform settings | ❌ | ✅ |
| Edit other users | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "Help me set up my seller account"
- Settings completeness checklist
- Security recommendations (enable 2FA)

## 7. Notifications

- Security alerts (new login, 2FA changed)
- Role activation confirmation
- Settings save confirmation (toast)

## 8. Analytics

- 2FA adoption rate
- Role activation funnel
- Settings completion rate by role
- Integration connect rate (Shopify, etc.)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Profile completion rate | ↑ |
| 2FA adoption (sellers/admin) | ↑ |
| Role activation completion | ↑ |
| Settings save error rate | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Unified settings hub (one page, sections) |
| v1.2 | Notification preferences granular control |
| v1.3 | API keys for sellers (future API) |
| v2.0 | Organization/team settings |

## 11. Dependencies

- Auth, Roles, Seller Hub, Creator Profiles
- Platform settings shared (`lib/platform-settings-shared.ts`)
- Security actions, account settings actions
- Payments (gateway config admin)

## 12. Security Considerations

- Sensitive settings server-validated
- 2FA secrets never exposed client-side
- Platform payment keys admin-only, env-backed
- Account status checks on settings mutations
- CSRF on all settings forms

## 13. Accessibility Considerations

- All form fields labeled
- Error messages associated with inputs (`aria-describedby`)
- 2FA setup steps clearly numbered
- Toggle switches keyboard accessible
- Success/error toast announced
