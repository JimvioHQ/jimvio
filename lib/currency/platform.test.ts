import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMoneyAsUSD,
  formatUSD,
  looksLikeRwfasUsd,
  resolveLineUnitUsd,
  toPlatformUsd,
  PLATFORM_CURRENCY,
} from "./platform";

describe("platform USD money consistency", () => {
  it("converts 14100 RWF to $11.28 once — never $14,100", () => {
    const usd = toPlatformUsd(14100, "RWF");
    assert.equal(usd, 11.28);
    assert.equal(formatUSD(usd), "$11.28");
    assert.equal(formatMoneyAsUSD(14100, "RWF"), "$11.28");
    assert.notEqual(formatMoneyAsUSD(14100, "USD"), "$11.28");
    assert.equal(formatMoneyAsUSD(14100, "USD"), "$14,100.00");
  });

  it("passes USD through unchanged", () => {
    assert.equal(toPlatformUsd(11.28, "USD"), 11.28);
    assert.equal(toPlatformUsd(11.28, PLATFORM_CURRENCY), 11.28);
    assert.equal(formatUSD(11.28), "$11.28");
  });

  it("resolves cart snapshot USD without re-reading RWF catalog", () => {
    const unit = resolveLineUnitUsd({
      unitPriceAtAdd: 11.28,
      currencyAtAdd: "USD",
      catalogPrice: 14100,
      catalogCurrency: "RWF",
    });
    assert.equal(unit, 11.28);
  });

  it("falls back to converting catalog RWF when cart snapshot missing", () => {
    const unit = resolveLineUnitUsd({
      unitPriceAtAdd: null,
      currencyAtAdd: null,
      catalogPrice: 14100,
      catalogCurrency: "RWF",
    });
    assert.equal(unit, 11.28);
  });

  it("detects RWF amounts mis-tagged as USD", () => {
    assert.equal(looksLikeRwfasUsd(14100, 14100, "RWF"), true);
    assert.equal(looksLikeRwfasUsd(11.28, 14100, "RWF"), false);
    assert.equal(looksLikeRwfasUsd(14100, 14100, "USD"), false);
  });
});
