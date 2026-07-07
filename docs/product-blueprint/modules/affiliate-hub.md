# Affiliate Hub

**Status:** ✅ Production · **Routes:** `/affiliates`, `/dashboard/links`, `/dashboard/affiliate/products`, `/dashboard/affiliate/analytics`, `/dashboard/clicks`, `/ref/[code]`

## 1. Purpose

Enable **performance-based promotion** — affiliates and creators generate trackable links, earn commissions on conversions, and analyze click-to-sale performance.

## 2. Target Users

| User | Goal |
|------|------|
| Affiliate | Earn commissions promoting products |
| Creator | Monetize audience via affiliate |
| Seller | Drive sales through affiliate network |
| Buyer | Discover via trusted referral (indirect) |

## 3. Core Features

- Affiliate link creation (`/dashboard/links`)
- Product catalog for affiliates (`/dashboard/affiliate/products`)
- Click tracking (`/ref/[code]`, `/api/affiliates/track`)
- Click analytics (`/dashboard/clicks`)
- Affiliate analytics dashboard
- Commission crediting to wallet
- Role activation (`/dashboard/activate/affiliate`)
- Public affiliates landing (`/affiliates`)

## 4. User Journeys

**Affiliate promotes product**
```
/dashboard/affiliate/products → Generate link → Share → Click tracked → Purchase → Commission credited
```

**Creator cross-promotes**
```
Creator profile affiliate tab → Link → Audience clicks → Conversion → Earnings in wallet
```

**Affiliate analyzes performance**
```
/dashboard/affiliate/analytics → Clicks, conversions, earnings → Optimize top products
```

## 5. Permissions

| Action | Guest | Affiliate | Creator | Seller | Admin |
|--------|:-----:|:---------:|:-------:|:------:|:-----:|
| Click tracking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create links | ❌ | ✅ | ✅ | ❌ | ✅ |
| View analytics | ❌ | Own | Own | Store | All |
| Set commission rates | ❌ | ❌ | ❌ | Own | ✅ |

## 6. AI Opportunities

- Copilot: "Which products should I promote?"
- Opportunity Engine: high-commission opportunities
- Conversion optimization tips
- Audience-product fit recommendations

## 7. Notifications

- Commission earned
- New high-converting product alert (future)
- Payout threshold reached

## 8. Analytics

- `affiliate_clicks` table + RPC
- Conversion rate (clicks → orders)
- Earnings per link
- Top affiliates (admin)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Click-to-conversion rate | ↑ |
| Affiliate activation rate | ↑ |
| Average commission per affiliate | ↑ |
| Link generation friction (time) | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Deep links with UTM builder |
| v1.2 | Tiered commission structures |
| v1.3 | Affiliate leaderboards |
| v2.0 | Affiliate API for external tools |

## 11. Dependencies

- Products, Orders, Wallet, Creator Profiles
- `lib/actions/affiliate.ts`, `services/affiliates.ts`
- Opportunity Engine, Commerce Graph

## 12. Security Considerations

- Click fraud detection (rate limits, IP patterns)
- Attribution window server-enforced
- No commission manipulation client-side
- Ref code validation

## 13. Accessibility Considerations

- Link copy button with success feedback
- Analytics charts with data table fallback
- Keyboard-accessible product picker
