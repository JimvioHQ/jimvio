#!/usr/bin/env node
/**
 * Verify required GitHub Actions / deploy environment variables exist (names only).
 * Usage: node scripts/release/verify-env.mjs [--strict]
 */

const STRICT = process.argv.includes("--strict");

const REQUIRED_ALWAYS = [];
const REQUIRED_STRICT = [
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "NEXT_PUBLIC_APP_URL",
];

/** Names only. Never print values. Local/CI may omit these; production live E2E cannot. */
const UGC_PAYMENT_SECRET_NAMES = [
  "NOWPAYMENTS_IPN_SECRET",
  "NOWPAYMENTS_API_KEY",
  "NOWPAYMENTS_ENV",
  "FLW_SECRET_KEY",
  "FLUTTERWAVE_SECRET_KEY",
  "FLW_WEBHOOK_SECRET",
  "FLUTTERWAVE_WEBHOOK_HASH",
];

const missing = [];
for (const key of REQUIRED_ALWAYS) {
  if (!process.env[key]) missing.push(key);
}
if (STRICT) {
  for (const key of REQUIRED_STRICT) {
    if (!process.env[key]) missing.push(key);
  }
}

if (missing.length) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

const ugcPresent = [];
const ugcMissing = [];
for (const key of UGC_PAYMENT_SECRET_NAMES) {
  if (process.env[key] && String(process.env[key]).trim()) ugcPresent.push(key);
  else ugcMissing.push(key);
}
console.log(
  `UGC payment env (names only): present=${ugcPresent.length} missing=${ugcMissing.length}${
    ugcMissing.length ? ` [${ugcMissing.join(", ")}]` : ""
  }`
);

console.log(
  STRICT
    ? "✅ Strict environment verification OK"
    : "✅ Environment verification OK (non-strict; pass --strict for deploy secrets)"
);
