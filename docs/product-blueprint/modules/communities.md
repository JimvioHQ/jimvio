# Communities

**Status:** ✅ Production · **Routes:** `/communities`, `/communities/[slug]`, `/communities/create`, `/c/(hubs)/*`

## 1. Purpose

**Community hubs** where creators and owners build audiences — feed, spaces, messages, courses, live, missions, wallet, and membership tiers. The social layer of the Creator Commerce OS.

## 2. Target Users

| User | Goal |
|------|------|
| Community Owner | Build and monetize audience |
| Member | Participate, learn, connect |
| Moderator | Keep community safe |
| Creator | Cross-link community to profile |
| Buyer | Discover communities around interests |

## 3. Core Features

**Public discovery**
- Community browse and detail (`/communities`)
- Community creation (`/communities/create`)
- Commerce + Business Graph on detail pages

**Creator Hub (`/c/(hubs)`)**
- Feed, messages, wallet, analytics
- Per-community routes: courses, events, live, spaces, missions
- Chat rooms and inbox
- Subscribe / membership tiers (free, paid, premium)
- Leaderboard, bookmarks, profile
- Workspace sections (`types/workspace.ts`)

**Legacy creator routes** (`/creator/[communityId]/*`) — dashboard, moderation, settings

## 4. User Journeys

**Member joins community**
```
/communities → Detail → Subscribe (free/paid) → /c/[slug]/feed → Explore spaces
```

**Owner monetizes**
```
Create community → Set paid tier → Members subscribe → Revenue in /c/wallet
```

**Cross-discovery**
```
Product Commerce Graph → Related community → Join → Course enrollment
```

## 5. Permissions

| Action | Guest | Member | Moderator | Owner | Admin |
|--------|:-----:|:------:|:---------:|:-----:|:-----:|
| Browse public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Join / subscribe | ❌ | ✅ | ✅ | ✅ | ✅ |
| Post in feed | ❌ | ✅ | ✅ | ✅ | ✅ |
| Moderate | ❌ | ❌ | ✅ | ✅ | ✅ |
| Billing / settings | ❌ | ❌ | ❌ | ✅ | ✅ |

## 6. AI Opportunities

- Copilot: "Summarize activity in my community"
- Member engagement recommendations
- Content moderation assist (flag, not auto-remove)
- Community growth opportunities (Opportunity Engine)

## 7. Notifications

- New member joined (owner)
- New message in chat
- Mission completed
- Subscription payment success/failure
- Type: `community` in notifications

## 8. Analytics

- Member count, growth rate
- Post engagement
- Subscription revenue
- Community analytics (`/dashboard/community/analytics`, `/c/analytics`)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Member retention (30-day) | ↑ |
| Paid conversion rate | ↑ |
| Daily active members | ↑ |
| Moderation response time | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Complete workspace sections marked `ready: false` |
| v1.2 | Community discovery personalization |
| v1.3 | Cross-community events |
| v2.0 | Community API / embed widgets |

## 11. Dependencies

- Courses, Live Commerce, Messaging, Wallet, Payments
- Commerce Graph, Business Graph
- `services/communityService.ts`, `lib/community/*`
- Community payment finalizer

## 12. Security Considerations

- Hub auth path gating (`lib/community/hub-auth.ts`)
- Paid content access control (`services/accessControl.ts`)
- Moderation audit trail
- Subscription webhook integrity

## 13. Accessibility Considerations

- Feed keyboard navigation
- Chat ARIA live regions
- Membership tier selection accessible
- Mobile-first hub layout (primary)
