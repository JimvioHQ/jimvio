# Analytics

**Status:** ✅ Production · **Routes:** `/dashboard/analytics`, role-specific analytics pages, `/c/(hubs)/analytics`

## 1. Purpose

**Data-driven growth** for every role — buyers, sellers, creators, affiliates, and community owners see relevant metrics. Feeds Workspace widgets and Opportunity Engine.

## 2. Target Users

| User | Goal |
|------|------|
| Buyer | Spending insights, purchase history |
| Seller | GMV, orders, campaigns |
| Creator | Views, earnings, UGC performance |
| Affiliate | Clicks, conversions, commissions |
| Community Owner | Members, engagement, revenue |
| Admin | Platform-wide revenue and health |

## 3. Core Features

**Role dashboards**
- Buyer: `/dashboard/buyer/analytics`
- Vendor: `/dashboard/vendor/analytics`
- Affiliate: `/dashboard/affiliate/analytics`
- Influencer: `/dashboard/influencer/analytics`
- Community: `/dashboard/community/analytics`
- Hub: `/c/(hubs)/analytics`

**Services & APIs**
- `services/dashboard-analytics.ts` — buyer/community stats
- `services/creator-analytics.ts` — creator metrics
- APIs: `/api/buyer/analytics`, `/api/creator/analytics`, `/api/community/analytics`, `/api/vendor/campaigns/analytics`

**Platform**
- Vercel Analytics + Speed Insights (global)
- Platform stats provider (homepage marketing)
- Admin reports (`/admin/reports`, export CSV/XLSX/PDF)
- `AnalyticsPageBoard.tsx` shared UI
- `DsAnalyticsCard` (Design System)

## 4. User Journeys

**Creator reviews performance**
```
/dashboard/influencer/analytics → Views, UGC, earnings chart → Identify top content → Create more
```

**Seller optimizes**
```
/dashboard/vendor/analytics → GMV trend → Campaign comparison → Adjust strategy
```

**Admin reports**
```
/admin/reports → Revenue report → Export PDF → Share with leadership
```

## 5. Permissions

| Action | Buyer | Seller | Creator | Affiliate | Comm. Owner | Admin |
|--------|:-----:|:------:|:-------:|:---------:|:-----------:|:-----:|
| Own analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Platform analytics | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export | Own | Own | Own | Own | Own | All |

## 6. AI Opportunities

- Copilot: "Explain my earnings drop this month"
- Anomaly detection alerts
- Opportunity Engine scoring from analytics signals
- Natural language queries over metrics (future)

## 7. Notifications

- Milestone alerts (earnings, followers — future)
- Anomaly detection (future)
- Weekly digest (future)

## 8. Analytics

*(Meta — tracks itself and all modules)*

| Signal | Source |
|--------|--------|
| Product views | `product_views` |
| Affiliate clicks | `affiliate_clicks` |
| Video views | `short_video_views` |
| UGC views | `ugc_view_snapshots` |
| Orders | `orders`, `transactions` |
| Personalization | `lib/marketplace/personalization/signals.ts` |

## 9. KPIs

| KPI | Target |
|-----|--------|
| Analytics page load | < 2s |
| Data freshness | < 5 min |
| Dashboard engagement (weekly) | ↑ |
| Export success rate | > 99% |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Unified analytics API |
| v1.2 | Cohort analysis |
| v1.3 | Predictive forecasting |
| v2.0 | Embedded analytics for external sites |

## 11. Dependencies

- All revenue and engagement modules
- Workspace, Opportunity Engine, Creator Command Center
- Admin export (`lib/admin/build-revenue-report.ts`)
- Design System (`DsAnalyticsCard`, `DsDashboardCard`)

## 12. Security Considerations

- Role-scoped data access server-enforced
- Admin exports audited
- No cross-tenant data leakage
- Aggregate-only for comparative benchmarks (future)

## 13. Accessibility Considerations

- Charts paired with data tables
- Trend indicators not color-only (arrows + text)
- Screen reader summaries for key metrics
- Keyboard navigable date range selectors
