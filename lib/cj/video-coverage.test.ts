import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPlayableVideoUrl,
  productHasPlayableVideo,
  videoCoverageRatio,
} from "./video-coverage";

describe("CJ video coverage", () => {
  it("accepts supplier video files and rejects images", () => {
    assert.equal(isPlayableVideoUrl("https://video-cf.cjdropshipping.com/a.mp4"), true);
    assert.equal(isPlayableVideoUrl("https://cdn.example.com/photo.jpg"), false);
    assert.equal(isPlayableVideoUrl(""), false);
  });

  it("does not treat metadata text as a video", () => {
    assert.equal(
      productHasPlayableVideo({ metadataVideos: ["video", "https://cdn.example.com/a.jpg"] }),
      false,
    );
    assert.equal(
      productHasPlayableVideo({ videoUrls: ["https://cdn.example.com/demo.webm"] }),
      true,
    );
  });

  it("calculates coverage against eligible published products", () => {
    assert.equal(videoCoverageRatio(50, 100), 0.5);
    assert.equal(videoCoverageRatio(1, 0), null);
    assert.equal(videoCoverageRatio(3, 4), 0.75);
  });
});
