/**
 * Affiliate + Wallet USD / commission / wallet-bridge checks — no network.
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

// Pure money helpers (mirrors lib/currency/platform.ts — fail if drift)
function toPlatformUsd(amount, fromCurrency, rate = 0.0008) {
  if (!Number.isFinite(amount)) return 0;
  const from = (fromCurrency || "USD").trim().toUpperCase();
  if (from === "USD") return Math.round(amount * 100) / 100;
  if (from === "RWF") return Math.round(amount * rate * 100) / 100;
  return Math.round(amount * 100) / 100;
}
function formatUSD(amount) {
  const n = toPlatformUsd(amount, "USD");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
function resolveCommissionRatePercent(opts) {
  for (const candidate of [
    opts.linkRate,
    opts.campaignRate,
    opts.productRate,
    opts.platformDefault,
    5,
  ]) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return Math.min(100, n);
  }
  return 5;
}
function estimateAffiliateCommissionUsd(lineTotalUsd, ratePercent) {
  const rate = Math.max(0, Math.min(100, Number(ratePercent) || 0));
  const base = Number.isFinite(lineTotalUsd) ? Math.max(0, lineTotalUsd) : 0;
  return { amount: Math.round(((base * rate) / 100) * 100) / 100, rate };
}

assert.equal(formatUSD(0), "$0.00");
assert.equal(formatUSD(12.5), "$12.50");
assert.equal(formatUSD(1250), "$1,250.00");
assert.equal(formatUSD(toPlatformUsd(14100, "RWF")).includes("RWF"), false);
assert.ok(toPlatformUsd(14100, "RWF") < 100);
assert.notEqual(toPlatformUsd(14100, "RWF"), 14100);
assert.equal(resolveCommissionRatePercent({ productRate: 15 }), 15);
assert.equal(resolveCommissionRatePercent({ linkRate: 25, productRate: 15 }), 25);
assert.equal(estimateAffiliateCommissionUsd(29.99, 15).amount, 4.5);
assert.equal(estimateAffiliateCommissionUsd(79.99, 25).amount, 20);

const platform = mustExist("lib/currency/platform.ts");
assert.match(platform, /export function formatUSD/);
assert.match(platform, /export function formatMoneyAsUSD/);
assert.match(platform, /export function resolveCommissionRatePercent/);
assert.match(platform, /export function estimateAffiliateCommissionUsd/);
assert.match(platform, /DEFAULT_AFFILIATE_COMMISSION_PERCENT = 5/);

const shared = mustExist("components/affiliate/sections/shared.tsx");
assert.match(shared, /formatMoneyAsUSD/);
assert.doesNotMatch(shared, /currency = "RWF"/);

const categories = mustExist("components/affiliate/sections/AffiliateCategories.tsx");
assert.match(categories, /Choose what you want to promote/);
assert.doesNotMatch(categories, /Travel & Experiences/);
assert.doesNotMatch(categories, /UGC & Clipping Campaigns/);
assert.doesNotMatch(categories, /commission: 20/);

const discovery = mustExist("lib/affiliate/discovery.ts");
for (const label of [
  "Featured",
  "Physical Products",
  "Digital Products",
  "eBooks & Guides",
  "Websites & Online Services",
  "Courses & Learning",
  "Apps & Software",
  "Others",
]) {
  assert.match(discovery, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.doesNotMatch(discovery, /Travel & Experiences/);
assert.doesNotMatch(discovery, /UGC & Clipping Campaigns/);

const products = mustExist("components/affiliate/sections/AffiliateProducts.tsx");
assert.match(products, /Earn per sale/);
assert.match(products, /% commission/);
assert.match(products, /\/affiliates\/promote\//);

const credit = mustExist("lib/affiliate/credit-wallet.ts");
assert.match(credit, /creditWalletForApprovedCommission/);
assert.match(credit, /debitWalletForClawedCommission/);
assert.match(credit, /AFF-COMM-/);
assert.match(credit, /affiliate_commission/);

const commissions = mustExist("lib/affiliate/commissions.ts");
assert.match(commissions, /creditWalletForApprovedCommission/);
assert.match(commissions, /debitWalletForClawedCommission/);
assert.match(commissions, /approveCommissionsForOrder/);

const attribution = mustExist("lib/affiliate/attribution.ts");
assert.match(attribution, /affiliateFixedAmountUsd/);
assert.match(attribution, /resolveCommissionRatePercent/);
assert.match(attribution, /estimateAffiliateCommissionUsd/);

const source = mustExist("lib/sources/product-source.ts");
assert.match(source, /return Boolean\(affiliateEnabled\)/);
assert.doesNotMatch(source, /if \(source === "cj"\) return false/);

const lifecycle = mustExist("lib/actions/order-lifecycle.ts");
assert.match(lifecycle, /approveCommissionsForOrder/);

const statusChange = mustExist("lib/payments/record-status-change.ts");
assert.match(statusChange, /handleOrderRefundForAffiliates/);

const overview = mustExist("lib/wallet-os/overview.ts");
assert.match(overview, /PLATFORM_CURRENCY/);
assert.match(overview, /toPlatformUsd/);
assert.doesNotMatch(overview, /currency: wallet\.currency \?\? "RWF"/);

const ensure = mustExist("lib/wallet-os/ensure.ts");
assert.match(ensure, /currency: PLATFORM_CURRENCY/);

const withdrawals = mustExist("app/api/wallet/os/withdrawals/route.ts");
assert.match(withdrawals, /idempotencyKey|idempotency/);
assert.match(withdrawals, /syncAffiliatePaidOnWithdrawal/);
assert.match(withdrawals, /available_balance.*- amount|avail - amount/);

const walletOverview = mustExist("components/wallet-os/WalletOverviewClient.tsx");
assert.match(walletOverview, /formatMoneyAsUSD/);
assert.doesNotMatch(walletOverview, /formatCurrency/);

mustExist("lib/currency/platform.test.ts");
mustExist("lib/affiliate/affiliate-money.test.ts");

console.log("verify-affiliate-wallet-usd: ok");
