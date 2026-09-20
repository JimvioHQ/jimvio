import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUserVisibleLiveDestination,
  USER_VISIBLE_LIVE_DESTINATIONS,
} from "./capabilities.ts";

describe("user-visible live destinations", () => {
  it("exposes Jimvio, YouTube, Twitch, TikTok in order", () => {
    assert.deepEqual([...USER_VISIBLE_LIVE_DESTINATIONS], [
      "jimvio",
      "youtube",
      "twitch",
      "tiktok",
    ]);
  });

  it("hides Facebook and Instagram from the user-facing list", () => {
    assert.equal(isUserVisibleLiveDestination("facebook"), false);
    assert.equal(isUserVisibleLiveDestination("instagram"), false);
    assert.equal(isUserVisibleLiveDestination("youtube"), true);
    assert.equal(isUserVisibleLiveDestination("twitch"), true);
    assert.equal(isUserVisibleLiveDestination("tiktok"), true);
    assert.equal(isUserVisibleLiveDestination("jimvio"), true);
  });

  it("does not treat custom_rtmp as a primary catalog destination", () => {
    assert.equal(isUserVisibleLiveDestination("custom_rtmp"), false);
  });
});
