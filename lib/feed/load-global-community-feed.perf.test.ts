import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("global feed performance bounds", () => {
  const src = readFileSync(
    join(process.cwd(), "lib/feed/load-global-community-feed.ts"),
    "utf8",
  );

  it("caps the ranking pool well below the previous 10k fan-out", () => {
    const maxPool = Number(src.match(/const MAX_POOL = ([\d_]+)/)?.[1]?.replace(/_/g, ""));
    const poolPage = Number(src.match(/const POOL_PAGE = ([\d_]+)/)?.[1]?.replace(/_/g, ""));
    const maxRounds = Number(
      src.match(/const MAX_POOL_ROUNDS = ([\d_]+)/)?.[1]?.replace(/_/g, ""),
    );
    assert.ok(Number.isFinite(maxPool) && maxPool <= 2500);
    assert.ok(Number.isFinite(poolPage) && poolPage <= 500);
    assert.ok(Number.isFinite(maxRounds) && maxRounds <= 6);
  });

  it("uses communities!inner for the public pool instead of UUID .in() chunks", () => {
    assert.match(src, /communities!inner/);
    assert.match(src, /fetchPublicRawBatch/);
    assert.doesNotMatch(src, /const MAX_POOL = 10_000/);
  });
});
