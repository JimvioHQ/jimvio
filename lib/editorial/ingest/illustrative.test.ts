import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { illustrativeImage, illustrativeTopic } from "./illustrative.ts";

describe("illustrative images", () => {
  it("matches the story topic", () => {
    assert.equal(illustrativeTopic("technology", "Nigerian startup raises $29M Series B"), "Startups");
    assert.equal(illustrativeTopic("business", "TikTok expands creator payouts in Kenya"), "Creator");
    assert.equal(illustrativeTopic("business", "Quarterly results"), "Business");
  });
  it("is licensed, labelled and stable for the same title", () => {
    const a = illustrativeImage("technology", "Voice AI in vogue");
    assert.equal(a.status, "verified");
    assert.match(a.url, /^https:\/\/images\.unsplash\.com\//);
    assert.match(a.caption, /not a picture/);
    assert.equal(illustrativeImage("technology", "Voice AI in vogue").url, a.url);
  });
});
