import assert from "node:assert/strict";
import test from "node:test";
import { resolveAffiliateRefundKey } from "./refund-idempotency";

const orderId = "7d4f7a1a-8b2e-4c3d-9e5f-1a2b3c4d5e6f";

test("uses provider transaction ID as the stable refund event key", () => {
  assert.equal(
    resolveAffiliateRefundKey(orderId, { providerTransactionId: "refund-123" }),
    `order:${orderId}:refund:refund-123`,
  );
});

test("uses provider webhook metadata when no transaction ID is present", () => {
  assert.equal(
    resolveAffiliateRefundKey(orderId, { metadata: { event_id: "evt-456" } }),
    `order:${orderId}:refund:evt-456`,
  );
});

test("uses a deterministic note fallback when no provider event ID exists", () => {
  assert.equal(
    resolveAffiliateRefundKey(orderId, { notes: "Order payment refunded" }),
    `order:${orderId}:refund:Order payment refunded`,
  );
});
