import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  canTransitionDiditStatus,
  diditCanonicalJsonV2,
  fingerprintEvent,
  mapDiditStatusToCustomer,
  verifyDiditWebhook,
} from "./didit";
import {
  assertNonLocalhostProductionOrigin,
  getCanonicalAppOrigin,
} from "@/lib/app-origin";

describe("didit helpers", () => {
  it("maps Didit statuses explicitly (Approved never looks like in progress)", () => {
    assert.equal(mapDiditStatusToCustomer("Approved").key, "verified");
    assert.equal(mapDiditStatusToCustomer("Approved").headline, "Verification successful");
    assert.equal(mapDiditStatusToCustomer("Declined").key, "failed");
    assert.equal(mapDiditStatusToCustomer("In Review").key, "in_review");
    assert.equal(mapDiditStatusToCustomer("Not Finished").key, "in_progress");
    assert.equal(mapDiditStatusToCustomer("Expired").key, "expired");
    assert.equal(mapDiditStatusToCustomer("").key, "not_started");
  });

  it("never regresses Approved to In Progress", () => {
    assert.equal(canTransitionDiditStatus("Approved", "In Progress"), false);
    assert.equal(canTransitionDiditStatus("Approved", "Approved"), true);
    assert.equal(canTransitionDiditStatus("In Progress", "Approved"), true);
    assert.equal(canTransitionDiditStatus("Declined", "In Progress"), false);
    assert.equal(canTransitionDiditStatus("In Progress", "Declined"), true);
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

describe("canonical app origin for Didit callbacks", () => {
  it("never returns localhost when VERCEL_ENV=production", () => {
    const prevVercel = process.env.VERCEL_ENV;
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    try {
      const origin = getCanonicalAppOrigin();
      assert.equal(origin, "https://www.jimvio.com");
      assert.equal(
        assertNonLocalhostProductionOrigin("http://localhost:3000"),
        "https://www.jimvio.com",
      );
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      if (prevApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prevApp;
    }
  });

  it("normalizes apex jimvio.com to www", () => {
    const prevVercel = process.env.VERCEL_ENV;
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://jimvio.com";
    try {
      assert.equal(getCanonicalAppOrigin(), "https://www.jimvio.com");
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      if (prevApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prevApp;
    }
  });
});
