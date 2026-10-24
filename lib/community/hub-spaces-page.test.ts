import assert from "node:assert/strict";
import test from "node:test";
import { pickPrimarySpaceCandidate } from "./workspace/primary-space";
import {
  HUB_SPACES_PER_COMMUNITY_LIMIT,
  applySpacesPage,
  mergeSearchCommunities,
  selectPrimarySpacesPerCommunity,
  sliceCommunityPage,
  spacesWithinPerCommunityCap,
  type CommunitySpaceCandidate,
} from "./hub-spaces-page";

function space(
  communityId: string,
  id: string,
  sortOrder: number,
  extras?: Partial<CommunitySpaceCandidate>,
): CommunitySpaceCandidate {
  return {
    id,
    name: id,
    slug: id,
    community_id: communityId,
    sort_order: sortOrder,
    is_featured: false,
    ...extras,
  };
}

test("each community keeps a space when counts are uneven", () => {
  const crowded = Array.from({ length: 40 }, (_, index) =>
    space("community-a", `a-${index}`, index),
  );
  const sparse = space("community-b", "b-signals", 10_000, {
    name: "Signals",
    slug: "signals",
  });
  const single = space("community-d", "d-only", 50, { name: "Only", slug: "only" });

  const globalLimit = Math.max(2 * 12, 12);
  const truncated = [...crowded, sparse]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, globalLimit);
  const truncatedGroups = new Map<string, CommunitySpaceCandidate[]>();
  for (const row of truncated) {
    const list = truncatedGroups.get(row.community_id) ?? [];
    list.push(row);
    truncatedGroups.set(row.community_id, list);
  }
  const dropped = selectPrimarySpacesPerCommunity(
    ["community-a", "community-b"],
    truncatedGroups,
  );
  assert.deepEqual(
    dropped.map((row) => row.community_id),
    ["community-a"],
  );

  const perCommunity = new Map<string, CommunitySpaceCandidate[]>([
    ["community-a", crowded],
    ["community-b", [sparse]],
    ["community-c", []],
    ["community-d", [single]],
  ]);
  const kept = selectPrimarySpacesPerCommunity(
    ["community-a", "community-b", "community-c", "community-d"],
    perCommunity,
  );
  assert.deepEqual(
    kept.map((row) => row.id),
    ["a-0", "b-signals", "d-only"],
  );
});

test("the per-community cap still includes a featured space with a high sort order", () => {
  const filler = Array.from({ length: 100 }, (_, index) =>
    space("community-a", `filler-${index}`, index, {
      slug: index === 0 ? "general" : `room-${index}`,
      name: index === 0 ? "General" : `Room ${index}`,
    }),
  );
  const featured = space("community-a", "featured", 9_999, {
    name: "Quant Signals",
    slug: "quant-signals",
    is_featured: true,
  });
  const capped = spacesWithinPerCommunityCap(
    [...filler, featured],
    HUB_SPACES_PER_COMMUNITY_LIMIT,
  );
  assert.equal(pickPrimarySpaceCandidate(capped)?.id, "featured");

  const sortOrderOnly = [...filler, featured]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, HUB_SPACES_PER_COMMUNITY_LIMIT);
  assert.notEqual(pickPrimarySpaceCandidate(sortOrderOnly)?.id, "featured");
});

test("search pages the merged name and space matches without overlap", () => {
  const nameMatches = [
    { id: "c", name: "Gamma" },
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
  ];
  const spaceMatches = [
    { id: "b", name: "Beta" },
    { id: "d", name: "Delta" },
  ];
  const merged = mergeSearchCommunities(nameMatches, spaceMatches);
  assert.deepEqual(
    merged.map((community) => community.id),
    ["a", "b", "d", "c"],
  );

  const pageSize = 2;
  const page0 = sliceCommunityPage(merged, 0, pageSize);
  assert.equal(page0.page.length, pageSize);
  assert.ok(page0.page.length < merged.length);
  assert.deepEqual(
    page0.page.map((community) => community.id),
    ["a", "b"],
  );
  assert.equal(page0.total, merged.length);
  assert.equal(page0.nextOffset, pageSize);

  const page1 = sliceCommunityPage(merged, page0.nextOffset ?? 0, pageSize);
  assert.deepEqual(
    page1.page.map((community) => community.id),
    ["d", "c"],
  );
  assert.equal(page1.total, 4);
  assert.equal(page1.nextOffset, null);

  const seen = new Set([...page0.page, ...page1.page].map((community) => community.id));
  assert.equal(seen.size, 4);
});

test("a capped search set does not paginate past the communities that were loaded", () => {
  const merged = Array.from({ length: 5 }, (_, index) => ({
    id: `c-${index}`,
    name: `Community ${index}`,
  }));
  const last = sliceCommunityPage(merged, 4, 2);
  assert.equal(last.page.length, 1);
  assert.equal(last.total, 5);
  assert.equal(last.nextOffset, null);

  const pastEnd = sliceCommunityPage(merged, 5, 2);
  assert.deepEqual(pastEnd.page, []);
  assert.equal(pastEnd.total, 5);
  assert.equal(pastEnd.nextOffset, null);
});

test("equal community names stay ordered by id", () => {
  const merged = mergeSearchCommunities(
    [
      { id: "b", name: "Same" },
      { id: "a", name: "Same" },
    ],
    [],
  );
  assert.deepEqual(
    merged.map((community) => community.id),
    ["a", "b"],
  );
});

test("a stale or aborted load-more does not append", () => {
  const previous = [{ id: "s1", community_id: "c1", community_slug: "alpha" }];
  const incoming = [{ id: "s2", community_id: "c2", community_slug: "beta" }];
  const base = {
    append: true,
    previous,
    incoming,
    nextOffset: 30,
    total: 50,
    requestGeneration: 1,
    currentGeneration: 1,
    requestQuery: "old",
    currentQuery: "old",
    aborted: false,
  };

  const staleQuery = applySpacesPage({ ...base, currentQuery: "new" });
  assert.equal(staleQuery.apply, false);

  const staleGeneration = applySpacesPage({ ...base, currentGeneration: 2 });
  assert.equal(staleGeneration.apply, false);

  const aborted = applySpacesPage({ ...base, aborted: true });
  assert.equal(aborted.apply, false);

  const applied = applySpacesPage(base);
  assert.equal(applied.apply, true);
  if (applied.apply) {
    assert.deepEqual(
      applied.spaces.map((row) => row.id),
      ["s1", "s2"],
    );
    assert.equal(applied.nextOffset, 30);
    assert.equal(applied.total, 50);
  }
});

test("a current search replaces the list and drops a repeated community", () => {
  const previous = [{ id: "s1", community_id: "c1", community_slug: "alpha" }];
  const incoming = [
    { id: "s9", community_id: "c1", community_slug: "alpha" },
    { id: "s2", community_id: "c2", community_slug: "beta" },
  ];
  const replaced = applySpacesPage({
    aborted: false,
    requestQuery: "signals",
    currentQuery: "signals",
    requestGeneration: 4,
    currentGeneration: 4,
    append: false,
    previous,
    incoming,
    nextOffset: null,
    total: 2,
  });
  assert.equal(replaced.apply, true);
  if (replaced.apply) {
    assert.deepEqual(
      replaced.spaces.map((row) => row.id),
      ["s9", "s2"],
    );
  }

  const appended = applySpacesPage({
    aborted: false,
    requestQuery: "signals",
    currentQuery: "signals",
    requestGeneration: 4,
    currentGeneration: 4,
    append: true,
    previous,
    incoming,
    nextOffset: 30,
    total: 3,
  });
  assert.equal(appended.apply, true);
  if (appended.apply) {
    assert.deepEqual(
      appended.spaces.map((row) => row.id),
      ["s1", "s2"],
    );
  }
});
