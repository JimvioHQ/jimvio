#!/usr/bin/env node
/**
 * Static gate: $5.65 business verification fee before Didit KYB + related polish.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

assert(existsSync(join(root, "lib/identity/business-verification-fee.ts")), "fee constant module");
assert(existsSync(join(root, "app/api/identity/verification/fee/route.ts")), "fee API route");

const feeConst = read("lib/identity/business-verification-fee.ts");
assert(feeConst.includes("BUSINESS_VERIFICATION_FEE_USD = 5.65"), "server fee is 5.65");
assert(feeConst.includes("103.91") === false || feeConst.includes("amountsMatchFee(103.91"), "no hard-coded wrong amount");

const feeRoute = read("app/api/identity/verification/fee/route.ts");
assert(feeRoute.includes("serverFeeUsd") || feeRoute.includes("BUSINESS_VERIFICATION_FEE_USD"), "amount server-side");
assert(feeRoute.includes("void body.amount") || feeRoute.includes("body.amount"), "client amount ignored");
assert(feeRoute.includes("getSiteUrl"), "canonical site URL for redirects");
assert(feeRoute.includes('paymentOptions: isMomo'), "MoMo uses dedicated options");
assert(feeRoute.includes('"card,googlepay,applepay"'), "card path options");
assert(feeRoute.includes("createNowPaymentsInvoice"), "crypto path");
assert(feeRoute.includes("createBinancePayOrder"), "binance path");

const businessRoute = read("app/api/identity/verification/business/route.ts");
assert(businessRoute.includes("status: 402"), "HTTP 402");

const shell = read("components/product/ProductFormShell.tsx");
assert(shell.includes('button_text: "Buy Now"'), "default CTA Buy Now");
assert(shell.includes('isPhysical\n                        ? "Buy Now"') || shell.includes('? "Buy Now"'), "physical preview Buy Now");

const discover = read("components/ugc/workspace/UGCDiscoverPage.tsx");
assert(!discover.includes("total.toLocaleString()"), "no visible campaign count");

const campaigns = read("services/campaigns.ts");
assert(campaigns.includes("total_budget, spent_budget"), "homepage selects budget fields");

const selector = read("components/product/ProductTypeSelector.tsx");
assert(selector.includes("Choose payment method"), "payment method selector");
assert(selector.includes("Continue to payment"), "payment CTA");

console.log("✅ verify-business-verification-fee.mjs passed");
