/**
 * Affiliate engine production smoke checks — no network.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

mustExist("database/migrations/111_affiliate_engine_campaigns.sql");
mustExist("supabase/migrations/20260726150000_affiliate_engine_campaigns.sql");

const migration = mustExist("supabase/migrations/20260726150000_affiliate_engine_campaigns.sql");
assert.match(migration, /affiliate_campaigns/);
assert.match(migration, /affiliate_ledger/);
assert.match(migration, /increment_affiliate_earnings/);
assert.match(migration, /approve_affiliate_commission/);
assert.match(migration, /clawback_affiliate_commission/);
assert.match(migration, /record_affiliate_click/);
assert.match(migration, /lifecycle_status/);
assert.match(migration, /uq_affiliate_commissions_order_item/);

const attribution = mustExist("lib/affiliate/attribution.ts");
assert.match(attribution, /first_touch|FIRST_COOKIE|jimvio_ref_ft/);
assert.match(attribution, /isSelfReferral/);
assert.match(attribution, /isWithinAttributionWindow/);
assert.match(attribution, /buildLineAttribution/);

const commissions = mustExist("lib/affiliate/commissions.ts");
assert.match(commissions, /createPendingCommission/);
assert.match(commissions, /approveCommission/);
assert.match(commissions, /refundCommission/);
assert.match(commissions, /handleOrderRefundForAffiliates/);
assert.match(commissions, /withdrawalEligible/);
assert.match(commissions, /approveCommissionsForOrder/);
assert.match(commissions, /creditWalletForApprovedCommission/);
mustExist("lib/affiliate/credit-wallet.ts");

const campaigns = mustExist("lib/affiliate/campaigns.ts");
assert.match(campaigns, /createAffiliateCampaign/);
assert.match(campaigns, /setCampaignStatus/);
assert.match(campaigns, /createAffiliateLink/);
assert.match(campaigns, /getCampaignAnalytics/);

const analytics = mustExist("lib/affiliate/analytics.ts");
assert.match(analytics, /ctr/);
assert.match(analytics, /epc/);
assert.match(analytics, /topCampaigns/);

const surfaces = mustExist("lib/affiliate/surfaces.ts");
assert.match(surfaces, /attributeCourseEnrollment/);
assert.match(surfaces, /attributeLivePurchase/);
assert.match(surfaces, /attributeSubscriptionSignup/);

const checkout = mustExist("lib/actions/checkout.ts");
assert.match(checkout, /buildLineAttribution/);
assert.match(checkout, /affiliate_commission_amount/);
assert.match(checkout, /referralCode/);

const finalize = mustExist("lib/payments/finalize-order-payment.ts");
assert.match(finalize, /createPendingCommission/);

const refRoute = mustExist("app/(public)/ref/[code]/route.ts");
assert.match(refRoute, /record_affiliate_click|AFFILIATE_REF_FIRST_COOKIE/);

mustExist("app/api/affiliates/links/route.ts");
mustExist("app/api/affiliates/campaigns/route.ts");
mustExist("app/api/affiliates/campaigns/[id]/route.ts");
mustExist("app/api/affiliates/analytics/route.ts");
mustExist("app/api/affiliates/commissions/[id]/route.ts");

const track = mustExist("app/api/affiliates/track/route.ts");
assert.match(track, /record_affiliate_click/);
assert.match(track, /AFFILIATE_REF_FIRST_COOKIE/);

console.log("verify-affiliate-engine-campaigns: ok");
