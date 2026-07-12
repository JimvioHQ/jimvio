# Notifications

**Status:** ✅ Production · **Routes:** `/dashboard/notifications`

## 1. Purpose

Keep users **informed without overwhelming** — in-app notification center, email for critical events, realtime badges, and toast feedback. Unified across dashboard, OS, and Super App.

## 2. Target Users

| User | Goal |
|------|------|
| All authenticated users | Stay updated on orders, payments, community, messages |
| Admin | System alerts |

## 3. Core Features

- In-app notifications table (Supabase)
- Types: `order`, `payment`, `affiliate`, `influencer`, `community`, `system`, `review`, `message`
- Mark read / dismiss (`lib/actions/notifications.ts`)
- Core service (`lib/notifications/notify-user.ts`) — insert + optional email
- Realtime via `postgres_changes`
- UI surfaces:
  - `/dashboard/notifications`
  - Dashboard shell badge
  - `WorkspaceNotificationCenter`
  - `OsNotificationPanel`
  - `SuperAppNotificationsPanel`
- Toast (Sonner) for immediate feedback
- Transactional email (`lib/email/transactional.ts`)

## 4. User Journeys

**Order update**
```
Payment completes → notify-user → In-app notification + email → User taps → Order detail
```

**Dismiss noise**
```
/dashboard/notifications → Mark all read → Badge clears
```

**Quick glance**
```
Super App → Notifications panel → Recent 5 → Tap to navigate
```

## 5. Permissions

| Action | User | Admin |
|--------|:----:|:-----:|
| View own notifications | ✅ | ✅ |
| Send system notifications | ❌ | ✅ |
| View all user notifications | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "What did I miss today?" — notification digest
- Smart prioritization (orders > marketing)
- Notification preference recommendations

## 7. Notifications

*(Meta — this module IS notifications)*

- Respect user preferences (future granular controls)
- Batch non-urgent notifications
- Never notify without actionable context

## 8. Analytics

- Notification open rate
- Time to read
- Email vs in-app engagement
- Dismiss rate by type

## 9. KPIs

| KPI | Target |
|-----|--------|
| Critical notification delivery | < 5s |
| Notification open rate | ↑ |
| Unread backlog (7-day) | ↓ |
| Email bounce rate | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Push notifications (web + mobile) |
| v1.2 | Granular preference center |
| v1.3 | Notification digest (daily/weekly) |
| v2.0 | Multi-channel orchestration |

## 11. Dependencies

- All modules (event producers)
- Email infrastructure
- Supabase realtime
- Super App, Jimvio OS, Workspace

## 12. Security Considerations

- Users see only own notifications
- System notifications admin-only
- No sensitive data in notification preview text
- Email unsubscribe compliance

## 13. Accessibility Considerations

- Badge count announced to screen readers
- Notification list keyboard navigable
- Mark read action keyboard accessible
- Toast announcements not blocking
