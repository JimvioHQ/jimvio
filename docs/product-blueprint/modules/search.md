# Search

**Status:** ✅ Production · **Routes:** `/marketplace/search`, navbar search, Command Center (⌘K)

## 1. Purpose

Universal **discovery layer** — marketplace product search, autocomplete, AI-powered search, and Command Center entity search. Connects users to any part of the platform quickly.

## 2. Target Users

| User | Goal |
|------|------|
| Guest / Buyer | Find products fast |
| Creator / Seller | Find opportunities, entities |
| All users | Navigate platform via Command Center |

## 3. Core Features

- Marketplace search engine (`lib/marketplace/search-engine.ts`)
- Search API (`/api/marketplace/search`)
- Autocomplete suggestions (`/api/search/suggestions`)
- AI search (`/api/ai/search`)
- Navbar search (`navbar-search.tsx`)
- Marketplace search bar (`MarketplaceSearchBar.tsx`)
- Command Center search (`lib/command-center/search.ts`) — cross-entity
- Recent searches (personalization localStorage)

## 4. User Journeys

**Product search**
```
Navbar or /marketplace/search → Type query → Suggestions → Results → Product detail
```

**Command Center**
```
⌘K → Type command or entity → Navigate to dashboard page, product, community
```

**AI search**
```
Natural language query → AI interprets → Product results
```

## 5. Permissions

| Action | Guest | Authenticated |
|--------|:-----:|:-------------:|
| Product search | ✅ | ✅ |
| Command Center | 🟡 Limited | ✅ |
| AI search | 🟡 Rate limited | ✅ |
| Search history | Local only | Local + server signals |

## 6. AI Opportunities

- Natural language product discovery (live)
- "Find creators in fitness with >10k followers" (future)
- Search intent understanding for personalization
- Copilot search bridge

## 7. Notifications

- No direct notifications
- Drives discovery that triggers other module notifications

## 8. Analytics

- Search queries volume
- Zero-result rate
- Click-through on suggestions
- Command Center command usage
- AI search success rate

## 9. KPIs

| KPI | Target |
|-----|--------|
| Search latency | < 200ms |
| Zero-result rate | ↓ |
| Search-to-purchase conversion | ↑ |
| Command Center adoption | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Unified search index (products + creators + communities) |
| v1.2 | Voice search (mobile) |
| v1.3 | Federated search ranking with personalization |
| v2.0 | Search API for partners |

## 11. Dependencies

- Marketplace, Command Center, AI Copilot
- Personalization signals
- All entity modules (for Command Center)

## 12. Security Considerations

- Query sanitization server-side
- Rate limiting on AI search
- No PII in search logs (anonymize)
- Command Center respects role permissions

## 13. Accessibility Considerations

- Search input labeled with role="searchbox"
- Suggestions keyboard navigable (arrow keys)
- Results announced to screen readers
- Command Center focus trap and escape to close
