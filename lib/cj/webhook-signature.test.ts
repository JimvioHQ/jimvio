import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyCjWebhookSignature } from "./webhook-signature.ts";

describe("CJ webhook signature verification", () => {
  const openId = "123";
  const rawBody = '{"messageId":"123111","messageType":"INSERT","params":"123","type":"PRODUCT"}';
  const officialExpected = "AHxoGFMoS/4mZfJ5vFes5//Pz2QibFQhh3GlrTtnWpk=";

  it("accepts the official CJ HMAC-SHA256 Base64 example", () => {
    assert.equal(verifyCjWebhookSignature(rawBody, officialExpected, openId), true);
  });

  it("rejects a modified body", () => {
    assert.equal(
      verifyCjWebhookSignature(rawBody + " ", officialExpected, openId),
      false
    );
  });

  it("rejects missing or incorrect signatures and secrets", () => {
    assert.equal(verifyCjWebhookSignature(rawBody, null, openId), false);
    assert.equal(verifyCjWebhookSignature(rawBody, "invalid", openId), false);
    assert.equal(verifyCjWebhookSignature(rawBody, officialExpected, ""), false);
  });
});
