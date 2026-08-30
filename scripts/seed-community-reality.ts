/**
 * Membership-reality seeder for editorial communities.
 *
 * - Unique owner per editorial community (not Jimvio)
 * - Real community_memberships rows matching displayed member_count (capped by pool)
 * - Space member_count synced from community members
 * - Real like / share ledger rows for seeded engagement
 * - Public stories from community members
 *
 * Idempotent. Never touches forex-hub / gcs-unity.
 *
 * Usage: npx tsx scripts/seed-community-reality.ts
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EXPANDED_REALITY_PERSONAS } from "../lib/community/editorial-expanded-personas";
import {
  ALL_EDITORIAL_PERSONAS,
  editorialPersonaEmail,
  type EditorialPersonaSpec,
} from "../lib/community/editorial-personas";
import { communityEditorialSettings } from "../lib/community/editorial-origin";

config({ path: ".env.local" });

const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const BATCH = 200;
const STORY_MEDIA = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1080&h=1920&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1080&h=1920&q=80",
];

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return { url, key };
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickUnique<T>(pool: T[], count: number, salt: string): T[] {
  if (count <= 0) return [];
  if (count >= pool.length) return pool.slice();
  const scored = pool.map((item, idx) => ({
    item,
    score: hash(`${salt}:${idx}`),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, count).map((s) => s.item);
}

async function ensurePersonas(
  db: SupabaseClient,
  specs: EditorialPersonaSpec[]
): Promise<{ id: string; key: string; email: string }[]> {
  const rows: { id: string; key: string; email: string }[] = [];
  const CONCURRENCY = 4;
  let next = 0;

  async function one(persona: EditorialPersonaSpec) {
    const email = editorialPersonaEmail(persona.key);
    const { data: existing } = await db
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing?.id) {
      await db
        .from("profiles")
        .update({
          full_name: persona.fullName,
          username: persona.username,
          avatar_url: persona.avatarUrl,
          bio: persona.bio,
        })
        .eq("id", existing.id);
      return { id: existing.id, key: persona.key, email };
    }
    const password = `Jv!${randomBytes(18).toString("base64url")}`;
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: persona.fullName,
        username: persona.username,
        avatar_url: persona.avatarUrl,
      },
      app_metadata: {
        jimvio_editorial: true,
        editorial_persona: persona.key,
      },
    });
    if (error || !created.user?.id) {
      const { data: again } = await db
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!again?.id) {
        console.warn(`persona skip ${persona.key}: ${error?.message}`);
        return null;
      }
      return { id: again.id, key: persona.key, email };
    }
    await db
      .from("profiles")
      .update({
        full_name: persona.fullName,
        username: persona.username,
        avatar_url: persona.avatarUrl,
        bio: persona.bio,
        email,
      })
      .eq("id", created.user.id);
    return { id: created.user.id, key: persona.key, email };
  }

  async function worker() {
    while (next < specs.length) {
      const i = next++;
      const row = await one(specs[i]!);
      if (row) {
        rows.push(row);
        if (rows.length % 40 === 0) console.log(`… personas ${rows.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return rows;
}

async function insertMemberships(
  db: SupabaseClient,
  communityId: string,
  ownerId: string,
  memberIds: string[]
) {
  const unique = [...new Set([ownerId, ...memberIds])];
  for (let i = 0; i < unique.length; i += BATCH) {
    const chunk = unique.slice(i, i + BATCH);
    const { data: existing } = await db
      .from("community_memberships")
      .select("user_id")
      .eq("community_id", communityId)
      .in("user_id", chunk);
    const have = new Set((existing ?? []).map((m) => m.user_id));
    const rows = chunk
      .filter((id) => !have.has(id))
      .map((user_id) => ({
        community_id: communityId,
        user_id,
        role: user_id === ownerId ? "owner" : "member",
        plan_type: "lifetime",
        status: "active",
      }));
    if (rows.length) {
      const { error } = await db.from("community_memberships").insert(rows);
      if (error) throw new Error(`memberships: ${error.message}`);
    }
  }
}

async function syncLikes(
  db: SupabaseClient,
  postId: string,
  likeCount: number,
  memberIds: string[],
  salt: string
) {
  const target = Math.min(likeCount, memberIds.length);
  if (target <= 0) {
    await db.from("community_posts").update({ like_count: 0 }).eq("id", postId);
    return;
  }
  const likers = pickUnique(memberIds, target, `like:${salt}`);
  for (let i = 0; i < likers.length; i += BATCH) {
    const chunk = likers.slice(i, i + BATCH);
    const rows = chunk.map((user_id) => ({ post_id: postId, user_id }));
    const { error } = await db
      .from("community_post_likes")
      .upsert(rows, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    if (error && !/duplicate|unique/i.test(error.message)) {
      // Some schemas use different unique names — fall back to insert ignore.
      await db.from("community_post_likes").insert(rows).select("id");
    }
  }
  const { count } = await db
    .from("community_post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  await db
    .from("community_posts")
    .update({ like_count: count ?? target })
    .eq("id", postId);
}

async function syncShares(
  db: SupabaseClient,
  postId: string,
  shareCount: number,
  memberIds: string[],
  salt: string
) {
  const target = Math.min(Math.max(0, shareCount), Math.min(40, memberIds.length));
  if (target <= 0) {
    await db.from("community_posts").update({ share_count: 0 }).eq("id", postId);
    return;
  }
  const sharers = pickUnique(memberIds, target, `share:${salt}`);
  const { count: existing } = await db
    .from("community_post_shares")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  const need = Math.max(0, target - (existing ?? 0));
  if (need > 0) {
    const rows = sharers.slice(0, need).map((user_id) => ({
      post_id: postId,
      user_id,
      share_type: "link",
    }));
    await db.from("community_post_shares").insert(rows);
  }
  const { count } = await db
    .from("community_post_shares")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  await db
    .from("community_posts")
    .update({ share_count: count ?? target })
    .eq("id", postId);
}

async function seedStories(
  db: SupabaseClient,
  communityId: string,
  slug: string,
  memberIds: string[]
) {
  const authors = pickUnique(memberIds, Math.min(4, memberIds.length), `story:${slug}`);
  for (let i = 0; i < authors.length; i++) {
    const authorId = authors[i]!;
    const media = STORY_MEDIA[hash(`${slug}:story:${i}`) % STORY_MEDIA.length]!;
    const { data: existing } = await db
      .from("community_stories")
      .select("id")
      .eq("community_id", communityId)
      .eq("author_id", authorId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (existing?.id) continue;
    const expires = new Date(Date.now() + (36 + (i % 10)) * 3600_000).toISOString();
    await db.from("community_stories").insert({
      author_id: authorId,
      community_id: communityId,
      media_url: media,
      media_type: "photo",
      caption: null,
      thumbnail_url: media,
      privacy: "public",
      expires_at: expires,
    });
  }
}

async function main() {
  const { url, key } = requireEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });

  const personaSpecs = [
    ...ALL_EDITORIAL_PERSONAS,
    ...EXPANDED_REALITY_PERSONAS.filter(
      (p) => !ALL_EDITORIAL_PERSONAS.some((e) => e.key === p.key)
    ),
  ];
  console.log(`Persona specs: ${personaSpecs.length}`);
  const personas = await ensurePersonas(db, personaSpecs);
  console.log(`Personas ready: ${personas.length}`);
  if (personas.length < 100) throw new Error("Persona pool too small");

  const poolIds = personas.map((p) => p.id);
  // Cap so membership sync stays production-safe while every displayed member is real.
  const maxMembers = Math.min(280, poolIds.length);

  // Load editorial communities
  const editorial: { id: string; slug: string; member_count: number; settings: unknown; owner_id: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("communities")
      .select("id, slug, member_count, settings, owner_id")
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (PRESERVED.has(row.slug)) continue;
      const jimvio = (row.settings as { jimvio?: { origin?: string } } | null)?.jimvio;
      if (jimvio?.origin === "editorial") editorial.push(row);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Editorial communities: ${editorial.length}`);
  if (editorial.length < 200) {
    console.warn("Fewer than 200 editorial communities — continuing with available set");
  }

  // Unique owners: first N personas map 1:1 to communities
  const ownerPool = personas.slice();
  if (ownerPool.length < editorial.length) {
    throw new Error(
      `Need ≥${editorial.length} personas for unique owners; have ${ownerPool.length}`
    );
  }

  let done = 0;
  const CONCURRENCY = 3;
  let nextCommunity = 0;

  async function processOne(community: (typeof editorial)[number], ownerIndex: number) {
    const owner = ownerPool[ownerIndex]!;
    const targetRaw =
      typeof community.member_count === "number" && community.member_count > 0
        ? community.member_count
        : 120 + (hash(community.slug) % 160);
    // Remap any prior inflated display counts into a real, pool-backed range.
    const target = Math.min(
      maxMembers,
      Math.max(40, ((targetRaw - 1) % (maxMembers - 39)) + 40)
    );

    await db
      .from("communities")
      .update({
        owner_id: owner.id,
        member_count: target,
        settings: communityEditorialSettings(community.settings, {
          targetMemberCount: target,
        }),
      })
      .eq("id", community.id);

    const members = pickUnique(
      poolIds.filter((id) => id !== owner.id),
      target - 1,
      `mem:${community.slug}`
    );
    await insertMemberships(db, community.id, owner.id, members);

    const { count: actual } = await db
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("status", "active");
    const memberCount = actual ?? target;
    await db
      .from("communities")
      .update({ member_count: memberCount })
      .eq("id", community.id);

    const { data: spaces } = await db
      .from("spaces")
      .select("id")
      .eq("community_id", community.id)
      .eq("is_active", true);
    for (let s = 0; s < (spaces ?? []).length; s++) {
      const space = spaces![s]!;
      const spaceMembers = Math.max(
        8,
        Math.min(
          memberCount,
          Math.floor(memberCount * (0.35 + (hash(`${community.slug}:sp:${s}`) % 50) / 100))
        )
      );
      await db.from("spaces").update({ member_count: spaceMembers }).eq("id", space.id);
    }

    const { data: posts } = await db
      .from("community_posts")
      .select("id, like_count, share_count, attachments")
      .eq("community_id", community.id)
      .eq("is_published", true)
      .order("like_count", { ascending: false })
      .limit(4);
    const memberList = [owner.id, ...members];
    for (const post of posts ?? []) {
      const likes = Math.min(
        24,
        memberList.length,
        Math.max(3, post.like_count ?? 8 + (hash(`${post.id}:lk`) % 20))
      );
      const shares = Math.min(
        10,
        Math.max(1, post.share_count ?? 2 + (hash(`${post.id}:sh`) % 8))
      );
      await syncLikes(db, post.id, likes, memberList, post.id);
      await syncShares(db, post.id, shares, memberList, post.id);
    }

    await seedStories(db, community.id, community.slug, memberList);

    const { count: postCount } = await db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("is_published", true);
    await db
      .from("communities")
      .update({ post_count: postCount ?? 0 })
      .eq("id", community.id);

    done += 1;
    if (done % 10 === 0) {
      console.log(
        `… reality ${done}/${editorial.length} (last ${community.slug} members=${memberCount})`
      );
    }
  }

  async function communityWorker() {
    while (nextCommunity < editorial.length) {
      const i = nextCommunity++;
      await processOne(editorial[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => communityWorker()));
  void CONCURRENCY;

  // Preserve check
  for (const slug of PRESERVED) {
    const { data } = await db
      .from("communities")
      .select("slug, settings, owner_id, member_count")
      .eq("slug", slug)
      .maybeSingle();
    if (data && (data.settings as { jimvio?: unknown } | null)?.jimvio) {
      console.warn(`Warning: preserved ${slug} has jimvio settings`);
    } else {
      console.log(`preserved ok: ${slug} members=${data?.member_count ?? "?"}`);
    }
  }

  console.log(`Reality seed complete. communities=${done} personas=${personas.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
