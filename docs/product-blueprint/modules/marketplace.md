# Marketplace

**Status:** ✅ Production · **Routes:** `/marketplace`, `/marketplace/physical`, `/marketplace/digital`, `/marketplace/flash-deals`, `/marketplace/search`, `/marketplace/[slug]`

## 1. Purpose

Primary **discovery surface** for physical and digital products. Connects buyers to sellers, creators, and affiliates through browse, search, filters, flash deals, and personalized rails.

## 2. Target Users

| User | Goal |
|------|------|
| Guest / Buyer | Discover and compare products |
| Seller | Exposure for catalog |
| Creator / Affiliate | Surfaces linked/promoted products |
| Admin | Merchandising, CJ sourcing oversight |

## 3. Core Features

- Physical and digital product catalogs
- Flash deals section
- Advanced search and filters (`lib/marketplace/search-engine.ts`)
- Personalized feed rails (`lib/marketplace/personalization/`) — cart signals, recently viewed, search history
- Product grid with lazy loading
- CJ-sourced product integration (admin pipeline)
- Commerce Graph rails on product context (via product detail)

## 4. User Journeys

**Buyer discovery**
```
Land on /marketplace → Browse category or personalized rails → Filter/search → Product detail → Add to cart → Checkout
```

**Returning buyer**
```
/marketplace → "Recently viewed" / "Based on your cart" rails → Product detail
```

**Flash deal hunter**
```
/marketplace/flash-deals → Urgency-driven browse → Cart → Checkout
```

## 5. Permissions

| Action | Guest | Buyer | Seller | Admin |
|--------|:-----:|:-----:|:------:|:-----:|
| Browse | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ |
| Personalized rails | 🟡 Limited | ✅ | ✅ | ✅ |
| Manage listings | ❌ | ❌ | Own only | ✅ |

## 6. AI Opportunities

- Copilot: "Find products under $50 in electronics"
- Search AI (`/api/ai/search`) — natural language product discovery
- Opportunity Engine: surface trending categories for sellers
- Personalized ranking improvements via behavioral signals

## 7. Notifications

- Price drop alerts (future)
- Flash deal start reminders (future)
- Back-in-stock (future)
- Order-related notifications post-purchase (via Orders module)

## 8. Analytics

- Product views (`product_views`, `POST /api/products/[id]/view`)
- Search queries (`marketplace_recent_searches_v1` localStorage + server)
- Affiliate click attribution from marketplace links
- Vercel Analytics page performance
- Admin revenue reports

## 9. KPIs

| KPI | Target direction |
|-----|------------------|
| Browse-to-product-click rate | ↑ |
| Search-to-purchase conversion | ↑ |
| Personalized rail CTR vs generic | ↑ |
| Time to first product view | ↓ |
| Core Web Vitals (LCP, CLS) | Green |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Deeper DS migration (`DsProductCard`) |
| v1.2 | Real-time inventory badges |
| v1.3 | Social proof rails (trending in community X) |
| v2.0 | Marketplace API for embeddable storefronts |

## 11. Dependencies

- Products module, Search, Cart, Checkout
- Commerce Graph, Personalized Feed
- CJ import pipeline (admin)
- Design System (`DsProductCard`, tokens)

## 12. Security Considerations

- Product view API rate limiting for guest abuse
- No PII in URL parameters for affiliate tracking
- Sanitize search input server-side
- Admin-only CJ product visibility controls

## 13. Accessibility Considerations

- Keyboard-navigable product grid and filters
- Screen reader labels on product cards (title, price, rating)
- Skeleton loading (no layout shift)
- Reduced motion for hover scale effects
- High contrast price and CTA text
