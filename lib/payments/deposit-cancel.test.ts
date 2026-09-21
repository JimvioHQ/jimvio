import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Deposit cancellation state machine (mirrors cancel route rules).
 * Keep in sync with app/api/wallet/os/deposits/[id]/cancel/route.ts
 */
function canCancelDepositStatus(status: string): boolean {
  return status === "pending" || status === "processing";
}

function nextCancelOutcome(
  current: string,
  raceNext?: string,
): { ok: boolean; status?: string; code?: string; duplicate?: boolean } {
  if (current === "cancelled") {
    return { ok: true, status: "cancelled", duplicate: true };
  }
  if (current === "completed") {
    return { ok: false, code: "NOT_CANCELLABLE" };
  }
  if (current === "failed") {
    return { ok: false, code: "NOT_CANCELLABLE" };
  }
  if (!canCancelDepositStatus(current)) {
    return { ok: false, code: "NOT_CANCELLABLE" };
  }
  if (raceNext === "completed") {
    return { ok: false, code: "RACE_COMPLETED" };
  }
  if (raceNext === "cancelled") {
    return { ok: true, status: "cancelled", duplicate: true };
  }
  return { ok: true, status: "cancelled" };
}

describe("deposit cancellation state machine", () => {
  it("allows cancel only for pending/processing", () => {
    assert.equal(canCancelDepositStatus("pending"), true);
    assert.equal(canCancelDepositStatus("processing"), true);
    assert.equal(canCancelDepositStatus("completed"), false);
    assert.equal(canCancelDepositStatus("failed"), false);
    assert.equal(canCancelDepositStatus("cancelled"), false);
    assert.equal(canCancelDepositStatus("expired"), false);
  });

  it("is idempotent for already-cancelled", () => {
    const r = nextCancelOutcome("cancelled");
    assert.equal(r.ok, true);
    assert.equal(r.duplicate, true);
    assert.equal(r.status, "cancelled");
  });

  it("rejects completed and failed without mutating", () => {
    assert.equal(nextCancelOutcome("completed").ok, false);
    assert.equal(nextCancelOutcome("failed").ok, false);
  });

  it("handles success-vs-cancel race as not cancellable", () => {
    const r = nextCancelOutcome("pending", "completed");
    assert.equal(r.ok, false);
    assert.equal(r.code, "RACE_COMPLETED");
  });

  it("never implies wallet credit on cancel", () => {
    const r = nextCancelOutcome("pending");
    assert.equal(r.ok, true);
    assert.equal(r.status, "cancelled");
    assert.equal("credited" in r, false);
    assert.equal("balanceDelta" in r, false);
  });
});
