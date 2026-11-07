/**
 * Fail-closed gates for UGC authenticated E2E. No secrets and no network.
 * Storage states and opt-in flags must be configured via env / CI secrets —
 * never commit passwords or session cookies.
 */

export const USER_A_STORAGE = ".auth/ugc-user-a.json";
export const USER_B_STORAGE = ".auth/ugc-user-b.json";
export const ADMIN_STORAGE = ".auth/ugc-admin.json";

function designated(raw, expected, label) {
  if (!raw || !String(raw).trim()) return { ok: false, reason: `${label} storage unset` };
  const norm = String(raw).replace(/\\/g, "/").replace(/^\.\//, "");
  if (/demo-jimvio|live-host|live-viewer|commerce-/i.test(norm)) {
    return { ok: false, reason: `refused non-ugc storage state for ${label}` };
  }
  if (norm !== expected) {
    return { ok: false, reason: `${label} storage must be ${expected}` };
  }
  return { ok: true, path: expected };
}

export function designatedUserAStorage(raw) {
  return designated(raw, USER_A_STORAGE, "userA");
}

export function designatedUserBStorage(raw) {
  return designated(raw, USER_B_STORAGE, "userB");
}

export function designatedAdminStorage(raw) {
  return designated(raw, ADMIN_STORAGE, "admin");
}

export function targetsProduction(base) {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return host === "jimvio.com" || host.endsWith(".jimvio.com");
  } catch {
    return false;
  }
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

export function adminEnabled(env) {
  return readOnlySignedIn(env) && env.admin === "1";
}

/** Diagnostics for the first signed-in isolation pass (no writes, no payments). */
export function isolationDiagnostics(env, files) {
  const missing = [];
  if (env.allow !== "1") missing.push("Set UGC_E2E_ALLOW=1");
  if (targetsProduction(env.base || "") && env.productionTarget !== "1") {
    missing.push(
      "Unset a jimvio.com UGC_E2E_BASE_URL, or set UGC_E2E_PRODUCTION_TARGET=1 only for an intentional production run",
    );
  }
  if (!files?.userA) missing.push(`Save disposable User A login to ${USER_A_STORAGE}`);
  if (!files?.userB) missing.push(`Save disposable User B login to ${USER_B_STORAGE}`);
  if (env.mutate === "1") missing.push("Unset UGC_E2E_MUTATE for the isolation pass");
  if (env.paymentSandbox === "1" || env.sandboxConfirmed === "1") {
    missing.push("Unset UGC_E2E_PAYMENT_SANDBOX and UGC_E2E_SANDBOX_CONFIRMED for the isolation pass");
  }
  return missing;
}
