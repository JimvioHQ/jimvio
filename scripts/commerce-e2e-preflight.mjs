#!/usr/bin/env node
/**
 * Prints Commerce E2E readiness without secret values.
 * Exit 0 always. Signed-in flows stay blocked until the owner sets the flags.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUSTOMER_STORAGE,
  MERCHANT_STORAGE,
  nowPaymentsReadiness,
  paymentsEnabled,
  readOnlyProfile,
  readOnlySignedIn,
} from "./commerce-e2e-gates.mjs";

const root = process.cwd();

function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function fileStatus(rel) {
  if (!rel) return "unset";
  return existsSync(join(root, rel)) ? "file-present" : "file-missing";
}

function envStatus(name) {
  const value = process.env[name];
  if (value == null || value.trim() === "") return "unset";
  return "set";
}

const merchantStorage = MERCHANT_STORAGE;
const customerStorage = CUSTOMER_STORAGE;

const checks = [
  ["COMMERCE_E2E_ALLOW", envStatus("COMMERCE_E2E_ALLOW")],
  ["COMMERCE_E2E_MUTATE", envStatus("COMMERCE_E2E_MUTATE")],
  ["COMMERCE_E2E_PAYMENT_SANDBOX", envStatus("COMMERCE_E2E_PAYMENT_SANDBOX")],
  ["COMMERCE_E2E_BASE_URL", envStatus("COMMERCE_E2E_BASE_URL")],
  ["COMMERCE_E2E_STORE_ID", envStatus("COMMERCE_E2E_STORE_ID")],
  ["COMMERCE_E2E_STORE_HANDLE", envStatus("COMMERCE_E2E_STORE_HANDLE")],
  ["COMMERCE_E2E_MARKETPLACE_PRODUCT_ID", envStatus("COMMERCE_E2E_MARKETPLACE_PRODUCT_ID")],
  ["COMMERCE_E2E_SUPPLIER_PRODUCT_ID", envStatus("COMMERCE_E2E_SUPPLIER_PRODUCT_ID")],
  ["COMMERCE_E2E_PAGE_ID", envStatus("COMMERCE_E2E_PAGE_ID")],
  ["COMMERCE_E2E_UNPAID_ORDER_ID", envStatus("COMMERCE_E2E_UNPAID_ORDER_ID")],
  ["COMMERCE_E2E_PRODUCTION_TARGET", envStatus("COMMERCE_E2E_PRODUCTION_TARGET")],
  ["COMMERCE_E2E_SANDBOX_CONFIRMED", envStatus("COMMERCE_E2E_SANDBOX_CONFIRMED")],
  ["COMMERCE_E2E_PROBE_PRODUCTION", envStatus("COMMERCE_E2E_PROBE_PRODUCTION")],
  ["merchant storage", fileStatus(merchantStorage)],
  ["customer storage", fileStatus(customerStorage)],
  ["FLW_SECRET_KEY", envStatus("FLW_SECRET_KEY") === "set" || envStatus("FLUTTERWAVE_SECRET_KEY") === "set" ? "set" : "unset"],
  ["FLW_WEBHOOK_SECRET", envStatus("FLW_WEBHOOK_SECRET") === "set" || envStatus("FLUTTERWAVE_WEBHOOK_HASH") === "set" ? "set" : "unset"],
];

console.log("Commerce E2E preflight (names and status only)");
for (const [name, status] of checks) {
  console.log(`${status}\t${name}`);
}

const now = nowPaymentsReadiness({
  nowPaymentsEnv: process.env.NOWPAYMENTS_ENV,
  apiKey: process.env.NOWPAYMENTS_API_KEY,
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
});
console.log(`${now.mode}\tNOWPAYMENTS_ENV`);
console.log(`${now.apiKey}\tNOWPAYMENTS_API_KEY`);
console.log(`${now.ipnSecret}\tNOWPAYMENTS_IPN_SECRET`);
console.log(`${now.ready ? "ready" : "incomplete"}\tnowpayments sandbox configuration`);

const gateEnv = {
  allow: process.env.COMMERCE_E2E_ALLOW,
  mutate: process.env.COMMERCE_E2E_MUTATE,
  paymentSandbox: process.env.COMMERCE_E2E_PAYMENT_SANDBOX,
  sandboxConfirmed: process.env.COMMERCE_E2E_SANDBOX_CONFIRMED,
  productionTarget: process.env.COMMERCE_E2E_PRODUCTION_TARGET,
  probeProduction: process.env.COMMERCE_E2E_PROBE_PRODUCTION,
  base: process.env.COMMERCE_E2E_BASE_URL || "http://localhost:3000",
};
console.log(`${readOnlySignedIn(gateEnv) ? "open" : "closed"}\tsigned-in gate`);
console.log(`${readOnlyProfile(gateEnv) ? "ready" : "blocked"}\tread-only profile`);
console.log(`${paymentsEnabled(gateEnv) ? "open" : "closed"}\tpayment gate`);
console.log("Do not create production accounts or orders until the owner sets the flags above.");
