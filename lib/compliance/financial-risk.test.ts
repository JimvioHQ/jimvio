import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFinancialRiskTopic } from "./financial-risk.ts";

describe("isFinancialRiskTopic", () => {
  it("flags trading, forex and finance topics", () => {
    assert.equal(isFinancialRiskTopic({ category: "Trading" }), true);
    assert.equal(isFinancialRiskTopic({ name: "Prime fx invest" }), true);
    assert.equal(isFinancialRiskTopic({ category: "Finance", name: "QuantForg" }), true);
    assert.equal(isFinancialRiskTopic({ tagline: "trade like professional" }), true);
  });
  it("leaves other topics alone", () => {
    assert.equal(isFinancialRiskTopic({ category: "Business", name: "gcs unity" }), false);
    assert.equal(isFinancialRiskTopic({ name: "Fashion Hub", tagline: "Style tips" }), false);
  });
});
