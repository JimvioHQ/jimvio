# Creator Profiles

**Status:** ✅ Production · **Routes:** `/influencers`, `/influencers/[slug]`, `/influencers/u/[userId]`

## 1. Purpose

Universal **public identity surface** for creators — products, courses, UGC, affiliate links, videos, and community presence in one connected profile. Central node in the Commerce and Business Graphs.

## 2. Target Users

| User | Goal |
|------|------|
| Creator | Showcase brand, monetize audience |
| Buyer | Discover creator offerings |
| Brand | Evaluate creator partnerships |
| Affiliate | Cross-promote |

## 3. Core Features

- Public profile with slug (`/influencers/[slug]`)
- Tabbed content: products, courses, UGC, affiliate, videos
- Commerce Graph rails (related products, communities, campaigns)
- Business Graph (collaborations, network, discovery)
- Creator activation flow (`/dashboard/activate/creator`)
- Managed vs owner profile modes
- Social links and bio
- Analytics integration (creator dashboard)

## 4. User Journeys

**Buyer discovers creator**
```
Marketplace Commerce Graph → Creator profile → Browse products → Purchase
```

**Creator builds presence**
```
Activate creator role → Complete profile → Link products → Share /influencers/[slug]
```

**Brand evaluates partnership**
```
Business Graph discovery → Creator profile → UGC tab → Contact / campaign
```

## 5. Permissions

| Action | Guest | Buyer | Creator | Admin |
|--------|:-----:|:-----:|:-------:|:-----:|
| View public profile | ✅ | ✅ | ✅ | ✅ |
| Edit profile | ❌ | ❌ | Own | ✅ |
| Manage linked products | ❌ | ❌ | Own | ✅ |

## 6. AI Opportunities

- Copilot: "Summarize this creator's offerings"
- Collaboration match suggestions (Business Graph)
- Profile completeness recommendations
- Content strategy insights

## 7. Notifications

- New follower (future)
- Profile verification status
- New collaboration request (future)
- Earnings milestones

## 8. Analytics

- Profile views
- Tab engagement rates
- Click-through to products/UGC
- Creator analytics service (`services/creator-analytics.ts`)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Profile completion rate | ↑ |
| Profile-to-product-click | ↑ |
| Creator activation conversion | ↑ |
| Graph rail engagement | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Verified creator badges |
| v1.2 | Custom profile themes (DS-compliant) |
| v1.3 | Creator storefront embed widget |
| v2.0 | Creator API for external portfolios |

## 11. Dependencies

- Products, UGC, Affiliate, Courses, Communities
- Commerce Graph, Business Graph
- Creator Command Center, Analytics
- `lib/creator-profile/`, `components/creator-profile/`

## 12. Security Considerations

- Profile edit requires authenticated owner
- Sanitize bio and external links
- No PII exposure beyond public intent
- Managed profile permissions scoped

## 13. Accessibility Considerations

- Tab navigation keyboard accessible
- Profile image alt text
- Graph rails screen reader friendly
- Mobile-first layout (primary target)
