import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cjIntelligenceDisabledPayload,
  isCjProductIntelligenceProcessingEnabled,
} from "./intelligence-kill-switch";

describe("CJ product intelligence kill switch", () => {
  it("is fail-closed unless explicitly enabled", () => {
    const previous = process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED;
    delete process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED;
    assert.equal(isCjProductIntelligenceProcessingEnabled(), false);
    process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED = "false";
    assert.equal(isCjProductIntelligenceProcessingEnabled(), false);
    process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED = "true";
    assert.equal(isCjProductIntelligenceProcessingEnabled(), true);
    if (previous === undefined) delete process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED;
    else process.env.CJ_PRODUCT_INTELLIGENCE_ENABLED = previous;
  });

  it("returns a durable disabled payload without starting work", () => {
    const payload = cjIntelligenceDisabledPayload({ rescored: 0 });
    assert.equal(payload.disabled, true);
    assert.equal(payload.reason, "cj_product_intelligence_kill_switch");
    assert.equal(payload.rescored, 0);
  });
});
