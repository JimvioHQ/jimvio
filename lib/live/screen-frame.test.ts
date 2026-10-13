import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeVideoFrame, sharedStageLayout } from "./screen-frame.ts";

describe("shared screen orientation", () => {
  it("keeps a portrait phone in portrait proportions", () => {
    const frame = describeVideoFrame(1080, 1920);
    const layout = sharedStageLayout(frame);
    assert.equal(frame.orientation, "portrait");
    assert.equal(layout.aspectRatio, "1080 / 1920");
    assert.equal(layout.objectFit, "contain");
    assert.equal(layout.rotate, false);
  });

  it("keeps a landscape phone and desktop share in landscape proportions", () => {
    const phone = describeVideoFrame(1920, 1080);
    const desktop = describeVideoFrame(1440, 900);
    assert.equal(phone.orientation, "landscape");
    assert.equal(sharedStageLayout(phone).aspectRatio, "1920 / 1080");
    assert.equal(desktop.orientation, "landscape");
    assert.equal(sharedStageLayout(desktop).maxWidth, "100%");
    assert.equal(sharedStageLayout(phone).rotate, false);
  });

  it("does not invent an orientation before the stream reports dimensions", () => {
    const frame = describeVideoFrame(0, 0);
    assert.equal(frame.orientation, "unknown");
    assert.equal(sharedStageLayout(frame).aspectRatio, null);
    assert.equal(sharedStageLayout(frame).rotate, false);
  });
});
