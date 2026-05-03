# Jimvio — UGC + Clipping + Monetization System
### Complete Implementation Guide

---

## What Was Built

This implementation adds **5 production-ready systems** to Jimvio: UGC, Clipping, Monetization, Creator Dashboard, and Fraud Prevention.

---

## 📁 New Files Created

```
supabase/
  ugc-clipping-schema.sql        ← Full DB schema (run this first)

services/
  ugc.ts                         ← UGC CRUD, feed, likes, comments, hashtags
  creator-analytics.ts           ← Unified creator analytics

app/api/
  ugc/posts/route.ts             ← GET feed + POST create
  ugc/posts/[id]/route.ts        ← GET + PATCH + DELETE single post
  ugc/posts/[id]/like/route.ts   ← Toggle like (rate-limited)
  ugc/posts/[id]/comment/route.ts← GET + POST + DELETE comments
  ugc/reports/route.ts           ← Report content
  clips/track-view/route.ts      ← Fraud-resistant view counter
  clips/[id]/like/route.ts       ← Toggle clip like
  creator/analytics/route.ts     ← Unified creator analytics API

components/ugc/
  ugc-post-card.tsx              ← Full post card (media/likes/comments/share)
  ugc-post-form.tsx              ← Post creation form
  ugc-feed.tsx                   ← Infinite-scroll feed with sort tabs

app/(public)/ugc/page.tsx        ← Public UGC community feed
app/dashboard/analytics/page.tsx ← Enhanced Creator Analytics dashboard

types/database.types.ts          ← Updated with UGC + Clip types
services/media/cloudinary.ts     ← Added "jimvio/ugc" folder
```

---

## 🗄️ Step 1: Run Database Migration

Go to your **Supabase Dashboard → SQL Editor** and run:

```sql
-- paste the full contents of: supabase/ugc-clipping-schema.sql
```

> **What it creates:**
> - `clip_likes`, `clip_comments`, `clip_view_logs`, `clip_affiliate_links`
> - `ugc_posts`, `ugc_post_product_tags`, `ugc_hashtags`, `ugc_post_hashtags`
> - `ugc_post_likes`, `ugc_post_comments`, `ugc_reports`
> - All RLS policies, indexes, and counter triggers

---

## 🔐 Step 2: Set Environment Variable

Add to your `.env.local`:

```bash
VIEW_HASH_SALT=your-secret-random-string-here
```

This salts the IP hash used for fraud-resistant view counting. Never expose it publicly.

---

## 🧭 Step 3: Feature Walkthrough

### Feature 1 — UGC Feed (`/ugc`)

Anyone can browse. Logged-in users can create posts.

**What users can do:**
- Post content (text, images, videos) via Cloudinary
- Tag marketplace products (up to 5 per post)
- Add hashtags (up to 30)
- Choose post type (Post / Review / Unboxing / How-to / Deal)
- Like, comment, share, report
- Browse by Latest / Trending / Top
- Click hashtags to filter feed

```tsx
// Embed the feed anywhere:
import { UGCFeed } from "@/components/ugc/ugc-feed";
<UGCFeed currentUserId={userId} hashtag="fashion" />

// Embed the post form:
import { UGCPostForm } from "@/components/ugc/ugc-post-form";
<UGCPostForm products={products} onSuccess={() => router.refresh()} />
```

---

### Feature 2 — Clip System (TikTok-style)

Creators at `/dashboard/clips/new` can create short clips.

**View tracking** (`POST /api/clips/track-view`):

```typescript
// Call from the TikTok feed after 3+ seconds of watch time
await fetch("/api/clips/track-view", {
  method: "POST",
  body: JSON.stringify({ clipId: clip.id, watchedSeconds: 5 }),
});
```

**Fraud prevention built-in:**
- Bot UA filtering
- SHA-256 hashed IP (not stored raw)
- DB unique index: 1 view per (clip × IP × hour)
- 3-second minimum watch time
- Separate `clip_view_logs` table — doesn't pollute main table

**Clip likes** (`POST /api/clips/{id}/like`):
- 2-second debounce guard per user+clip
- Triggers auto-increment/decrement via DB trigger

---

### Feature 3 — Earning System

The existing affiliate system is extended with clip-level tracking.

**How creators earn:**
1. Creator creates a clip + links an affiliate product
2. Viewer watches clip → affiliate link is exposed
3. Viewer clicks link → tracked in `affiliate_links.total_clicks`
4. Viewer purchases → `affiliate_commissions` row created
5. Commission is credited to creator's `affiliates.available_balance`

**Existing tables leveraged:**
- `affiliates` → balance, conversion_rate
- `affiliate_links` → per-product links
- `affiliate_commissions` → per-order earnings
- `payouts` + `wallets` → withdrawal system

**New `clip_affiliate_links` table** maps a clip → affiliate_link for clip-level attribution.

---

### Feature 4 — Creator Analytics Dashboard (`/dashboard/analytics`)

Complete analytics for creators. Data range: 7 / 14 / 30 / 90 days.

**Sections:**
| Section | Data |
|---------|------|
| KPI row | Views, Likes, Conversions, Total Earned |
| Secondary counters | Clips, UGC Posts, Comments, Shares, Clicks, Pending |
| Earnings area chart | Earnings + Conversions over time |
| Quick actions | New Clip / Write Review / Links / Payout |
| Top clips table | Ranked by views with earnings |
| Affiliate links | Clicks, unique, conversions, earnings |
| Recent commissions | Order-level payout history |

**API:** `GET /api/creator/analytics?days=30`

---

### Feature 5 — Moderation + Security

| Mechanism | Implementation |
|-----------|----------------|
| Post rate limit | 10 posts/hour per user (in-memory) |
| Comment rate limit | 20 comments/minute per user |
| Like rate limit | 60 likes/minute per user (UGC) |
| Clip like debounce | 2 seconds per user+clip |
| Report rate limit | 5 reports/hour per user |
| View fraud | SHA-256 IP hash + DB unique per (clip, ip, hour) |
| Bot filtering | User-agent regex on view tracker |
| RLS policies | All tables — users can only modify their own data |

> [!IMPORTANT]
> The rate limiters use an **in-memory Map**. For multi-instance production, replace with Redis (e.g., Upstash). The `clip_view_logs` deduplication is DB-level and works across all instances.

---

## 🛣️ New Routes Summary

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/ugc` | GET | Public | UGC community feed page |
| `/api/ugc/posts` | GET | Public | Fetch UGC feed (paginated) |
| `/api/ugc/posts` | POST | Required | Create UGC post |
| `/api/ugc/posts/[id]` | GET | Public | Single post |
| `/api/ugc/posts/[id]` | PATCH | Owner | Edit post |
| `/api/ugc/posts/[id]` | DELETE | Owner | Delete post |
| `/api/ugc/posts/[id]/like` | POST | Required | Toggle like |
| `/api/ugc/posts/[id]/comment` | GET | Public | Get comments |
| `/api/ugc/posts/[id]/comment` | POST | Required | Add comment |
| `/api/ugc/reports` | POST | Required | Report content |
| `/api/clips/track-view` | POST | Optional | Count view (fraud-safe) |
| `/api/clips/[id]/like` | POST | Required | Toggle clip like |
| `/api/creator/analytics` | GET | Required | Creator stats |

---

## 🎨 Sidebar Navigation Added

The dashboard sidebar now includes:

```
UGC & CONTENT
  Community Feed    → /ugc
  Create Post       → /ugc#create-post
  Discover Clips    → /clips

CREATOR
  Creator Studio    → /dashboard/influencer
  My Clips          → /dashboard/clips
  Creator Analytics → /dashboard/analytics   ← ENHANCED
  Creator Earnings  → /dashboard/creator/earnings
```

---

## ⚡ Performance Optimizations

| Technique | Where Applied |
|-----------|---------------|
| SSR + cache headers | UGC feed API (`s-maxage=30`) |
| Masonry CSS columns | UGC feed layout |
| IntersectionObserver | Infinite scroll without event listeners |
| DB counter columns | `like_count`, `comment_count` — no COUNT(*) queries |
| Partial unique index | `clip_view_logs` — dedup at DB level |
| Skeleton loaders | UGC feed + creator analytics |
| Parallel Promise.all | Creator analytics API fetches in parallel |
| DB indexes | All FK columns + status + time columns indexed |

---

## 🔄 Integration Checklist

- [x] Run `supabase/ugc-clipping-schema.sql` in Supabase SQL Editor
- [ ] Add `VIEW_HASH_SALT=<random>` to `.env` / Vercel env vars
- [x] Integrate view tracking into `TikTokFeed` component (call `/api/clips/track-view` after 3s)
- [ ] Test UGC feed at `/ugc`
- [ ] Test creator dashboard at `/dashboard/analytics`  
- [ ] Verify clip like toggles correctly
- [ ] Run `npm run build` to confirm no TypeScript errors
