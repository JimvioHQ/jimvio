import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

describe("hub feed engagement row", () => {
  it("shows views/likes/comments and hides share count on the card", () => {
    const src = readFileSync(join(root, "components/feed/FeedPostCard.tsx"), "utf8");
    assert.match(src, /Eye/);
    assert.match(src, /engagement\.views/);
    assert.match(src, /PostShareMenu/);
    // Share icon present, but share count must not render beside it.
    assert.match(src, /Share2/);
    assert.equal(/Share2[\s\S]{0,200}engagement\.shares/.test(src), false);
    assert.match(src, /no share count/i);
  });

  it("wires view tracking into hub articles", () => {
    const src = readFileSync(join(root, "components/feed/FeedPostCard.tsx"), "utf8");
    assert.match(src, /usePostViewTracker/);
  });
});
