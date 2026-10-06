import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicSocialProfileUrl } from "./social-profile-url";

describe("publicSocialProfileUrl", () => {
  it("prefers explicit https URLs", () => {
    assert.equal(
      publicSocialProfileUrl({
        platform: "tiktok",
        handle: "x",
        url: "https://www.tiktok.com/@real",
      }),
      "https://www.tiktok.com/@real"
    );
  });

  it("builds platform URLs from handles", () => {
    assert.equal(
      publicSocialProfileUrl({ platform: "instagram", handle: "@p7provider" }),
      "https://www.instagram.com/p7provider/"
    );
    assert.equal(
      publicSocialProfileUrl({ platform: "youtube", handle: "P7Provider" }),
      "https://www.youtube.com/@P7Provider"
    );
    assert.equal(
      publicSocialProfileUrl({ platform: "tiktok", handle: "p7provider" }),
      "https://www.tiktok.com/@p7provider"
    );
  });

  it("returns null when nothing public exists", () => {
    assert.equal(publicSocialProfileUrl({ platform: "tiktok" }), null);
  });
});
