# AI Copilot

**Status:** 🟡 Scaffold · **Scope:** Global (root layout)

## 1. Purpose

**Contextual AI assistant** that helps users succeed without interrupting or replacing their decisions. Native to Jimvio — not a bolted-on chatbot.

## 2. Target Users

| User | Goal |
|------|------|
| All authenticated users | Get help, insights, recommendations |
| Creators | Content and growth guidance |
| Sellers | Business optimization |
| Buyers | Discovery assistance |

## 3. Core Features

- Global lazy loader (`JimvioCopilotLoader` in `app/layout.tsx`)
- Context-aware by current route (`lib/ai/copilot/`)
- Quick actions per surface
- Chat API (`/api/ai/chat/route.ts`)
- AI store (`use-ai-store.ts`)
- Stub provider (`stub-provider.ts`) — pluggable LLM 🟡
- Bridges with Command Center and Super App

## 4. User Journeys

**Contextual help**
```
On dashboard → Open Copilot → "What should I focus on today?" → Actionable suggestions → User decides
```

**Product discovery**
```
On marketplace → Copilot → "Find wireless earbuds under $30" → Search results
```

**Explanation**
```
Opportunity Engine card → "Why this opportunity?" → Copilot explains scoring
```

## 5. Permissions

| Action | Guest | Authenticated |
|--------|:-----:|:-------------:|
| Open Copilot | ❌ | ✅ |
| Chat | ❌ | ✅ |
| Admin insights | ❌ | Admin only (future) |

## 6. AI Opportunities

*(Core module)*

- Route-aware context injection
- Opportunity explanations
- Search natural language bridge
- Onboarding guidance
- Error diagnosis in plain language

**Philosophy:** AI helps · never interrupts · never replaces decisions · always explains

## 7. Notifications

- No proactive AI push notifications
- Suggestions appear in-context only
- Future: opt-in digest

## 8. Analytics

- Copilot open rate
- Messages per session
- Suggestion acceptance rate
- Context route distribution

## 9. KPIs

| KPI | Target |
|-----|--------|
| Suggestion acceptance rate | ↑ |
| Time saved (user survey) | ↑ |
| Copilot interrupt rate | ↓ (minimize) |
| Response latency | < 2s |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Production LLM provider (replace stub) |
| v1.2 | Tool use (search, wallet lookup, order status) |
| v1.3 | Proactive insights (opt-in) |
| v2.0 | Creator AI agents (bounded, user-approved) |

## 11. Dependencies

- Search, Opportunity Engine, all context modules
- Command Center, Super App
- `/api/ai/chat`

## 12. Security Considerations

- No PII sent to LLM without consent
- Prompt injection defenses
- Rate limiting per user
- Admin-only sensitive data access
- Audit log for AI actions (future)

## 13. Accessibility Considerations

- Copilot panel keyboard open/close
- Chat messages in accessible live region
- Focus management on open
- Reduced motion for panel animations
