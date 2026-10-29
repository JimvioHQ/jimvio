import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanHistory, fallbackAnswer, parseAssistantJson, sanitizeDraft, wantsCampaignDraft, type AssistantCampaign } from "./assistant.ts";

const camp = (over: Partial<AssistantCampaign> = {}): AssistantCampaign => ({
  id: "c1",
  title: "Inshallah song clips",
  brand: "P7",
  type: "music_clipping",
  paymentModel: "per_views",
  ratePer1k: 1,
  fixedRate: null,
  platforms: ["tiktok", "youtube"],
  remainingUsd: 495,
  totalUsd: 500,
  endsAt: null,
  joinMode: "instant",
  ...over,
});

describe("Jimvio AI campaign drafts", () => {
  it("accepts a complete per-view draft and clamps values", () => {
    const d = sanitizeDraft({
      title: "Promote my song",
      campaign_type: "music_clipping",
      payment_model: "per_views",
      rate_per_1k_views: "$900",
      total_budget: 500,
      allowed_platforms: ["TikTok", "x", "youtube"],
      required_hashtags: ["song", "#Bad Tag!", "#Jimvio"],
    });
    assert.ok(d);
    assert.equal(d.rate_per_1k_views, 50);
    assert.deepEqual(d.allowed_platforms, ["tiktok", "youtube"]);
    assert.deepEqual(d.required_hashtags, ["song", "Jimvio"]);
    assert.equal(d.join_mode, "instant");
  });
  it("rejects drafts without a budget or rate", () => {
    assert.equal(sanitizeDraft({ title: "Promote", total_budget: 0, rate_per_1k_views: 1 }), null);
    assert.equal(sanitizeDraft({ title: "Promote it", total_budget: 100, payment_model: "fixed_per_content" }), null);
    assert.equal(sanitizeDraft(null), null);
  });
  it("detects campaign creation requests", () => {
    assert.equal(wantsCampaignDraft("Create a campaign for my shoes"), true);
    assert.equal(wantsCampaignDraft("How do I submit a post?"), false);
  });
});

describe("Jimvio AI answers", () => {
  it("parses JSON answers, including fenced ones", () => {
    const p = parseAssistantJson('```json\n{"reply":"Hi","campaignIds":["c1"],"draft":null}\n```');
    assert.equal(p?.reply, "Hi");
    assert.deepEqual(p?.campaignIds, ["c1"]);
    assert.equal(parseAssistantJson("not json"), null);
  });
  it("only recommends real campaigns when the model is down", () => {
    const a = fallbackAnswer("find tiktok song campaigns", [camp(), camp({ id: "c2", title: "Shoes", platforms: ["instagram"], type: "ugc" })]);
    assert.equal(a.campaignIds[0], "c1");
    assert.equal(fallbackAnswer("anything", []).campaignIds.length, 0);
  });
  it("keeps only valid history turns", () => {
    const h = cleanHistory([{ role: "user", content: "hi" }, { role: "system", content: "x" }, { role: "assistant", content: "" }, 5]);
    assert.deepEqual(h, [{ role: "user", content: "hi" }]);
  });
});
