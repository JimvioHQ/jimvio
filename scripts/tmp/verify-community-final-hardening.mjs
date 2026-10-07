/**
 * Final Communities production hardening verifier.
 *
 * Usage: node scripts/verify-community-final-hardening.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = here.endsWith(`${sep}tmp`) || here.endsWith("/tmp")
  ? resolve(here, "../..")
  : resolve(here, "..");
config({ path: resolve(root, ".env.local") });

const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const JIMVIO_EMAIL = "admin@jimvio.com";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const report = {
    editorialCommunities: 0,
    membershipMismatches: [],
    spaceMismatches: [],
    overCap: [],
    multiOwners: [],
    missingOwnerMembership: [],
    jimvioOwnedEditorial: [],
    unlabeledJimvioPosts: 0,
    googleapisVideos: 0,
    orphanPosts: 0,
    brokenAuthors: 0,
    duplicateActiveMemberships: 0,
    activeStories: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    posts: 0,
    memberships: 0,
  };

  const ownerMap = new Map();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("communities")
      .select("id, slug, member_count, owner_id, settings")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + 99);
    if (error) throw error;
    if (!data?.length) break;

    for (const c of data) {
      if (PRESERVED.has(c.slug)) continue;
      if (c.settings?.jimvio?.origin !== "editorial") continue;
      report.editorialCommunities += 1;
      if ((c.member_count ?? 0) > 2000) report.overCap.push(c.slug);
      if ((c.member_count ?? 0) < 0) report.overCap.push(`negative:${c.slug}`);

      const { count: actual } = await db
        .from("community_memberships")
        .select("id", { count: "exact", head: true })
        .eq("community_id", c.id)
        .eq("status", "active");
      if ((actual ?? 0) !== (c.member_count ?? 0)) {
        report.membershipMismatches.push({
          slug: c.slug,
          display: c.member_count,
          actual,
        });
      }

      if (c.owner_id) {
        ownerMap.set(c.owner_id, (ownerMap.get(c.owner_id) ?? 0) + 1);
        const { data: ownerMem } = await db
          .from("community_memberships")
          .select("id, role")
          .eq("community_id", c.id)
          .eq("user_id", c.owner_id)
          .eq("status", "active")
          .maybeSingle();
        if (!ownerMem) report.missingOwnerMembership.push(c.slug);

        const { data: ownerProf } = await db
          .from("profiles")
          .select("email")
          .eq("id", c.owner_id)
          .maybeSingle();
        if (ownerProf?.email === JIMVIO_EMAIL) {
          report.jimvioOwnedEditorial.push(c.slug);
        }
      }

      const { data: spaces } = await db
        .from("spaces")
        .select("id, name, access_type, member_count")
        .eq("community_id", c.id)
        .eq("is_active", true);
      for (const space of spaces ?? []) {
        const access = (space.access_type || "free").toLowerCase();
        if (access === "free" || access === "inherit") {
          if ((space.member_count ?? 0) !== (actual ?? 0)) {
            report.spaceMismatches.push({
              community: c.slug,
              space: space.name,
              display: space.member_count,
              expected: actual,
            });
          }
        }
      }
    }

    if (data.length < 100) break;
    from += 100;
  }

  report.multiOwners = [...ownerMap.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({ owner_id: id, communities: n }));

  const { data: jimvioProfile } = await db
    .from("profiles")
    .select("id")
    .eq("email", JIMVIO_EMAIL)
    .maybeSingle();
  if (jimvioProfile?.id) {
    const { data: jimvioPosts } = await db
      .from("community_posts")
      .select("id, title, body, community_id, communities!inner(slug, settings)")
      .eq("author_id", jimvioProfile.id)
      .eq("is_published", true)
      .limit(1000);
    for (const post of jimvioPosts ?? []) {
      const community = Array.isArray(post.communities)
        ? post.communities[0]
        : post.communities;
      if (PRESERVED.has(community?.slug)) continue;
      if (community?.settings?.jimvio?.origin !== "editorial") continue;
      const labeled =
        String(post.title ?? "").toLowerCase().startsWith("from jimvio") ||
        String(post.body ?? "").toLowerCase().startsWith("from jimvio");
      if (!labeled) report.unlabeledJimvioPosts += 1;
    }
  }

  const { count: googleapisVideos } = await db
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .like("video_url", "%googleapis%");
  report.googleapisVideos = googleapisVideos ?? 0;

  const { count: posts } = await db
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  report.posts = posts ?? 0;

  const { count: comments } = await db
    .from("community_post_comments")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  report.comments = comments ?? 0;

  const { count: likes } = await db
    .from("community_post_likes")
    .select("id", { count: "exact", head: true });
  report.likes = likes ?? 0;

  const { count: shares } = await db
    .from("community_post_shares")
    .select("id", { count: "exact", head: true });
  report.shares = shares ?? 0;

  const { count: stories } = await db
    .from("community_stories")
    .select("id", { count: "exact", head: true })
    .gt("expires_at", new Date().toISOString());
  report.activeStories = stories ?? 0;

  const { count: memberships } = await db
    .from("community_memberships")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  report.memberships = memberships ?? 0;

  // Spot-check media hosts for recent photo posts
  const { data: mediaPosts } = await db
    .from("community_posts")
    .select("images, video_url")
    .eq("is_published", true)
    .not("images", "is", null)
    .limit(40);
  let brokenMediaHosts = 0;
  for (const p of mediaPosts ?? []) {
    const images = Array.isArray(p.images) ? p.images : [];
    for (const img of images) {
      try {
        const host = new URL(String(img)).host;
        if (!/unsplash|cloudinary|jimvio|supabase/i.test(host)) brokenMediaHosts += 1;
      } catch {
        brokenMediaHosts += 1;
      }
    }
  }

  // Static contract: access helper + like route
  const likeRoute = fs.readFileSync(
    resolve(root, "app/api/posts/[postId]/like/route.ts"),
    "utf8"
  );
  assert.match(likeRoute, /canEngageWithCommunityPost/);
  const access = fs.readFileSync(resolve(root, "services/accessControl.ts"), "utf8");
  assert.match(access, /canEngageWithRoom/);
  assert.doesNotMatch(
    fs.readFileSync(resolve(root, "lib/community/editorial-world-build.ts"), "utf8"),
    /googleapis\.com\/gtv-videos-bucket/
  );

  report.ok =
    report.editorialCommunities >= 200 &&
    report.membershipMismatches.length === 0 &&
    report.spaceMismatches.length === 0 &&
    report.overCap.length === 0 &&
    report.multiOwners.length === 0 &&
    report.missingOwnerMembership.length === 0 &&
    report.jimvioOwnedEditorial.length === 0 &&
    report.unlabeledJimvioPosts === 0 &&
    report.googleapisVideos === 0 &&
    brokenMediaHosts === 0;

  console.log(
    JSON.stringify(
      {
        ...report,
        membershipMismatchCount: report.membershipMismatches.length,
        spaceMismatchCount: report.spaceMismatches.length,
        multiOwnerCount: report.multiOwners.length,
        jimvioOwnedCount: report.jimvioOwnedEditorial.length,
        brokenMediaHosts,
        sampleMembershipMismatch: report.membershipMismatches.slice(0, 5),
        sampleSpaceMismatch: report.spaceMismatches.slice(0, 5),
      },
      null,
      2
    )
  );

  if (!report.ok) process.exit(2);
  console.log("verify-community-final-hardening: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
