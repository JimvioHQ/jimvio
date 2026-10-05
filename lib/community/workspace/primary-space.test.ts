import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSpaceAvatarSrc } from "./primary-space.ts";

describe("resolveSpaceAvatarSrc", () => {
  it("prefers space cover over community images", () => {
    assert.equal(
      resolveSpaceAvatarSrc(
        { cover_url: "https://cdn.example/space.jpg", banner_url: null, icon: null },
        "https://cdn.example/community-logo.jpg",
        "https://cdn.example/community-cover.jpg"
      ),
      "https://cdn.example/space.jpg"
    );
  });

  it("falls back to community logo then cover", () => {
    assert.equal(
      resolveSpaceAvatarSrc(
        { cover_url: null, banner_url: null, icon: null },
        "https://cdn.example/community-logo.jpg",
        "https://cdn.example/community-cover.jpg"
      ),
      "https://cdn.example/community-logo.jpg"
    );
    assert.equal(
      resolveSpaceAvatarSrc(
        { cover_url: "", banner_url: null, icon: null },
        null,
        "https://cdn.example/community-cover.jpg"
      ),
      "https://cdn.example/community-cover.jpg"
    );
  });

  it("uses https space icon before community fallback", () => {
    assert.equal(
      resolveSpaceAvatarSrc(
        {
          cover_url: null,
          banner_url: null,
          icon: "https://cdn.example/icon.png",
        },
        "https://cdn.example/community-logo.jpg",
        null
      ),
      "https://cdn.example/icon.png"
    );
  });

  it("returns null when no images exist (letter fallback at UI)", () => {
    assert.equal(
      resolveSpaceAvatarSrc(
        { cover_url: null, banner_url: null, icon: "🔥" },
        null,
        null
      ),
      null
    );
  });
});
