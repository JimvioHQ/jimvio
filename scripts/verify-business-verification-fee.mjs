#!/usr/bin/env node
/**
 * Static gate: business verification must not start a payment.
 * Physical selling is a support/admin review, not a $5.65 Didit KYB charge.
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

assert(existsSync(join(root, "app/api/identity/verification/fee/route.ts")), "fee API route");

const feeRoute = read("app/api/identity/verification/fee/route.ts");
assert(feeRoute.includes("verification_payment_disabled"), "fee route is disabled");
assert(feeRoute.includes("status: 410"), "fee route returns 410");
assert(feeRoute.includes("paymentRequired: false"), "fee route does not require payment");
assert(!feeRoute.includes("createNowPaymentsInvoice"), "fee route does not start crypto charges");
assert(!feeRoute.includes("createBinancePayOrder"), "fee route does not start Binance charges");

const businessRoute = read("app/api/identity/verification/business/route.ts");
assert(businessRoute.includes("paymentRequired: false"), "business status has no fee");
assert(businessRoute.includes("markPhysicalSellingRequested"), "support request is recorded");
assert(!businessRoute.includes("status: 402"), "business status does not demand payment");

const selector = read("components/product/ProductTypeSelector.tsx");
assert(selector.includes("Contact Support"), "physical selling points to support");
assert(!selector.includes("Continue to payment"), "physical selling has no payment CTA");

const shell = read("components/product/ProductFormShell.tsx");
assert(shell.includes('button_text: "Buy Now"'), "default CTA Buy Now");

console.log("✅ verify-business-verification-fee.mjs passed");
