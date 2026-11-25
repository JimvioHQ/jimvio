import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, describe, it } from "node:test";
import { isFlutterwaveRefundStatus, isFlutterwaveSuccessfulStatus, validateFlutterwaveWebhookRequest } from "./flutterwave";

const originalSecret = process.env.FLW_WEBHOOK_SECRET;
const secret = "jimvio-flutterwave-webhook-unit-test-secret";

after(() => {
  if (originalSecret === undefined) delete process.env.FLW_WEBHOOK_SECRET;
  else process.env.FLW_WEBHOOK_SECRET = originalSecret;
});

describe("Flutterwave webhook signature verification", () => {
  it("accepts a valid v4 base64 HMAC signature for the exact raw body", () => {
    process.env.FLW_WEBHOOK_SECRET = secret;
    const rawBody = JSON.stringify({ id: 123, status: "successful" });
    const signature = createHmac("sha256", secret).update(rawBody).digest("base64");
    const headers = new Headers({ "flutterwave-signature": signature });

    assert.equal(validateFlutterwaveWebhookRequest(headers, rawBody), true);
  });

  it("rejects a valid signature when the raw body has changed", () => {
    process.env.FLW_WEBHOOK_SECRET = secret;
    const rawBody = JSON.stringify({ id: 123, status: "successful" });
    const signature = createHmac("sha256", secret).update(rawBody).digest("base64");
    const headers = new Headers({ "flutterwave-signature": signature });

    assert.equal(validateFlutterwaveWebhookRequest(headers, rawBody + " "), false);
  });

  it("accepts the legacy verif-hash header only when it matches the configured secret", () => {
    process.env.FLW_WEBHOOK_SECRET = secret;
    const headers = new Headers({ "verif-hash": secret });

    assert.equal(validateFlutterwaveWebhookRequest(headers, "{}"), true);
    headers.set("verif-hash", "incorrect");
    assert.equal(validateFlutterwaveWebhookRequest(headers, "{}"), false);
  });


  it("recognizes refund, reversal, and chargeback events without treating ordinary success as a refund", () => {
    assert.equal(isFlutterwaveRefundStatus("refunded"), true);
    assert.equal(isFlutterwaveRefundStatus("successful", "chargeback.created"), true);
    assert.equal(isFlutterwaveRefundStatus("reversed"), true);
    assert.equal(isFlutterwaveRefundStatus("successful", "payment.completed"), false);
  });

  it("normalizes successful provider status variants", () => {
    assert.equal(isFlutterwaveSuccessfulStatus("successful"), true);
    assert.equal(isFlutterwaveSuccessfulStatus("succeeded"), true);
    assert.equal(isFlutterwaveSuccessfulStatus("completed"), true);
    assert.equal(isFlutterwaveSuccessfulStatus("pending"), false);
  });

  it("fails closed when the webhook secret is absent", () => {
    delete process.env.FLW_WEBHOOK_SECRET;
    const headers = new Headers({ "verif-hash": secret });

    assert.equal(validateFlutterwaveWebhookRequest(headers, "{}"), false);
  });
});
