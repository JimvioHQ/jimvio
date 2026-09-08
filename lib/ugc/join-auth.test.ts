import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUgcJoinPath,
  loginUrlForReturnPath,
  sanitizeJoinReturnPath,
  ugcCampaignJoinPath,
} from "./join-auth";

const CAMPAIGN_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("ugc join-auth", () => {
  it("builds join path", () => {
    assert.equal(ugcCampaignJoinPath(CAMPAIGN_ID), `/ugc/${CAMPAIGN_ID}/join`);
  });

  it("detects join paths", () => {
    assert.equal(isUgcJoinPath(`/ugc/${CAMPAIGN_ID}/join`), true);
    assert.equal(isUgcJoinPath(`/ugc/${CAMPAIGN_ID}/join?x=1`), true);
    assert.equal(isUgcJoinPath(`/ugc/${CAMPAIGN_ID}`), false);
    assert.equal(isUgcJoinPath(`/ugc/${CAMPAIGN_ID}/dashboard`), false);
  });

  it("rejects open redirects", () => {
    assert.equal(sanitizeJoinReturnPath("https://evil-site.com"), "/ugc");
    assert.equal(sanitizeJoinReturnPath("//evil-site.com"), "/ugc");
    assert.equal(sanitizeJoinReturnPath("/\\evil"), "/ugc");
    assert.equal(
      sanitizeJoinReturnPath(`/ugc/${CAMPAIGN_ID}/join`),
      `/ugc/${CAMPAIGN_ID}/join`,
    );
  });

  it("builds login url with next", () => {
    const url = loginUrlForReturnPath(`/ugc/${CAMPAIGN_ID}/join`);
    assert.equal(url, `/login?next=${encodeURIComponent(`/ugc/${CAMPAIGN_ID}/join`)}`);
    assert.equal(loginUrlForReturnPath("https://evil.com"), `/login?next=${encodeURIComponent("/ugc")}`);
  });
});
