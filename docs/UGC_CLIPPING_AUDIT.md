# Jimvio COMPLETE CAMPAIGN SYSTEM Audit
> Audit Date: 2026-04-06 | Against specification: JIMVIO COMPLETE CAMPAIGN SYSTEM (UGC + CLIPPING + MUSIC + PROMOTION)

## 1. Executive Summary
The Jimvio UGC & Clipping module has been significantly built out for basic "UGC" and "Clipping" campaigns, but **major structural elements are missing**, notably the Escrow system, Music/Promotion campaign types, fixed-rate payments, and strict fraud prevention models.

Below is exactly **what matches**, **what is missing**, and a **step-by-step plan** on how to complete the system.

---

## 2. What MATCHES the Specification
- **User Types:** 
  - Brands (businesses) and Creators (influencers) are supported.
- **Campaign Types:**
  - `UGC` and `Clipping` are implemented in the database and UI.
- **Creator Flow:**
  - Creators can browse campaigns, view details, and join them.
- **Brand / User Flow:**
  - Brands can create UGC/Clipping campaigns, specify budgets, review submissions, and approve/reject them.
- **Payment System:**
  - Pay-per-views model is fully built using the daily automated script (`lib/ugc/syncViews.ts`).
  - View syncing integrates natively with TikTok, Instagram, YouTube, and X APIs.
  - Successfully routes funds to Creator wallets.

---

## 3. What DOES NOT MATCH (Missing Features)

### A. Missing Campaign & User Types
- ❌ **Music Clipping Campaigns:** The `music_clipping` type does not exist in the database enum, API, or UI. Brands cannot add a music track for creators to use.
- ❌ **Promotion Campaigns:** The `promotion` type does not exist.
- ❌ **Personal Brands / Artists Roles:** Users lack a specific "Artist" or "Personal Brand" type to separate these from generic businesses.

### B. Escrow System
- ❌ **CRITICAL: The Escrow System is completely missing.** Brands can currently publish a campaign with a $1,000 budget without depositing a single cent. The platform is currently crediting Creators with "unbacked" funds. A `ugc_campaign_escrow` system must hold funds and release them as submissions generate views or get approved.

### C. Missing Payment Model
- ❌ **Fixed Rate Per Content:** Only the pay-per-view model works. The fixed rate is absent. The spec requires both models ("Pay per views or fixed rate per content").

### D. Missing / Broken Core Interfaces
- ❌ **Creator Submit Post Interface:** Directory `app/dashboard/ugc/[id]/submit` exists, but the **page file itself is missing**. Creators have no form to submit their post URL.
- ❌ **Brand Campaign Edit Page:** A link to edit campaigns exists, but the page does not.
- ❌ **Missing Participant Database Migration:** The API relies on a `ugc_campaign_participants` table to let creators join, but this table was never created in `database/migrations`. Joining will currently crash the app on a fresh deploy.

### E. Security & Fraud Limits
- ❌ **Fraud score/Suspicious flag:** Variables are modeled in TypeScript, but columns do not actually exist in the DB.
- ❌ **Payout Delay:** Funds are credited immediately on cron sync instead of having a hold/delay period (e.g. 48 hours to screen for bot views).
- ❌ **Duplicate Detection (Cross-Campaign):** A creator could theoretically copy and paste the same TikTok video to 5 different campaigns to earn multiple times.

---

## 4. STEP-BY-STEP COMPLETION PLAN

We can implement this systematically in order of priority:

### PHASE 1: Fix Critical Breaking Bugs (Immediate)
1. **Create the Missing Participant Migration:** Write `044_ugc_campaign_participants.sql` to track creators joining campaigns.
2. **Build the Submission UI:** Create `/app/dashboard/ugc/[id]/submit/page.tsx` so creators can actually input their content URL.
3. **Database Fraud Field Migrations:** Add `is_suspicious` and `fraud_score` columns to `ugc_submissions`.

### PHASE 2: Build The Missing Escrow System
1. **`ugc_campaign_escrow` Table:** Create table tying `campaign_id`, PawaPay/AfriPay deposit ID, and amount held.
2. **Deposit Workflow:** Create `/api/ugc/campaigns/[id]/deposit` integrating with PawaPay.
3. **Gate Activation:** Modity campaign update logic so campaigns cannot go from `draft -> active` unless they have an associated paid escrow.
4. **Fund Release Logic:** Update `lib/ugc/syncViews.ts` to deduce processed payments directly from the locked escrow rather than crediting out of thin air.

### PHASE 3: Add Music & Promotion Campaign Types
1. **Update `ugc_campaigns` Table:** Add `music_clipping` and `promotion` to `ugc_campaign_type` enum.
2. **Add Context Fields:** Add columns `music_track_url`, `music_artist_name`, `promotion_target`, `promotion_target_url`.
3. **Update Brand Creation Flow:** Modify `/dashboard/vendor/campaigns/new/page.tsx` to display conditional fields based on selected type (e.g., if type == 'music_clipping' -> require music link).
4. **Update Creator Dashboards:** Display music track and promotion assets for creators.

### PHASE 4: Build Fixed-Rate Payment Model
1. **Add `payment_model` Variable:** Add to campaigns (enum: `per_views` | `fixed_per_content`), along with a `fixed_rate` column.
2. **Handle Fixed-Rates on Approval:** In `/api/ugc/submissions/[id]/approve`, immediately calculate and trigger the fixed payout upon brand approval (if campaign is fixed-rate) instead of relying on the daily view sync.

### PHASE 5: Implementation of Fraud Delays
1. **Payout Delay Logic**: Instead of marking payouts as `paid` directly in `syncViews.ts`, create them as `pending_clearance` with a `release_date`.
2. **Clearance Cron:** Write a second cron script that converts `pending_clearance` to `available_balance` on release day.
3. **Cross-Campaign Duplication Logic:** When a user submits a URL, do a global query to guarantee that URL is not linked to *any* other active submission, rather than just preventing duplication on a per-campaign constraint.
