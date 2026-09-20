import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isRetiredPaymentProvider,
  RETIRED_PAYMENT_PROVIDERS,
  retiredPaymentProviderResponse,
} from "./retired-providers.ts";

describe("retired payment providers", () => {
  it("recognizes pesapal and paypal as retired", () => {
    assert.equal(isRetiredPaymentProvider("pesapal"), true);
    assert.equal(isRetiredPaymentProvider("PayPal"), true);
    assert.equal(isRetiredPaymentProvider("flutterwave"), false);
    assert.equal(isRetiredPaymentProvider("nowpayments"), false);
    assert.deepEqual([...RETIRED_PAYMENT_PROVIDERS], ["pesapal", "paypal"]);
  });

  it("returns a safe 410 rejection body", async () => {
    const res = retiredPaymentProviderResponse("pesapal");
    assert.equal(res.status, 410);
    const body = (await res.json()) as { code: string; error: string };
    assert.equal(body.code, "PROVIDER_RETIRED");
    assert.match(body.error, /no longer available/i);
  });

  it("checkout UI does not list retired providers as MethodId options", () => {
    const selector = readFileSync(
      join(process.cwd(), "components/checkout/PaymentMethodSelector.tsx"),
      "utf8",
    );
    const match = selector.match(/^export type MethodId =[\s\S]*?;/m);
    assert.ok(match, "active MethodId export missing");
    const methodIdBlock = match![0];
    assert.equal(/pesapal/.test(methodIdBlock), false);
    assert.equal(/paypal/.test(methodIdBlock), false);
    assert.match(methodIdBlock, /flutterwave/);
    assert.match(methodIdBlock, /nowpayments/);
    assert.match(methodIdBlock, /mobile_money/);
  });

  it("platform payment-providers API never advertises retired providers", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/platform/payment-providers/route.ts"),
      "utf8",
    );
    assert.match(src, /RETIRED_PAYMENT_PROVIDERS|isRetiredPaymentProvider/);
    assert.equal(/case "pesapal":/.test(src), false);
    assert.equal(/case "paypal":/.test(src), false);
  });

  it("admin payments form does not offer retired provider toggles", () => {
    const src = readFileSync(
      join(process.cwd(), "components/settings/payments-form.tsx"),
      "utf8",
    );
    assert.equal(/pesapal:\s*"PesaPal"/.test(src), false);
    assert.equal(/paypal:\s*"PayPal"/.test(src), false);
  });

  it("historical order labels still recognize retired providers", () => {
    const src = readFileSync(
      join(process.cwd(), "app/(public)/orders/[id]/page.tsx"),
      "utf8",
    );
    assert.match(src, /pesapal/);
    assert.match(src, /paypal/);
  });
});
