import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coursePurchaseConfirmDecision,
  isCoursePurchaseRefundStatus,
  walletCourseIdempotencyKey,
} from "./purchase-policy";

describe("wallet course checkout policy", () => {
  it("binds idempotency to user and course, not a client amount", () => {
    assert.equal(
      walletCourseIdempotencyKey("user-1", "course-9"),
      "CRS-WALLET-user-1-course-9"
    );
    assert.notEqual(
      walletCourseIdempotencyKey("user-1", "course-9"),
      walletCourseIdempotencyKey("user-2", "course-9")
    );
  });

  it("does not grant on failed, cancelled, or refunded payments", () => {
    assert.equal(coursePurchaseConfirmDecision({ txStatus: "failed", hasReceipt: false }), "deny-status");
    assert.equal(coursePurchaseConfirmDecision({ txStatus: "cancelled", hasReceipt: false }), "deny-status");
    assert.equal(coursePurchaseConfirmDecision({ txStatus: "refunded", hasReceipt: true }), "deny-refund");
    assert.equal(coursePurchaseConfirmDecision({ txStatus: "pending", hasReceipt: false }), "grant");
    assert.equal(coursePurchaseConfirmDecision({ txStatus: "completed", hasReceipt: true }), "already-granted");
  });

  it("treats refunded receipts as a revoke, not a replay grant", () => {
    assert.equal(isCoursePurchaseRefundStatus("refunded"), true);
    assert.equal(isCoursePurchaseRefundStatus("REFUNDED"), true);
    assert.equal(isCoursePurchaseRefundStatus("completed"), false);
  });
});
