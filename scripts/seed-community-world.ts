/**
 * World-scale idempotent seeder for Jimvio-managed communities.
 *
 * Usage: npx tsx scripts/seed-community-world.ts
 *
 * Additive: never touches forex-hub / gcs-unity.
 * Uses existing tables only. No migration.
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EDITORIAL_CATALOG,
  editorialRoomsFor,
  type EditorialCommunitySpec,
} from "../lib/community/editorial-catalog";
import {
  JIMVIO_EDITORIAL_AUTHOR_EMAIL,
  communityEditorialSettings,
  editorialMessageMetadata,
  editorialPostAttachments,
  readMessageEditorialKey,
  readPostEditorialMeta,
} from "../lib/community/editorial-origin";
import {
  ALL_EDITORIAL_PERSONAS,
  editorialPersonaEmail,
  pickPersonaForCategory,
  type EditorialPersonaSpec,
} from "../lib/community/editorial-personas";
import { ensureDefaultCommunityWorkspace } from "../lib/community/ensure-default-workspace";
import { assertWorldBlueprintIntegrity } from "../lib/community/editorial-world-blueprints";
import { buildDefaultDiscussionMessages } from "../lib/community/editorial-world-build";
import { assertProductionScriptAllowed } from "../lib/ops/script-safety";
import type { EditorialMessageSpec } from "../lib/community/editorial-types";

config({ path: ".env.local" });
assertProductionScriptAllowed("seed-community-world");

const SEED_NOW = Date.parse("2026-08-30T18:00:00.000Z");
const PRESERVED = new Set(["forex-hub", "gcs-unity"]);
const CONCURRENCY = 2;

function atDaysAgo(daysAgo: number, hour = 12): string {
  const date = new Date(SEED_NOW - daysAgo * 86_400_000);
  date.setUTCHours(hour, (daysAgo * 7) % 60, 0, 0);
  return date.toISOString();
}

function hashSlug(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isTransientSeedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|429|503|502|network/i.test(msg);
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 6
): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransientSeedError(err) || i === attempts) break;
      const waitMs = Math.min(30_000, 800 * 2 ** (i - 1));
      console.warn(`retry ${i}/${attempts} ${label}: ${err instanceof Error ? err.message : err}`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  }
  return { url, key };
}

type PersonaRow = EditorialPersonaSpec & { id: string };

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

async function ensurePersonas(db: SupabaseClient): Promise<PersonaRow[]> {
  const rows: PersonaRow[] = [];
  for (const persona of ALL_EDITORIAL_PERSONAS) {
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
          bio: persona.bio,
          avatar_url: persona.avatarUrl,
          is_active: true,
        })
        .eq("id", existing.id);
      rows.push({ ...persona, id: existing.id });
      continue;
    }
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: randomBytes(32).toString("hex"),
      email_confirm: true,
      user_metadata: {
        full_name: persona.fullName,
        username: persona.username,
        avatar_url: persona.avatarUrl,
      },
      app_metadata: {
        jimvio: { origin: "editorial", persona: true, key: persona.key },
        providers: ["jimvio_editorial"],
      },
    });
    if (error || !created.user?.id) {
      throw new Error(`persona ${persona.key}: ${error?.message ?? "create failed"}`);
    }
    await db.from("profiles").upsert({
      id: created.user.id,
      email,
      full_name: persona.fullName,
      username: persona.username,
      bio: persona.bio,
      avatar_url: persona.avatarUrl,
      is_active: true,
    });
    rows.push({ ...persona, id: created.user.id });
    console.log(`+ persona ${persona.fullName}`);
  }
  return rows;
}

function pickAuthor(
  ownerId: string,
  personas: PersonaRow[],
  category: string,
  salt: string,
  promo = false
): string {
  if (promo) return ownerId;
  const picked = pickPersonaForCategory(category, salt);
  return personas.find((p) => p.key === picked.key)?.id ?? ownerId;
}

function authorshipPool(
  personas: PersonaRow[],
  category: string,
  activity: EditorialCommunitySpec["activity"],
  slug: string
): PersonaRow[] {
  const size = activity === "high" ? 28 : activity === "medium" ? 18 : 12;
  const scored = personas
    .map((p, i) => {
      const affinity = p.affinities.some((a) => a.toLowerCase() === category.toLowerCase())
        ? 0
        : 1;
      const h = (slug.charCodeAt(i % slug.length) + i * 17) % 997;
      return { p, score: affinity * 1000 + h };
    })
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, Math.min(size, scored.length)).map((s) => s.p);
}

async function ensureEditorialSpace(
  db: SupabaseClient,
  communityId: string,
  room: EditorialCommunitySpec["extraRoom"],
  sortOrder: number
): Promise<{ spaceId: string; roomId: string }> {
  const { data: existingSpace } = await db
    .from("spaces")
    .select("id")
    .eq("community_id", communityId)
    .eq("slug", room.slug)
    .maybeSingle();

  let spaceId = existingSpace?.id as string | undefined;
  if (!spaceId) {
    const { data: inserted, error } = await db
      .from("spaces")
      .insert({
        community_id: communityId,
        name: room.name,
        slug: room.slug,
        description: room.description,
        icon: "💬",
        sort_order: sortOrder,
        access_type: "free",
        privacy: "public",
        space_type: "discussion",
        is_active: true,
        room_count: 0,
        member_count: 0,
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !inserted?.id) throw new Error(`space ${room.slug}: ${error?.message}`);
    spaceId = inserted.id;
  } else {
    await db
      .from("spaces")
      .update({
        name: room.name,
        description: room.description,
        is_active: true,
        sort_order: sortOrder,
      })
      .eq("id", spaceId);
  }

  const roomId = await ensureRoom(db, communityId, spaceId, room, 0);
  await db.from("spaces").update({ room_count: 1 }).eq("id", spaceId);
  return { spaceId, roomId };
}

async function ensureRoom(
  db: SupabaseClient,
  communityId: string,
  spaceId: string,
  room: EditorialCommunitySpec["extraRoom"],
  sortOrder: number
): Promise<string> {
  const { data: existing } = await db
    .from("rooms")
    .select("id")
    .eq("community_id", communityId)
    .eq("slug", room.slug)
    .maybeSingle();
  if (existing?.id) {
    await db
      .from("rooms")
      .update({
        name: room.name,
        description: room.description,
        welcome_message: room.welcomeMessage,
        visibility: "public",
        is_active: true,
        sort_order: sortOrder,
      })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data: inserted, error } = await db
    .from("rooms")
    .insert({
      space_id: spaceId,
      community_id: communityId,
      name: room.name,
      slug: room.slug,
      description: room.description,
      welcome_message: room.welcomeMessage,
      room_type: "chat",
      channel_kind: "discussion",
      access_type: "inherit",
      visibility: "public",
      sort_order: sortOrder,
      is_active: true,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted?.id) throw new Error(`room ${room.slug}: ${error?.message}`);
  return inserted.id;
}

async function seedRoomMessages(
  db: SupabaseClient,
  communityId: string,
  roomId: string,
  messages: EditorialMessageSpec[],
  spec: EditorialCommunitySpec,
  owner: { id: string },
  personas: PersonaRow[],
) {
  const { data: existingMessages } = await db
    .from("community_messages")
    .select("id, metadata")
    .eq("community_id", communityId)
    .eq("room_id", roomId);
  const idByKey = new Map<string, string>();
  for (const row of existingMessages ?? []) {
    const key = readMessageEditorialKey(row.metadata);
    if (key) idByKey.set(key, row.id);
  }
  for (const message of messages) {
    if (idByKey.has(message.key)) continue;
    const replyToId = message.replyToKey ? idByKey.get(message.replyToKey) : undefined;
    const replySource = message.replyToKey
      ? messages.find((m) => m.key === message.replyToKey)
      : undefined;
    const { data: inserted, error } = await db
      .from("community_messages")
      .insert({
        room_id: roomId,
        community_id: communityId,
        sender_id: pickAuthor(owner.id, personas, spec.category, message.key),
        body: message.body,
        message_type: "text",
        is_pinned: Boolean(message.pinned),
        is_deleted: false,
        reply_to_id: replyToId ?? null,
        reply_to_body: replySource?.body?.slice(0, 280) ?? null,
        metadata: editorialMessageMetadata({ key: message.key }),
        created_at: atDaysAgo(message.daysAgo, message.hour),
      })
      .select("id")
      .single();
    if (error || !inserted?.id) {
      throw new Error(`[${spec.slug}] message ${message.key}: ${error?.message}`);
    }
    idByKey.set(message.key, inserted.id);
  }
  const { count: messageCount } = await db
    .from("community_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_deleted", false);
  await db
    .from("rooms")
    .update({
      message_count: messageCount ?? 0,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", roomId);
}

async function getDiscussionRoomId(
  db: SupabaseClient,
  communityId: string,
  spaceId: string,
): Promise<string | null> {
  const { data: room } = await db
    .from("rooms")
    .select("id")
    .eq("space_id", spaceId)
    .eq("slug", "discussion")
    .eq("is_active", true)
    .maybeSingle();
  if (room?.id) return room.id;

  const { data: created, error } = await db
    .from("rooms")
    .insert({
      space_id: spaceId,
      community_id: communityId,
      name: "Discussion",
      slug: "discussion",
      description: "Main community discussion",
      room_type: "chat",
      channel_kind: "discussion",
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
      visibility: "public",
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !created?.id) return null;
  return created.id;
}

async function seedDefaultDiscussionOnly(
  db: SupabaseClient,
  spec: EditorialCommunitySpec,
  owner: { id: string },
  personas: PersonaRow[],
): Promise<"skipped" | "seeded"> {
  if (PRESERVED.has(spec.slug)) return "skipped";

  const { data: existing } = await db
    .from("communities")
    .select("id")
    .eq("slug", spec.slug)
    .maybeSingle();
  if (!existing?.id) return "skipped";

  const workspace = await ensureDefaultCommunityWorkspace(db, existing.id);
  if (!workspace.spaceId) throw new Error(`[${spec.slug}] workspace missing`);

  const discussionRoomId = await getDiscussionRoomId(db, existing.id, workspace.spaceId);
  if (!discussionRoomId) throw new Error(`[${spec.slug}] discussion room missing`);

  const { count } = await db
    .from("community_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", discussionRoomId)
    .eq("is_deleted", false);
  if ((count ?? 0) > 0) return "skipped";

  await seedRoomMessages(
    db,
    existing.id,
    discussionRoomId,
    buildDefaultDiscussionMessages(spec),
    spec,
    owner,
    personas,
  );
  return "seeded";
}

async function seedCommunity(
  db: SupabaseClient,
  spec: EditorialCommunitySpec,
  owner: { id: string },
  personas: PersonaRow[]
) {
  if (PRESERVED.has(spec.slug)) {
    throw new Error(`Refusing preserved slug ${spec.slug}`);
  }

  const isCore = [
    "news-desk",
    "entertainment-circle",
    "sports-room",
    "faith-and-inspiration",
  ].includes(spec.slug);
  const featuredFlag = spec.featured ?? isCore;
  const targetMembers = Math.min(
    2000,
    Math.max(40, spec.targetMemberCount ?? (isCore ? 620 : 180))
  );

  const settings = communityEditorialSettings(
    {
      onboarding: {
        welcomeTitle: spec.welcomeTitle,
        welcomeMessage: spec.welcomeMessage,
        rules: spec.rules,
      },
    },
    { targetMemberCount: targetMembers }
  );

  const { data: existing } = await db
    .from("communities")
    .select("id, settings")
    .eq("slug", spec.slug)
    .maybeSingle();

  const access = spec.access ?? "free";
  const isPrivate = access === "private";
  const isPaid = access === "paid";
  const monthlyPrice = isPaid ? 9 + (hashSlug(spec.slug) % 22) : null;

  const fields = {
    name: spec.name,
    tagline: spec.tagline,
    description: spec.description,
    long_description: spec.longDescription,
    category: spec.category,
    tags: spec.tags,
    visibility: isPrivate ? ("private" as const) : ("public" as const),
    visibility_mode: isPrivate ? ("private" as const) : ("public" as const),
    is_private: isPrivate,
    is_free: !isPaid,
    monthly_price: monthlyPrice,
    yearly_price: isPaid && monthlyPrice != null ? monthlyPrice * 10 : null,
    currency: isPaid ? "USD" : null,
    is_featured: featuredFlag,
    is_active: true,
    ...(spec.avatarUrl ? { avatar_url: spec.avatarUrl } : {}),
    ...(spec.coverImage
      ? { cover_image: spec.coverImage, banner_url: spec.coverImage }
      : {}),
  };

  let communityId = existing?.id as string | undefined;
  if (communityId) {
    const { error } = await db
      .from("communities")
      .update({
        ...fields,
        settings: communityEditorialSettings(existing?.settings ?? settings, {
          targetMemberCount: targetMembers,
        }),
      })
      .eq("id", communityId);
    if (error) throw new Error(`[${spec.slug}] update: ${error.message}`);
  } else {
    const { data: created, error } = await db
      .from("communities")
      .insert({
        owner_id: owner.id,
        slug: spec.slug,
        ...fields,
        member_count: 0,
        settings,
        created_at: spec.createdAt,
        post_count: 0,
        space_count: 0,
      })
      .select("id")
      .single();
    if (error || !created?.id) throw new Error(`[${spec.slug}] insert: ${error?.message}`);
    communityId = created.id;
  }

  const pool = authorshipPool(personas, spec.category, spec.activity ?? "medium", spec.slug);
  const memberIds = [owner.id, ...pool.map((p) => p.id)];
  const { data: existingMem } = await db
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", communityId)
    .in("user_id", memberIds);
  const have = new Set((existingMem ?? []).map((m) => m.user_id));
  const toInsert = memberIds
    .filter((id) => !have.has(id))
    .map((user_id) => ({
      community_id: communityId!,
      user_id,
      role: user_id === owner.id ? "owner" : "member",
      plan_type: "lifetime",
      status: "active",
    }));
  if (toInsert.length) {
    const { error } = await db.from("community_memberships").insert(toInsert);
    if (error) throw new Error(`[${spec.slug}] memberships: ${error.message}`);
  }

  const rooms = editorialRoomsFor(spec);
  const editorialSpaces: { spaceId: string; roomId: string }[] = [];
  for (let i = 0; i < rooms.length; i++) {
    editorialSpaces.push(await ensureEditorialSpace(db, communityId!, rooms[i]!, i));
  }
  const workspace = editorialSpaces[0];
  if (!workspace?.spaceId || !workspace?.roomId) {
    throw new Error(`[${spec.slug}] workspace missing`);
  }
  const roomIds = editorialSpaces.map((entry) => entry.roomId);

  const { data: existingPosts } = await db
    .from("community_posts")
    .select("id, attachments")
    .eq("community_id", communityId);
  const postsByKey = new Map<string, string>();
  for (const row of existingPosts ?? []) {
    const key = readPostEditorialMeta(row.attachments).key;
    if (key) postsByKey.set(key, row.id);
  }

  const newPosts = [];
  for (const post of spec.posts) {
    if (postsByKey.has(post.key)) continue;
    const publishedAt = atDaysAgo(post.daysAgo, post.hour);
    const attachments = editorialPostAttachments({
      key: post.key,
      origin: post.origin,
      href: post.href,
      extra:
        post.postType === "poll" && post.pollOptions
          ? {
              poll: {
                options: post.pollOptions.map((text) => ({ text, votes: 0 })),
                multiple: false,
                anonymous: false,
                expires_at: null,
              },
            }
          : undefined,
    });
    newPosts.push({
      community_id: communityId,
      room_id: workspace.roomId,
      space_id: workspace.spaceId,
      author_id: pickAuthor(
        owner.id,
        personas,
        spec.category,
        post.key,
        post.origin === "promotion"
      ),
      title: post.title,
      body: post.body,
      post_type: post.postType,
      attachments,
      images: post.images ?? null,
      video_url: post.videoUrl ?? null,
      audience: isPrivate ? "community" : "public",
      is_published: true,
      is_pinned: Boolean(post.pinned),
      is_exclusive: false,
      published_at: publishedAt,
      created_at: publishedAt,
      updated_at: publishedAt,
      like_count: post.likeCount ?? 0,
      view_count: post.viewCount ?? 0,
      unique_view_count: Math.max(0, Math.floor((post.viewCount ?? 0) * 0.72)),
      comment_count: 0,
      share_count: 0,
      _key: post.key,
      _comments: post.comments ?? [],
    });
  }

  for (let i = 0; i < newPosts.length; i += 25) {
    const chunk = newPosts.slice(i, i + 25);
    const payload = chunk.map(({ _key, _comments, ...row }) => row);
    const { data: inserted, error } = await db
      .from("community_posts")
      .insert(payload)
      .select("id, attachments");
    if (error) throw new Error(`[${spec.slug}] posts: ${error.message}`);
    for (const row of inserted ?? []) {
      const key = readPostEditorialMeta(row.attachments).key;
      if (key) postsByKey.set(key, row.id);
    }
  }

  for (const post of spec.posts) {
    const postId = postsByKey.get(post.key);
    if (!postId || !post.comments?.length) continue;
    const { data: existingComments } = await db
      .from("community_post_comments")
      .select("body")
      .eq("post_id", postId);
    const bodies = new Set((existingComments ?? []).map((c) => c.body));
    const rows = post.comments
      .filter((c) => !bodies.has(c.body))
      .map((c) => ({
        post_id: postId,
        author_id: pickAuthor(owner.id, personas, spec.category, c.key),
        body: c.body,
        is_published: true,
        created_at: atDaysAgo(c.daysAgo, c.hour),
        like_count: 0,
      }));
    if (rows.length) {
      const { error } = await db.from("community_post_comments").insert(rows);
      if (error) throw new Error(`[${spec.slug}] comments: ${error.message}`);
    }
    const { count } = await db
      .from("community_post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("is_published", true);
    await db.from("community_posts").update({ comment_count: count ?? 0 }).eq("id", postId);
  }

  for (let r = 0; r < rooms.length; r++) {
    const room = rooms[r]!;
    const roomId = roomIds[r]!;
    await seedRoomMessages(db, communityId, roomId, room.messages, spec, owner, personas);
  }

  const discussionRoomId = await getDiscussionRoomId(db, communityId, workspace.spaceId);
  if (!discussionRoomId) throw new Error(`[${spec.slug}] discussion room missing`);

  await seedRoomMessages(
    db,
    communityId,
    discussionRoomId,
    buildDefaultDiscussionMessages(spec),
    spec,
    owner,
    personas,
  );

  const [{ count: postCount }, { count: spaceCount }, { count: membershipCount }] = await Promise.all([
    db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("is_published", true),
    db
      .from("spaces")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("is_active", true),
    db
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active"),
  ]);

  const actualMembers = membershipCount ?? targetMembers;

  await db
    .from("communities")
    .update({
      member_count: actualMembers,
      post_count: postCount ?? 0,
      space_count: spaceCount ?? rooms.length,
    })
    .eq("id", communityId);
  await db.from("spaces").update({ room_count: 1 }).eq("id", workspace.spaceId);

  // Free/inherit spaces: every active community member has access — keep counts truthful.
  const { data: spaces } = await db
    .from("spaces")
    .select("id, access_type")
    .eq("community_id", communityId)
    .eq("is_active", true);
  for (const space of spaces ?? []) {
    const access = (space.access_type || "free").toLowerCase();
    if (access === "free" || access === "inherit") {
      await db.from("spaces").update({ member_count: actualMembers }).eq("id", space.id);
    }
  }

  console.log(
    `✓ ${spec.slug} members=${actualMembers} posts=${postCount ?? 0} spaces=${spaceCount ?? rooms.length}`
  );
}

async function main() {
  assertWorldBlueprintIntegrity();
  const discussionOnly = process.argv.includes("--discussion-only");
  const { url, key } = requireEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  const authorEmail =
    process.env.JIMVIO_EDITORIAL_EMAIL ?? JIMVIO_EDITORIAL_AUTHOR_EMAIL;

  const { data: author, error } = await db
    .from("profiles")
    .select("id, email, full_name, username")
    .eq("email", authorEmail)
    .maybeSingle();
  if (error || !author?.id) {
    throw new Error(`Editorial owner missing for ${authorEmail}`);
  }

  console.log(`Owner: ${author.full_name || author.email}`);
  console.log(`Catalog: ${EDITORIAL_CATALOG.length} communities`);
  const personas = await ensurePersonas(db);
  console.log(`Personas: ${personas.length}`);
  if (discussionOnly) console.log("Mode: discussion-only backfill");

  let done = 0;
  let seeded = 0;
  let skipped = 0;
  await mapPool(EDITORIAL_CATALOG, CONCURRENCY, async (spec) => {
    if (discussionOnly) {
      const result = await withRetry(spec.slug, () =>
        seedDefaultDiscussionOnly(db, spec, author, personas),
      );
      if (result === "seeded") {
        seeded += 1;
        console.log(`✓ ${spec.slug} discussion seeded`);
      } else {
        skipped += 1;
      }
    } else {
      await withRetry(spec.slug, () => seedCommunity(db, spec, author, personas));
    }
    done += 1;
    if (done % 10 === 0) console.log(`… ${done}/${EDITORIAL_CATALOG.length}`);
  });

  if (discussionOnly) {
    console.log(`Discussion backfill: seeded=${seeded} skipped=${skipped}`);
  }

  for (const slug of PRESERVED) {
    const { data } = await db
      .from("communities")
      .select("slug, settings")
      .eq("slug", slug)
      .maybeSingle();
    if (data && (data.settings as { jimvio?: unknown } | null)?.jimvio) {
      console.warn(`Warning: preserved ${slug} has jimvio settings`);
    }
  }

  console.log("World community seed complete.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
