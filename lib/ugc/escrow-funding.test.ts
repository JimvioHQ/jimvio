import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { campaignFunding, heldEscrowUsd } from "./escrow-funding.ts";

describe("campaign escrow funding", () => {
  it("counts only held deposits, net of refunds", () => {
    assert.equal(
      heldEscrowUsd([
        { status: "held", amount: 700, currency: "USD", refunded_amount: 100 },
        { status: "pending", amount: 900, currency: "USD" },
      ]),
      600,
    );
  });
  it("is funded only when held money covers the budget", () => {
    const full = campaignFunding({ escrow: [{ status: "held", amount: 500, currency: "USD" }], totalBudget: 500, spentBudget: 120 });
    assert.equal(full.state, "funded");
    assert.equal(full.remainingUsd, 380);
    const pending = campaignFunding({ escrow: [{ status: "pending", amount: 700, currency: "USD" }], totalBudget: 700, spentBudget: 0 });
    assert.equal(pending.state, "awaiting_funds");
    assert.equal(pending.remainingUsd, 0);
  });
  it("converts RWF deposits and never pays beyond them", () => {
    const f = campaignFunding({ escrow: [{ status: "held", amount: 1000, currency: "RWF" }], totalBudget: 500, spentBudget: 0 });
    assert.equal(f.state, "partly_funded");
    assert.ok(f.remainingUsd < 2);
    assert.equal(f.coveragePct, 1);
  });
});
