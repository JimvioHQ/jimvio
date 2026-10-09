import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EARNING_OPTIONS, EARNING_WELCOME, buildEarningGuideReply } from "./earning-guide.ts";

const root = new URL("../../", import.meta.url);

describe("earning guide", () => {
  it("introduces free starting options without promising income", () => {
    const reply = buildEarningGuideReply("How can I start earning?");
    assert.match(reply, /Welcome to Jimvio AI/);
    assert.match(reply, /What would you like to start with|What would you like to do first/);
    assert.match(reply, /not guaranteed/);
    for (const option of EARNING_OPTIONS) {
      assert.match(reply, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("opens a guided path with a real route", () => {
    const reply = buildEarningGuideReply("Sell products");
    assert.match(reply, /Seller products/);
    assert.match(reply, /\/seller\/products/);
    assert.match(reply, /\/register/);
    assert.equal(reply.includes("%"), false);
    assert.match(buildEarningGuideReply("Earn through affiliate links"), /\/affiliates/);
    assert.match(buildEarningGuideReply("Create UGC or join campaigns"), /\/ugc/);
    assert.match(buildEarningGuideReply("Start dropshipping"), /\/commerce/);
    assert.match(buildEarningGuideReply("Build a community"), /\/communities/);
    assert.match(buildEarningGuideReply("Earn through live content"), /\/communities\/live/);
    assert.match(buildEarningGuideReply("Sell digital products"), /\/seller\/products/);
    assert.match(buildEarningGuideReply("Help me choose"), /which of these is closest/i);
  });

  it("keeps the homepage earning button on the existing assistant", () => {
    const hero = readFileSync(new URL("components/layout/hero.tsx", root), "utf8");
    const register = readFileSync(new URL("app/(auth)/register/page.tsx", root), "utf8");
    assert.match(hero, /openEarningGuide/);
    assert.match(hero, /Start earning for Free/);
    assert.equal(hero.includes('href="/register"'), false);
    assert.match(register, /register|Register|sign/i);
    assert.match(EARNING_WELCOME, /Welcome to Jimvio AI/);
  });

  it("does not call the disconnected stub from the chat hook", () => {
    const hook = readFileSync(new URL("components/copilot/use-copilot-chat.ts", root), "utf8");
    assert.match(hook, /getCopilotProvider\("jimvio-ai"\)/);
    assert.equal(hook.includes('getCopilotProvider("stub")'), false);
  });
});
