#!/usr/bin/env node
/**
 * Static gate: $5.65 business verification fee before Didit KYB.
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
assert(
  existsSync(join(root, "database/migrations/152_business_verification_fee_payments.sql")),
  "migration",
);

const feeConst = read("lib/identity/business-verification-fee.ts");
assert(feeConst.includes("BUSINESS_VERIFICATION_FEE_USD = 5.65"), "server fee is 5.65");
assert(
  feeConst.includes('BUSINESS_VERIFICATION_FEE_PURPOSE = "business_verification_fee"'),
  "purpose constant",
);

const feeRoute = read("app/api/identity/verification/fee/route.ts");
assert(feeRoute.includes("const amount = BUSINESS_VERIFICATION_FEE_USD"), "amount server-side only");
assert(feeRoute.includes("createFlutterwavePaymentLink"), "flutterwave path");
assert(feeRoute.includes("idempotency"), "idempotency");

const businessRoute = read("app/api/identity/verification/business/route.ts");
assert(businessRoute.includes("verification_fee_required"), "402 fee required");
assert(businessRoute.includes("getOpenPaidVerificationFee"), "paid fee gate");
assert(businessRoute.includes("status: 402"), "HTTP 402");

const webhookFlw = read("app/api/payments/flutterwave/webhook/route.ts");
assert(
  webhookFlw.includes("confirmBusinessVerificationFeeFromProvider"),
  "flutterwave confirms fee",
);

const webhookDidit = read("app/api/webhooks/didit/route.ts");
assert(webhookDidit.includes("consumeVerificationFeeForVendor"), "declined consumes fee");

const selector = read("components/product/ProductTypeSelector.tsx");
assert(selector.includes("onPayVerificationFee"), "UI pay hook");
assert(selector.includes("Continue to payment"), "payment CTA");
assert(selector.includes("Start verification"), "start KYB CTA");

const shell = read("components/product/ProductFormShell.tsx");
assert(shell.includes("payVerificationFee"), "shell pays fee");
assert(shell.includes("/api/identity/verification/fee"), "shell calls fee API");
assert(shell.includes("business_verification_fee"), "return URL handling");

console.log("✅ verify-business-verification-fee.mjs passed");
