import assert from "node:assert/strict";
import test from "node:test";
import {
  designatedStorage,
  isFixtureId,
  mutationsEnabled,
  nowPaymentsReadiness,
  paymentsEnabled,
  readOnlyDiagnostics,
  readOnlyProfile,
  readOnlySignedIn,
  storefrontUrl,
  targetsProduction,
} from "./commerce-e2e-gates.mjs";

const local = { allow: "1", base: "http://localhost:3000", productionTarget: "" };

test("read-only signed-in checks stay off without explicit allow", () => {
  assert.equal(readOnlySignedIn({ ...local, allow: "" }), false);
  assert.equal(readOnlySignedIn(local), true);
});

test("production targets require a separate confirmation", () => {
  const prod = { allow: "1", base: "https://www.jimvio.com", productionTarget: "" };
  assert.equal(targetsProduction(prod.base), true);
  assert.equal(readOnlySignedIn(prod), false);
  assert.equal(readOnlySignedIn({ ...prod, productionTarget: "1" }), true);
});

test("read-only diagnostics name the missing owner steps", () => {
  const missing = readOnlyDiagnostics(
    { allow: "", base: "http://localhost:3000", mutate: "", paymentSandbox: "", sandboxConfirmed: "", productionTarget: "" },
    { merchant: false, customer: false },
  );
  assert.ok(missing.some((line) => line.includes("COMMERCE_E2E_ALLOW=1")));
  assert.ok(missing.some((line) => line.includes("commerce-merchant.json")));
});

test("read-only profile rejects write and payment flags", () => {
  assert.equal(readOnlyProfile(local), true);
  assert.equal(readOnlyProfile({ ...local, allow: "" }), false);
  assert.equal(readOnlyProfile({ ...local, mutate: "1" }), false);
  assert.equal(readOnlyProfile({ ...local, paymentSandbox: "1" }), false);
  assert.equal(readOnlyProfile({ ...local, probeProduction: "1" }), false);
});

test("mutations and payments fail closed", () => {
  assert.equal(mutationsEnabled(local), false);
  assert.equal(mutationsEnabled({ ...local, mutate: "1" }), true);
  assert.equal(paymentsEnabled({ ...local, mutate: "1", paymentSandbox: "1" }), false);
  assert.equal(
    paymentsEnabled({ ...local, mutate: "1", paymentSandbox: "1", sandboxConfirmed: "1" }),
    true,
  );
  assert.equal(
    paymentsEnabled({ ...local, paymentSandbox: "1", sandboxConfirmed: "1" }),
    false,
  );
});

test("storage state cannot point at historical sessions", () => {
  assert.equal(designatedStorage(".auth/demo-jimvio.json", "merchant").ok, false);
  assert.equal(designatedStorage(".auth/live-host.json", "merchant").ok, false);
  assert.equal(designatedStorage(".auth/commerce-customer.json", "merchant").ok, false);
  assert.equal(designatedStorage(".auth/commerce-merchant.json", "merchant").ok, true);
  assert.equal(designatedStorage(".auth/commerce-customer.json", "customer").ok, true);
});

test("nil and blank fixture ids are rejected", () => {
  assert.equal(isFixtureId(""), false);
  assert.equal(isFixtureId("00000000-0000-0000-0000-000000000000"), false);
  assert.equal(isFixtureId("11111111-1111-4111-8111-111111111111"), true);
});

test("sandbox mode without credentials is not payment-ready", () => {
  const missing = nowPaymentsReadiness({ nowPaymentsEnv: "sandbox", apiKey: "", ipnSecret: "" });
  assert.equal(missing.mode, "sandbox");
  assert.equal(missing.ready, false);
  const live = nowPaymentsReadiness({ nowPaymentsEnv: "production", apiKey: "present", ipnSecret: "present" });
  assert.equal(live.mode, "not-sandbox");
  assert.equal(live.ready, false);
  const ready = nowPaymentsReadiness({ nowPaymentsEnv: "sandbox", apiKey: "present", ipnSecret: "present" });
  assert.equal(ready.ready, true);
});

test("local storefront URLs stay off production hosts", () => {
  assert.equal(
    storefrontUrl("http://localhost:3000", "e2e-store", ""),
    "http://localhost:3000/s/e2e-store",
  );
  assert.equal(
    storefrontUrl("https://www.jimvio.com", "e2e-store", "1"),
    "https://e2e-store.jimvio.com",
  );
});
