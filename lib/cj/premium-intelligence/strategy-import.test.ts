import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateStrategyRow, keywordsForRun, strategyKeywords, titleMatchesKeyword } from "@/lib/cj/premium-intelligence/strategy-select";

const good = { title: "Portable Power Bank 20000mAh Fast Charging", keyword: "power bank", stock: 5000, costUsd: 6.5, trendScore: 70, supplierScore: 80, verifiedWarehouse: null, supplierVerifiedFlag: false };

describe("strategy import selection", () => {
  it("qualifies only trending + verified + in-stock strategy products", () => {
    assert.deepEqual(evaluateStrategyRow(good).reasons, []);
    assert.ok(evaluateStrategyRow({ ...good, trendScore: 10 }).reasons.includes("not_trending"));
    assert.ok(evaluateStrategyRow({ ...good, supplierScore: 40 }).reasons.includes("supplier_not_verified"));
    assert.ok(evaluateStrategyRow({ ...good, supplierScore: 40, verifiedWarehouse: 1 }).qualified);
    assert.ok(evaluateStrategyRow({ ...good, stock: 20 }).reasons.includes("low_stock"));
    assert.ok(evaluateStrategyRow({ ...good, costUsd: 1.2 }).reasons.includes("low_value"));
    assert.ok(evaluateStrategyRow({ ...good, title: "Women's Polka Dot Hair Band" }).reasons.includes("off_strategy"));
  });

  it("matches the real product, including joined spellings", () => {
    assert.ok(titleMatchesKeyword("Smartwatch Fitness Heart Rate", "smart watch"));
    assert.ok(titleMatchesKeyword("Mini Smart Plug WiFi Socket", "smart plug"));
    assert.ok(!titleMatchesKeyword("Plug Adapter Smart Design Bag", "smart plug pro"));
    assert.ok(!titleMatchesKeyword("Watch Strap Resin", "smart watch"));
  });

  it("rotates through every strategy keyword", () => {
    const all = strategyKeywords();
    assert.ok(all.length >= 40);
    const seen = new Set<string>();
    for (let h = 0; h < 2 * all.length; h += 2) keywordsForRun(new Date(Date.UTC(2026, 10, 7, 0) + h * 3600_000), 2).forEach((k) => seen.add(k.keyword));
    assert.equal(seen.size, all.length);
    assert.equal(all[0]!.category === "smart_home" || all[0]!.category === "power_energy" || all[0]!.category === "wearables_tech", true);
  });
});
