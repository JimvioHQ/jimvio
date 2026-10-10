/**
 * Fail-closed gates for Commerce E2E. No secrets and no network.
 * Signed-in, mutation, and payment flags must each be the exact string "1".
 */

export const MERCHANT_STORAGE = ".auth/commerce-merchant.json";
export const CUSTOMER_STORAGE = ".auth/commerce-customer.json";
const NIL_ID = "00000000-0000-0000-0000-000000000000";

export function designatedStorage(raw, role) {
  const expected = role === "merchant" ? MERCHANT_STORAGE : CUSTOMER_STORAGE;
  if (!raw || !String(raw).trim()) return { ok: false, reason: "storage unset" };
  const norm = String(raw).replace(/\\/g, "/").replace(/^\.\//, "");
  if (/demo-jimvio|live-host|live-viewer/i.test(norm)) {
    return { ok: false, reason: "refused non-commerce storage state" };
  }
  if (norm !== expected) {
    return { ok: false, reason: `storage must be ${expected}` };
  }
  return { ok: true, path: expected };
}

export function targetsProduction(base) {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return host === "jimvio.com" || host.endsWith(".jimvio.com");
  } catch {
    return false;
  }
}

export function isFixtureId(id) {
  if (!id || String(id).toLowerCase() === NIL_ID) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
}

export function readOnlySignedIn(env) {
  if (env.allow !== "1") return false;
  if (targetsProduction(env.base || "") && env.productionTarget !== "1") return false;
  return true;
}

export function mutationsEnabled(env) {
  return readOnlySignedIn(env) && env.mutate === "1";
}

export function paymentsEnabled(env) {
  return mutationsEnabled(env) && env.paymentSandbox === "1" && env.sandboxConfirmed === "1";
}

/** First signed-in pass: allow reads, and keep every write and payment flag off. */
export function readOnlyDiagnostics(env, files) {
  const missing = [];
  if (env.allow !== "1") missing.push("Set COMMERCE_E2E_ALLOW=1");
  if (targetsProduction(env.base || "") && env.productionTarget !== "1") {
    missing.push("Unset a jimvio.com COMMERCE_E2E_BASE_URL, or set COMMERCE_E2E_PRODUCTION_TARGET=1 only for an intentional production run");
  }
  if (!files?.merchant) missing.push("Save a disposable merchant login to .auth/commerce-merchant.json");
  if (!files?.customer) missing.push("Optional for customer pages: save .auth/commerce-customer.json and set COMMERCE_E2E_STORE_HANDLE");
  if (env.mutate === "1") missing.push("Unset COMMERCE_E2E_MUTATE for the read-only pass");
  if (env.paymentSandbox === "1" || env.sandboxConfirmed === "1") {
    missing.push("Unset COMMERCE_E2E_PAYMENT_SANDBOX and COMMERCE_E2E_SANDBOX_CONFIRMED for the read-only pass");
  }
  return missing;
}

export function readOnlyProfile(env) {
  return (
    readOnlySignedIn(env) &&
    env.mutate !== "1" &&
    env.paymentSandbox !== "1" &&
    env.sandboxConfirmed !== "1" &&
    env.probeProduction !== "1"
  );
}

export function nowPaymentsReadiness(env) {
  const mode = String(env.nowPaymentsEnv || "").trim().toLowerCase();
  const key = Boolean(String(env.apiKey || "").trim());
  const ipn = Boolean(String(env.ipnSecret || "").trim());
  const modeLabel = mode === "sandbox" ? "sandbox" : mode ? "not-sandbox" : "unset";
  return {
    mode: modeLabel,
    apiKey: key ? "set" : "unset",
    ipnSecret: ipn ? "set" : "unset",
    ready: mode === "sandbox" && key && ipn,
  };
}

export function storefrontUrl(base, handle, productionTarget) {
  const root = String(base || "http://localhost:3000").replace(/\/$/, "");
  if (productionTarget === "1" && targetsProduction(root) && handle) {
    return `https://${handle}.jimvio.com`;
  }
  return `${root}/s/${handle}`;
}
