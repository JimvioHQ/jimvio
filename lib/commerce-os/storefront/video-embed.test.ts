import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveVideoEmbedUrl } from "./video-embed";

describe("resolveVideoEmbedUrl", () => {
  it("rejects empty and non-https", () => {
    assert.equal(resolveVideoEmbedUrl("").ok, false);
    assert.equal(resolveVideoEmbedUrl("http://youtube.com/watch?v=abc").ok, false);
  });

  it("normalizes YouTube watch and youtu.be", () => {
    const a = resolveVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(a.ok, true);
    if (a.ok) {
      assert.equal(a.provider, "youtube");
      assert.match(a.embedUrl, /youtube\.com\/embed\/dQw4w9WgXcQ/);
    }
    const b = resolveVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
    assert.equal(b.ok, true);
    if (b.ok) assert.equal(b.provider, "youtube");
  });

  it("normalizes Vimeo", () => {
    const r = resolveVideoEmbedUrl("https://vimeo.com/123456789");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.provider, "vimeo");
      assert.equal(r.embedUrl, "https://player.vimeo.com/video/123456789");
    }
  });
});
