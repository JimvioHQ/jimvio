/**
 * Global feed finalization verifier.
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
config({ path: resolve(root, ".env.local") });

const JIMVIO_EMAIL = "admin@jimvio.com";
const ROTATION_MS = 3 * 60 * 60 * 1000;

function readPostEditorialMeta(attachments) {
  if (!attachments || typeof attachments !== "object") return {};
  const j = attachments.jimvio;
  if (!j || typeof j !== "object") return {};
  return j;
}

function isExcludedFromGlobalFeed(post) {
  const meta = readPostEditorialMeta(post.attachments);
  if (meta.origin === "promotion") return true;
  const username = (post.profiles?.username ?? "").trim().toLowerCase();
  if (username === "jimvio") return true;
  const email = (post.profiles?.email ?? "").trim().toLowerCase();
  if (email === JIMVIO_EMAIL.toLowerCase()) return true;
  const body = (post.body ?? "").trim();
  if (body.startsWith("From Jimvio")) return true;
  return false;
}

function getBucket(now = Date.now()) {
  return Math.floor(now / ROTATION_MS);
}

function encodeCursor(bucket, offset) {
  return `${bucket}:${offset}`;
}

function parseCursor(raw, now = Date.now()) {
  const bucket = getBucket(now);
  if (!raw) return { bucket, offset: 0 };
  const [b, o] = raw.split(":");
  const parsedBucket = Number.parseInt(b ?? "", 10);
  const offset = Number.parseInt(o ?? "", 10);
  if (parsedBucket !== bucket || !Number.isFinite(offset) || offset < 0) {
    return { bucket, offset: 0 };
  }
  return { bucket, offset };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  assert.equal(getBucket(), parseCursor(null).bucket);
  assert.deepEqual(parseCursor("0:5", Date.now()), { bucket: getBucket(), offset: 0 });
  assert.equal(encodeCursor(getBucket(), 20), `${getBucket()}:20`);

  const { data: posts, error } = await db
    .from("community_posts")
    .select(
      "id, body, attachments, community_id, profiles!community_posts_author_id_fkey(username, email), communities(slug, name, is_private)",
    )
    .eq("is_published", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const publicPosts = (posts ?? []).filter((p) => !p.communities?.is_private);
  const excluded = publicPosts.filter((p) => isExcludedFromGlobalFeed(p));
  const eligible = publicPosts.filter((p) => !isExcludedFromGlobalFeed(p));

  const { data: editorialCommunities } = await db
    .from("communities")
    .select("id")
    .eq("is_active", true)
    .contains("settings", { jimvio: { origin: "editorial" } })
    .limit(40);
  const editorialIds = (editorialCommunities ?? []).map((c) => c.id);
  const { data: sampleRooms } = await db
    .from("rooms")
    .select("id, community_id")
    .eq("slug", "discussion")
    .eq("is_active", true)
    .in("community_id", editorialIds.length ? editorialIds : ["00000000-0000-0000-0000-000000000000"])
    .limit(40);
  let empty = 0;
  for (const room of sampleRooms ?? []) {
    const { count } = await db
      .from("community_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .eq("is_deleted", false);
    if ((count ?? 0) === 0) empty += 1;
  }

  console.log(JSON.stringify({
    sampleSize: publicPosts.length,
    excludedJimvio: excluded.length,
    eligible: eligible.length,
    eligibleCommunities: new Set(eligible.map((p) => p.community_id)).size,
    rotationBucket: getBucket(),
    discussionSampleEmpty: empty,
    discussionSampleSize: sampleRooms?.length ?? 0,
  }));

  assert.ok(eligible.length > 100, "expected many eligible public posts");
  assert.ok(excluded.length > 0, "expected Jimvio promo posts to exist in DB but be excludable");
  assert.ok(new Set(eligible.map((p) => p.community_id)).size >= 20, "eligible posts span communities");
  assert.equal(empty, 0, "sampled editorial discussion rooms must have messages");

  console.log("verify-global-feed-final: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
