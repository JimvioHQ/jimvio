import assert from "node:assert/strict";
import test from "node:test";
import {
  isGuestVisibleCommunity,
  isGuestVisibleSpace,
  mergeSearchCommunities,
  selectGuestRepresentativeSpaces,
  sliceCommunityPage,
  type GuestSpaceCandidate,
} from "./hub-spaces-page";

function guestSpace(
  communityId: string,
  id: string,
  sortOrder: number,
  extras?: Partial<GuestSpaceCandidate>,
): GuestSpaceCandidate {
  return {
    id,
    community_id: communityId,
    sort_order: sortOrder,
    access_type: "free",
    privacy: "public",
    ...extras,
  };
}

function groupByCommunity(rows: readonly GuestSpaceCandidate[]) {
  const grouped = new Map<string, GuestSpaceCandidate[]>();
  for (const row of rows) {
    const list = grouped.get(row.community_id) ?? [];
    list.push(row);
    grouped.set(row.community_id, list);
  }
  return grouped;
}

test("a global sort_order window cannot drop another public community", () => {
  const crowded = Array.from({ length: 120 }, (_, index) =>
    guestSpace("community-a", `a-${index}`, index),
  );
  const sparse = guestSpace("community-b", "b-public", 10_000);
  const globalWindow = [...crowded, sparse]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, 120);
  const dropped = selectGuestRepresentativeSpaces(
    ["community-a", "community-b"],
    groupByCommunity(globalWindow),
  );
  assert.deepEqual(
    dropped.map((row) => row.community_id),
    ["community-a"],
  );

  const kept = selectGuestRepresentativeSpaces(
    ["community-a", "community-b"],
    new Map([
      ["community-a", crowded],
      ["community-b", [sparse]],
    ]),
  );
  assert.deepEqual(
    kept.map((row) => row.id),
    ["a-0", "b-public"],
  );
});

test("private and paid rows do not take another community's slot or become the card", () => {
  const privateRows = Array.from({ length: 120 }, (_, index) =>
    guestSpace("community-a", `a-private-${index}`, index, {
      access_type: index % 2 === 0 ? "private" : "paid",
      privacy: index % 2 === 0 ? "private" : "public",
    }),
  );
  const publicA = guestSpace("community-a", "a-public", 5_000, { access_type: "free" });
  const publicB = guestSpace("community-b", "b-public", 6_000);
  const globalWindow = [...privateRows, publicA, publicB]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, 120);
  const fromWindow = selectGuestRepresentativeSpaces(
    ["community-a", "community-b"],
    groupByCommunity(globalWindow),
  );
  assert.deepEqual(fromWindow, []);

  const kept = selectGuestRepresentativeSpaces(
    ["community-a", "community-b"],
    new Map([
      ["community-a", [...privateRows, publicA]],
      ["community-b", [publicB]],
    ]),
  );
  assert.deepEqual(
    kept.map((row) => row.id),
    ["a-public", "b-public"],
  );
});

test("the lowest public sort_order is kept when earlier rows are restricted", () => {
  const rows = [
    guestSpace("community-a", "private-space", 1, { access_type: "Private", privacy: "PUBLIC" }),
    guestSpace("community-a", "paid-space", 2, { access_type: "paid" }),
    guestSpace("community-a", "invite-space", 3, { access_type: "invite" }),
    guestSpace("community-a", "premium-space", 4, { access_type: "premium" }),
    guestSpace("community-a", "members-space", 5, { access_type: "members" }),
    guestSpace("community-a", "privacy-space", 6, { privacy: "Private" }),
    guestSpace("community-a", "public-space", 9, { access_type: "free", privacy: "public" }),
    guestSpace("community-a", "later-public", 12),
  ];
  const picked = selectGuestRepresentativeSpaces(["community-a"], groupByCommunity(rows));
  assert.equal(picked.length, 1);
  assert.equal(picked[0]?.id, "public-space");
});

test("guest visibility keeps the previous public and private boundaries", () => {
  assert.equal(isGuestVisibleSpace({ access_type: null, privacy: null }), true);
  assert.equal(isGuestVisibleSpace({ access_type: "public", privacy: "public" }), true);
  assert.equal(isGuestVisibleSpace({ access_type: "open", privacy: "unlisted" }), true);
  assert.equal(isGuestVisibleSpace({ access_type: "MEMBERS", privacy: "public" }), false);
  assert.equal(isGuestVisibleCommunity({ is_private: true, slug: "secret" }), false);
  assert.equal(isGuestVisibleCommunity({ is_private: false, slug: "open" }), true);
  assert.equal(isGuestVisibleCommunity({ is_private: null, slug: "open" }), true);
  assert.equal(isGuestVisibleCommunity({ is_private: false, slug: "" }), false);

  const onlyPrivate = selectGuestRepresentativeSpaces(
    ["private-community", "empty-community"],
    new Map([["private-community", [guestSpace("private-community", "hidden", 1, { privacy: "private" })]]]),
  );
  assert.deepEqual(onlyPrivate, []);
});

test("guest search pages the merged public matches without overlap", () => {
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
  assert.equal(page0.total, 4);
  assert.equal(page0.nextOffset, 2);

  const page1 = sliceCommunityPage(merged, page0.nextOffset ?? 0, pageSize);
  assert.deepEqual(
    page1.page.map((community) => community.id),
    ["d", "c"],
  );
  assert.equal(page1.nextOffset, null);
  const seen = new Set([...page0.page, ...page1.page].map((community) => community.id));
  assert.equal(seen.size, 4);

  const representatives = selectGuestRepresentativeSpaces(
    page1.page.map((community) => community.id),
    new Map([
      ["d", [guestSpace("d", "d-private", 1, { access_type: "paid" }), guestSpace("d", "d-public", 8)]],
      ["c", [guestSpace("c", "c-public", 3)]],
    ]),
  );
  assert.deepEqual(
    representatives.map((row) => row.id),
    ["d-public", "c-public"],
  );
});

test("a capped guest search set does not paginate past the loaded communities", () => {
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

test("a null sort_order does not beat a numbered public space", () => {
  const picked = selectGuestRepresentativeSpaces(
    ["community-a"],
    new Map([
      [
        "community-a",
        [
          guestSpace("community-a", "unsorted", 0, { sort_order: null }),
          guestSpace("community-a", "numbered", 4),
        ],
      ],
    ]),
  );
  assert.equal(picked[0]?.id, "numbered");
});
