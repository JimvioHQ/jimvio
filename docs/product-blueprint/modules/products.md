# Products

**Status:** ✅ Production · **Routes:** `/products`, `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[id]/edit`, `/admin/products/*`

## 1. Purpose

Central **product catalog system** for physical and digital goods. Powers marketplace listings, creator storefronts, affiliate promotions, and checkout.

## 2. Target Users

| User | Goal |
|------|------|
| Seller | Create and manage catalog |
| Creator | Attach products to profile/storefront |
| Buyer | Evaluate product before purchase |
| Admin | Moderate, import (CJ), publish |

## 3. Core Features

- Physical and digital product types
- Variants and storefront options (`lib/products/storefront-variants.ts`)
- Vendor product CRUD (`/dashboard/products`)
- Product detail pages with Commerce Graph + Business Graph rails
- CJ import and intel (admin)
- Cloudinary image upload
- Digital delivery post-purchase
- Product view tracking (guest + authenticated)

## 4. User Journeys

**Seller creates product**
```
/dashboard/products/new → Upload images → Set price/variants → Publish → Appears on marketplace + storefront
```

**Buyer evaluates**
```
Product detail → Images, description, reviews → Commerce Graph (related creators/communities) → Add to cart
```

**Admin CJ import**
```
/admin/products/import/cj → Browse supplier catalog → Import → Review → Publish
```

## 5. Permissions

| Action | Guest | Buyer | Seller | Creator | Admin |
|--------|:-----:|:-----:|:------:|:-------:|:-----:|
| View published | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/edit | ❌ | ❌ | Own | Own linked | ✅ |
| CJ import | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | Own | Own | ✅ |

## 6. AI Opportunities

- Copilot: "Write a product description for..."
- Auto-tagging and category suggestions
- Pricing intelligence vs market (future)
- Image quality checks (future)

## 7. Notifications

- Product approved/rejected (seller)
- Low stock alert (seller, future)
- New review on product (seller)
- Digital delivery ready (buyer, via order)

## 8. Analytics

- Product views per SKU
- Conversion rate (views → cart → purchase)
- Top products by revenue (vendor analytics)
- CJ import success rate (admin)

## 9. KPIs

| KPI | Target |
|-----|--------|
| Product publish success rate | ↑ |
| Image completeness at publish | ↑ |
| View-to-cart rate per product | ↑ |
| Admin moderation turnaround | ↓ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | Bulk edit, CSV import |
| v1.2 | AI-generated SEO metadata |
| v1.3 | Product bundles and upsells |
| v2.0 | Multi-warehouse inventory |

## 11. Dependencies

- Marketplace, Checkout, Orders, Seller Hub
- Commerce Graph, Business Graph
- CJ integration (`lib/cj/*`)
- Cloudinary, Supabase storage

## 12. Security Considerations

- Vendor can only edit own products (`requireVendorOwnerOrAdmin`)
- Digital asset URLs must be signed/time-limited
- Admin publish requires image validation
- No script injection in product descriptions (sanitize HTML)

## 13. Accessibility Considerations

- Alt text required on product images
- Variant selector keyboard accessible
- Price announced to screen readers
- Focus management on image gallery
