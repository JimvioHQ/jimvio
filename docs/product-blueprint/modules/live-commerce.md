# Live Commerce

**Status:** ✅ Production · **Routes:** `/c/(hubs)/live`, `/c/(hubs)/[slug]/live`, `/live-activities`, `/shorts`

## 1. Purpose

**Real-time engagement and shoppable content** — live streams within communities, clip/shorts feed, and live activity discovery. Bridges entertainment to commerce.

## 2. Target Users

| User | Goal |
|------|------|
| Creator | Go live, sell during stream |
| Community Owner | Host community events |
| Member | Watch, engage, purchase |
| Buyer | Discover via shorts/clips |

## 3. Core Features

- Hub live page (`hub-live-page.tsx`)
- Per-community live routes
- Live activities feed (`/live-activities`)
- Shorts / clips feed (`/shorts`)
- Clip view tracking (`/api/clips/track-view`)
- Live API (`/api/c/live/route.ts`)
- Integration with video studio (`/dashboard/influencer/videos`)
- Creator Command Center live activity widget

## 4. User Journeys

**Creator goes live**
```
/dashboard/influencer/videos → Studio → Go live → /c/[slug]/live → Audience watches → Product links
```

**Viewer discovers clip**
```
/shorts → Watch clip → View tracked → Creator profile → Product purchase
```

**Community event**
```
/live-activities → Join community live → Engage in chat → Explore products
```

## 5. Permissions

| Action | Guest | Member | Creator | Owner | Admin |
|--------|:-----:|:------:|:-------:|:-----:|:-----:|
| Watch public live | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Go live | ❌ | ❌ | ✅ | ✅ | ✅ |
| Moderate chat | ❌ | ❌ | ❌ | ✅ | ✅ |

## 6. AI Opportunities

- Copilot: "When should I go live for my audience?"
- Live transcript summaries (future)
- Product highlight moments (future)
- Clip performance insights

## 7. Notifications

- Creator went live (followers/members)
- Live starting soon reminder (future)
- Clip milestone views

## 8. Analytics

- Live viewer count
- Clip views (`short_video_views`)
- View-to-profile-click rate
- Live-to-purchase conversion (future)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Live session duration | ↑ |
| Clip view completion rate | ↑ |
| Live-to-commerce conversion | ↑ |
| Stream start latency | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Shoppable product pins during live |
| v1.2 | Live replay with chapters |
| v1.3 | Multi-host live rooms |
| v2.0 | Native RTMP ingest |

## 11. Dependencies

- Communities, Products, Creator Profiles
- Video studio, clip tracking
- Messaging (live chat)
- `lib/community/hub-live-types.ts`

## 12. Security Considerations

- Live stream auth tokens time-limited
- Chat moderation tools
- Age-appropriate content policies
- View count anti-inflation

## 13. Accessibility Considerations

- Live player keyboard controls
- Chat keyboard navigable
- Reduced motion option for autoplay clips
- Captions for live (future)
