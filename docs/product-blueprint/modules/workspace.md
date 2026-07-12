# Workspace

**Status:** ✅ Production · **Scope:** `/dashboard` (embedded)

## 1. Purpose

**Customizable command surface** for creators and power users — widget grid, module navigation, layout persistence. Personal operating environment within Jimvio.

## 2. Target Users

| User | Goal |
|------|------|
| Creator | Personalized dashboard |
| Seller | Quick access to key metrics |
| Community Owner | Community ops at a glance |
| Entrepreneur | Unified business view |

## 3. Core Features

- Widget grid with drag/resize (`jimvio-workspace/`)
- Module navigation
- Layout persistence (`use-workspace-store.ts`, localStorage)
- Move, resize, hide, pin, reset layout
- `mapDashboardToWorkspace()` adapter
- Embedded in `/dashboard` before Creator Command Center
- Notification center widget
- Bridges Jimvio OS workspace switcher

## 4. User Journeys

**Customize workspace**
```
/dashboard → Edit layout → Drag widgets → Pin favorites → Reset if needed → Layout saved
```

**Daily workflow**
```
/dashboard → Workspace widgets (earnings, orders, opportunities) → Click through to module
```

**OS integration**
```
Jimvio OS → Switch workspace mode → Workspace layout updates
```

## 5. Permissions

| Action | Guest | Authenticated |
|--------|:-----:|:-------------:|
| View workspace | ❌ | ✅ |
| Customize layout | ❌ | Own |
| Share layout (future) | ❌ | ❌ |

## 6. AI Opportunities

- Copilot: "Add earnings widget to my workspace"
- Smart widget recommendations based on role
- Layout optimization suggestions

## 7. Notifications

- Workspace notification center widget
- Badge sync with global notifications

## 8. Analytics

- Widget usage frequency
- Layout customization rate
- Widget click-through to modules

## 9. KPIs

| KPI | Target |
|-----|--------|
| Workspace customization rate | ↑ |
| Widget engagement | ↑ |
| Dashboard return frequency | ↑ |
| Layout reset rate | ↓ (indicates good defaults) |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Role-specific default layouts |
| v1.2 | Widget marketplace (approved widgets) |
| v1.3 | Multi-workspace profiles |
| v2.0 | Workspace templates for teams |

## 11. Dependencies

- Creator Command Center, Opportunity Engine
- Analytics widgets
- Jimvio OS, Notifications
- `lib/jimvio-workspace/`, `lib/store/use-workspace-store.ts`

## 12. Security Considerations

- Layout data user-scoped in localStorage
- Widgets cannot expose other users' data
- Widget data fetched with same auth as source module

## 13. Accessibility Considerations

- Widget grid keyboard navigable (future drag alternative)
- Pin/hide actions keyboard accessible
- Widget content inherits module a11y
- Reduced motion for drag animations
