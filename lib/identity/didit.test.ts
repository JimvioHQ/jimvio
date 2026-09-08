import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  diditCanonicalJsonV2,
  fingerprintEvent,
  mapDiditStatusToCustomer,
  verifyDiditWebhook,
} from "./didit";

describe("didit helpers", () => {
  it("maps Approved to verified without inventing statuses", () => {
    assert.equal(mapDiditStatusToCustomer("Approved").key, "verified");
    assert.equal(mapDiditStatusToCustomer("Declined").key, "failed");
    assert.equal(mapDiditStatusToCustomer("In Review").key, "in_review");
    assert.equal(mapDiditStatusToCustomer("").key, "not_started");
  });

  it("rejects stale timestamps", () => {
    const secret = "test-secret";
    const parsed = {
      event_id: "e1",
      session_id: "s1",
      status: "Approved",
      webhook_type: "status.updated",
    };
    const rawBody = JSON.stringify(parsed);
    const now = Math.floor(Date.now() / 1000);
    const result = verifyDiditWebhook({
      rawBody,
      parsed,
      signature: createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"),
      timestamp: String(now - 301),
      secret,
      nowSec: now,
    });
    assert.equal(result.ok, false);
  });

  it("accepts valid raw X-Signature within window", () => {
    const secret = "test-secret";
    const parsed = {
      event_id: "e1",
      session_id: "s1",
      status: "Approved",
      webhook_type: "status.updated",
    };
    const rawBody = JSON.stringify(parsed);
    const now = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    const result = verifyDiditWebhook({
      rawBody,
      parsed,
      signature,
      timestamp: String(now),
      secret,
      nowSec: now,
    });
    assert.deepEqual(result, { ok: true });
  });

  it("accepts X-Signature-V2 over canonical JSON", () => {
    const secret = "test-secret";
    const parsed = {
      status: "Approved",
      event_id: "e1",
      session_id: "s1",
      webhook_type: "status.updated",
    };
    const rawBody = JSON.stringify(parsed);
    const now = Math.floor(Date.now() / 1000);
    const signatureV2 = createHmac("sha256", secret)
      .update(diditCanonicalJsonV2(parsed), "utf8")
      .digest("hex");
    const result = verifyDiditWebhook({
      rawBody,
      parsed,
      signatureV2,
      timestamp: String(now),
      secret,
      nowSec: now,
    });
    assert.deepEqual(result, { ok: true });
  });

  it("fingerprints events stably", () => {
    assert.equal(fingerprintEvent(["a", "b"]), fingerprintEvent(["a", "b"]));
    assert.notEqual(fingerprintEvent(["a", "b"]), fingerprintEvent(["a", "c"]));
  });
});
