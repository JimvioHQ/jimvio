import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseAiActionBody } from "./actions.ts";
import { planGuideTurn, type PendingCommunityAction } from "./action-guide.ts";

describe("ai action allowlist", () => {
  it("rejects unknown and unconfirmed operations", () => {
    assert.equal(parseAiActionBody({ operation: "delete_account", confirm: true }).ok, false);
    assert.equal(parseAiActionBody({ operation: "create_community", confirm: false, name: "North" }).ok, false);
    const missing = parseAiActionBody({ operation: "create_community", name: "North" });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.status, 400);
  });

  it("accepts a confirmed community name only", () => {
    const parsed = parseAiActionBody({
      operation: "create_community",
      confirm: true,
      name: "  Northstar  ",
      description: "A place to learn",
      slug: "admin",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.name, "Northstar");
      assert.equal(parsed.description, "A place to learn");
      assert.equal("slug" in parsed, false);
    }
  });
});

describe("action guide", () => {
  it("does not claim a support ticket was opened", () => {
    const turn = planGuideTurn("How do I create a support ticket?", null);
    assert.equal(turn?.execute, undefined);
    assert.match(turn?.content ?? "", /has not opened a ticket/);
    assert.match(turn?.links?.[0]?.href ?? "", /\/help\/tickets\/new/);
    assert.equal((turn?.content ?? "").toLowerCase().includes("ticket was opened"), false);
  });

  it("asks for a community name before any create", () => {
    const turn = planGuideTurn("Help me create a community", null);
    assert.ok(turn);
    assert.equal(turn?.execute, undefined);
    assert.equal(turn?.pending?.phase, "need_name");
    assert.match(turn?.content ?? "", /not created|have not created|after you confirm/i);
  });

  it("prepares confirmation and executes only on an explicit yes", () => {
    const prepared = planGuideTurn("Help me create a community called Northstar", null);
    assert.equal(prepared?.pending?.phase, "need_confirm");
    assert.equal(prepared?.pending?.name, "Northstar");
    assert.equal(prepared?.execute, undefined);

    const pending = prepared?.pending as PendingCommunityAction;
    const confirmed = planGuideTurn("Yes, create it", pending);
    assert.deepEqual(confirmed?.execute, {
      operation: "create_community",
      name: "Northstar",
      description: undefined,
    });
  });

  it("does not claim unsupported work is finished", () => {
    for (const prompt of [
      "Help me create a space",
      "Help me set up my store",
      "Help me add a product",
      "Help me edit this post",
      "Help me create a campaign",
      "Help me start a live session",
      "Help me find a campaign to join",
      "Help me manage my community",
      "Help me edit a product",
    ]) {
      const turn = planGuideTurn(prompt, null);
      assert.ok(turn, prompt);
      assert.equal(turn?.execute, undefined);
      assert.match(turn?.content ?? "", /not|Nothing/i);
      assert.ok((turn?.links?.length ?? 0) > 0);
    }
  });

  it("claims a community only after the server confirms a slug", () => {
    const hook = readFileSync(new URL("../../components/copilot/use-copilot-chat.ts", import.meta.url), "utf8");
    const success = hook.indexOf("Created the free public community");
    const gate = hook.lastIndexOf("!response.ok || !data?.href || !data.community?.slug", success);
    assert.ok(gate > 0 && gate < success);
    assert.match(hook, /Nothing was created/);
    assert.match(hook, /The community was not created/);
    assert.match(hook, /could not reach the server/);
  });

  it("sends paid communities to the form", () => {
    const turn = planGuideTurn("Help me create a paid community", null);
    assert.equal(turn?.execute, undefined);
    assert.equal(turn?.pending, null);
    assert.match(turn?.links?.[0]?.href ?? "", /\/communities\/create/);
  });
});
