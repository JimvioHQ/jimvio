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

console.log(
  STRICT
    ? "✅ Strict environment verification OK"
    : "✅ Environment verification OK (non-strict; pass --strict for deploy secrets)"
);
