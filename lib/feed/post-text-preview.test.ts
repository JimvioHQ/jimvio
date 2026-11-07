import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { previewPostText } from "./post-text-preview.ts";

const LONG = [
  "🚀 YOUR INVESTMENT JOURNEY STARTS HERE",
  "",
  "Every successful journey begins with understanding the process.",
  "",
  "1️⃣ Create Your Account – Get started by setting up your profile.",
  "2️⃣ Verify Your Identity – Complete verification to access services.",
  "3️⃣ Deposit – Fund your wallet using supported methods.",
  "4️⃣ Choose a Plan – Explore Starter, Growth, Prime, and Elite options.",
  "5️⃣ Activate – Confirm your allocation.",
  "6️⃣ Track – Monitor activity through your dashboard.",
  "Visit https://example.com/learn for details #learning",
].join("\n");

describe("post text preview (View more)", () => {
  it("short posts are shown in full with no toggle", () => {
    const r = previewPostText("Hello community #jimvio");
    assert.equal(r.truncated, false);
    assert.equal(r.text, "Hello community #jimvio");
  });

  it("long posts are cut to a readable preview", () => {
    const r = previewPostText(LONG);
    assert.equal(r.truncated, true);
    assert.ok(r.text.length <= 320);
    assert.ok(r.text.split("\n").length <= 8);
    assert.ok(LONG.startsWith(r.text), "preview is a prefix of the original");
  });

  it("keeps paragraph breaks in the preview", () => {
    const r = previewPostText(LONG);
    assert.ok(r.text.includes("\n\n"));
  });

  it("never leaves a half URL or hashtag at the cut", () => {
    const text = `${"word ".repeat(60)}https://example.com/a/very/long/path #tagname more`;
    const r = previewPostText(text, { maxChars: 320 });
    assert.equal(r.truncated, true);
    assert.ok(!/https?:\/\/\S*$/.test(r.text));
    assert.ok(!/#\S*$/.test(r.text));
  });

  it("feed and community post cards render bodies as collapsible", () => {
    for (const file of [
      "components/feed/FeedPostCard.tsx",
      "components/community/workspace/sections/Feed.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      assert.match(src, /<PostRichText[\s\S]{0,80}collapsible/, file);
    }
    const rich = readFileSync("components/feed/PostRichText.tsx", "utf8");
    assert.match(rich, /View more/);
    assert.match(rich, /Show less/);
    assert.match(rich, /aria-expanded/);
  });
});

describe("create post → feed redirect", () => {
  it("publishing always lands on the Communities Feed with the new post id", () => {
    const page = readFileSync("app/create/post/page.tsx", "utf8");
    assert.match(page, /router\.push\(\s*result\.postId \? `\/communities\?post=/);
    assert.doesNotMatch(page, /\/feed\$\{qs\}/);
  });

  it("composer stashes the saved post only after a successful response and guards double submit", () => {
    const src = readFileSync("components/feed/PostComposer.tsx", "utf8");
    const okIdx = src.indexOf("if (!res.ok)");
    const stashIdx = src.indexOf("stashSessionBoostPost(created.post)");
    assert.ok(okIdx > 0 && stashIdx > okIdx, "stash happens after the ok check");
    assert.match(src, /if \(submittingRef\.current\) return;/);
  });

  it("feed prepends the stashed post once (no duplicate) on first render", () => {
    const src = readFileSync("components/feed/FeedPostCard.tsx", "utf8");
    assert.match(src, /consumeSessionBoostPost<ApiPost>\(\)/);
    assert.match(src, /prependUniqueById\(prev, boost\)/);
  });
});
