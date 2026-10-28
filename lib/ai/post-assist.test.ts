import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPostAssistPrompt, parsePostAssistAction } from "./post-assist.ts";

describe("post assist prompt", () => {
  it("accepts only known actions", () => {
    assert.equal(parsePostAssistAction("draft"), "draft");
    assert.equal(parsePostAssistAction("delete_all"), null);
    assert.equal(parsePostAssistAction(undefined), null);
  });
  it("forbids invented facts and promised returns", () => {
    const p = buildPostAssistPrompt({ action: "draft", text: "", topic: "my gold trading routine" });
    assert.match(p.instructions, /Never invent facts/);
    assert.match(p.instructions, /Never promise income, profits or returns/);
    assert.match(p.input, /my gold trading routine/);
  });
  it("keeps facts when improving or shortening", () => {
    for (const action of ["improve", "shorten"] as const) {
      const p = buildPostAssistPrompt({ action, text: "We meet Friday at 6pm.", topic: "", communityName: "P7" });
      assert.match(p.input, /every fact unchanged/);
      assert.match(p.input, /We meet Friday at 6pm\./);
      assert.match(p.instructions, /"P7"/);
    }
  });
});
