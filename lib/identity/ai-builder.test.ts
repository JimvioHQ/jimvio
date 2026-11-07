import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BIO_MODES,
  bioAssistInstructions,
  extractJsonObject,
  profileBuilderDraftSchema,
  profileBuilderInstructions,
} from "./ai-builder";

describe("identity AI builder helpers", () => {
  it("exposes supported biography modes", () => {
    assert.ok(BIO_MODES.includes("improve"));
    assert.ok(BIO_MODES.includes("generate"));
  });

  it("keeps integrity language in instructions", () => {
    for (const mode of BIO_MODES) {
      assert.match(bioAssistInstructions(mode), /Never invent/i);
    }
    assert.match(profileBuilderInstructions(), /Never invent/i);
  });

  it("parses JSON objects and rejects invented schema noise loosely", () => {
    const parsed = extractJsonObject('```json\n{"headline":"Trader","skills":["FX"]}\n```');
    const draft = profileBuilderDraftSchema.parse(parsed);
    assert.equal(draft.headline, "Trader");
    assert.deepEqual(draft.skills, ["FX"]);
  });
});
