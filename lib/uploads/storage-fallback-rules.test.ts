import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMediaPath, validateMediaUpload } from "./storage-fallback-rules.ts";

describe("media storage fallback rules", () => {
  it("accepts images and videos within 50 MB", () => {
    assert.equal(validateMediaUpload({ contentType: "image/png", size: 1024 }), null);
    assert.equal(validateMediaUpload({ contentType: "video/mp4", size: 40 * 1024 * 1024 }), null);
  });
  it("rejects scripts, html, empty and oversized files", () => {
    assert.ok(validateMediaUpload({ contentType: "text/html", size: 10 }));
    assert.ok(validateMediaUpload({ contentType: "image/svg+xml", size: 10 }));
    assert.ok(validateMediaUpload({ contentType: "image/png", size: 0 }));
    assert.ok(validateMediaUpload({ contentType: "image/png", size: 51 * 1024 * 1024 }));
  });
  it("builds paths from server values only", () => {
    assert.equal(buildMediaPath("jimvio/communities", "u1", "image/png", "abc"), "jimvio/communities/u1/abc.png");
    assert.equal(buildMediaPath("../../etc", "u1", "image/jpeg", "x"), "etc/u1/x.jpg");
  });
});
