# UGC Hub

**Status:** ✅ Production · **Routes:** `/ugc`, `/ugc/[id]`, `/ugc/[id]/join`, `/ugc/[id]/submit`, `/dashboard/ugc/*`

## 1. Purpose

**User-generated content campaigns** — brands and sellers launch UGC campaigns; creators join, submit clips, and earn based on performance. Core pillar of the creator economy.

## 2. Target Users

| User | Goal |
|------|------|
| Creator | Earn from content submissions |
| Seller / Brand | Launch UGC campaigns |
| Buyer | Discover authentic content (indirect) |
| Admin | Moderate campaigns, payouts |

## 3. Core Features

- Campaign browse (`/ugc`)
- Campaign detail and join flow
- Submission flow (`/ugc/submit/[campaignId]`)
- Creator dashboard (`/dashboard/ugc/*`)
- View tracking and sync (`lib/ugc/syncViews.ts`, `ugc_view_snapshots`)
- Payout triggers (`/api/ugc/payouts/trigger`)
- Admin UGC management (`/admin/ugc`)
- Integration with Opportunity Engine
- Docs: `docs/ugc-clipping-system.md`

## 4. User Journeys

**Creator joins campaign**
```
/ugc → Campaign detail → Join → Create content → Submit → Views tracked → Payout
```

**Seller launches campaign**
```
/dashboard/ugc → Create campaign → Set brief/budget → Review submissions → Approve payout
```

**Admin moderates**
```
/admin/ugc → Review flagged submissions → Resolve disputes
```

## 5. Permissions

| Action | Guest | Creator | Seller | Admin |
|--------|:-----:|:-------:|:------:|:-----:|
| Browse campaigns | ✅ | ✅ | ✅ | ✅ |
| Join / submit | ❌ | ✅ | ❌ | ✅ |
| Create campaign | ❌ | ❌ | ✅ | ✅ |
| Trigger payout | ❌ | ❌ | Own | ✅ |
| Reject submission | ❌ | ❌ | Own | ✅ |

## 6. AI Opportunities

- Copilot: "Find UGC campaigns matching my niche"
- Opportunity Engine: scored UGC opportunities
- Brief generation for sellers
- Content quality pre-check (future)

## 7. Notifications

- Campaign joined confirmation
- Submission approved/rejected
- Payout triggered
- New campaign matching interests (future)

## 8. Analytics

- Views per submission
- Campaign ROI (seller)
- Creator earnings from UGC
- Submission approval rate

## 9. KPIs

| KPI | Target |
|-----|--------|
| Campaign join rate | ↑ |
| Submission approval rate | ↑ |
| Views per approved submission | ↑ |
| Creator payout satisfaction | ↑ |

## 10. Future Roadmap

| Phase | Item |
|-------|------|
| v1.1 | In-app clip editor integration |
| v1.2 | Automated view verification |
| v1.3 | Campaign templates |
| v2.0 | UGC marketplace API |

## 11. Dependencies

- Creator Profiles, Wallet, Payments
- Short videos / clips (`/shorts`, clip tracking)
- Opportunity Engine, Commerce Graph
- `lib/ugc/*`, `components/ugc/*`

## 12. Security Considerations

- Submission ownership validation
- Payout triggers admin/seller authorized only
- Content moderation pipeline
- View sync anti-manipulation

## 13. Accessibility Considerations

- Campaign brief readable structure (headings)
- Submission form fully labeled
- Video player keyboard controls
- Status updates announced to screen readers
