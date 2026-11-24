import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExternalOrderPaymentPatch } from "./payment-state.ts";

describe("external order payment transitions", () => {
  it("promotes pending orders only after a paid event", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "pending", status: "pending" },
      "paid",
      false,
      "2026-11-24T12:00:00.000Z"
    );
    assert.equal(patch.payment_status, "paid");
    assert.equal(patch.status, "confirmed");
    assert.equal(patch.paid_at, "2026-11-24T12:00:00.000Z");
  });

  it("does not downgrade a paid order on a stale pending event", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "paid", status: "confirmed" },
      "pending",
      false,
      "2026-11-24T12:00:00.000Z"
    );
    assert.deepEqual(patch, {});
  });

  it("keeps a cancelled captured order cancelled without losing paid state", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "pending", status: "pending" },
      "paid",
      true,
      "2026-11-24T12:00:00.000Z"
    );
    assert.equal(patch.payment_status, "paid");
    assert.equal(patch.status, "cancelled");
  });

  it("marks an unfulfilled refunded order refunded", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "paid", status: "confirmed" },
      "refunded",
      false,
      "2026-11-24T12:00:00.000Z"
    );
    assert.equal(patch.payment_status, "refunded");
    assert.equal(patch.status, "refunded");
  });

  it("does not rewrite a supplier-submitted order's fulfillment status", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "paid", status: "processing", cj_order_id: "CJ123" },
      "refunded",
      false,
      "2026-11-24T12:00:00.000Z"
    );
    assert.equal(patch.payment_status, "refunded");
    assert.equal("status" in patch, false);
  });

  it("cancels an unpaid order without pretending it was paid", () => {
    const patch = buildExternalOrderPaymentPatch(
      { payment_status: "pending", status: "pending" },
      "pending",
      true,
      "2026-11-24T12:00:00.000Z"
    );
    assert.equal(patch.payment_status, "cancelled");
    assert.equal(patch.status, "cancelled");
  });
});
