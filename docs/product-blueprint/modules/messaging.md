# Messaging

**Status:** 🟡 Partial · **Routes:** `/messages`, `/dashboard/messages`, `/c/(hubs)/messages`, `/c/(hubs)/[slug]/chats`, `/admin/messages`

## 1. Purpose

Enable **direct and community communication** — DMs between users, community chat rooms, and inbox conversations. Connects members, creators, and support.

## 2. Target Users

| User | Goal |
|------|------|
| Buyer / Member | Message sellers, community members |
| Creator | Engage audience |
| Community Owner | Community chat moderation |
| Admin | Platform message oversight |

## 3. Core Features

- Dashboard inbox (`/dashboard/messages`)
- Community chat rooms (`/c/(hubs)/[slug]/chats`)
- Hub messages page (`hub-messages-page.tsx`)
- Chat hooks (`useChatRoom.ts`)
- Inbox conversations API (`/api/communities/[slug]/inbox/*`)
- Messages API (`/api/messages/*`)
- Super App messages panel (global quick access)
- Public `/messages` — sign-in placeholder 🟡

## 4. User Journeys

**Member chats in community**
```
/c/[slug]/chats → Select room → Send message → Realtime delivery
```

**Dashboard DM**
```
/dashboard/messages → Conversation list → Reply
```

**Quick access**
```
Super App dock → Messages panel → Recent conversations
```

## 5. Permissions

| Action | Guest | Authenticated | Moderator | Admin |
|--------|:-----:|:-------------:|:---------:|:-----:|
| View public messages page | ✅ | ✅ | ✅ | ✅ |
| Send messages | ❌ | ✅ | ✅ | ✅ |
| Moderate chat | ❌ | ❌ | ✅ | ✅ |
| Admin message access | ❌ | ❌ | ❌ | ✅ |

## 6. AI Opportunities

- Copilot: "Summarize my unread messages" (future)
- Smart reply suggestions (future)
- Spam detection assist
- Conversation routing to support (future)

## 7. Notifications

- New message (in-app + future push)
- Type: `message` in notifications table
- Unread badge in dashboard shell, Super App

## 8. Analytics

- Messages sent per community
- Response time (future)
- Active conversation count

## 9. KPIs

| KPI | Target |
|-----|--------|
| Message delivery latency | < 500ms |
| DM adoption rate | ↑ |
| Community chat DAU | ↑ |
| Spam report rate | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Full public DM (replace placeholder) |
| v1.2 | Push notifications |
| v1.3 | Rich media messages |
| v2.0 | End-to-end encryption option |

## 11. Dependencies

- Communities, Notifications
- Supabase realtime
- Super App, Jimvio OS

## 12. Security Considerations

- Message access scoped to participants
- Rate limiting on send
- Content moderation reporting
- No message content in URLs

## 13. Accessibility Considerations

- Chat input labeled
- New messages announced (ARIA live polite)
- Keyboard send (Enter) with modifier option
- Focus management on room switch
