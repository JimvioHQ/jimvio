/**
 * Idempotent seeder for Jimvio-managed community programming.
 *
 * Usage: npx tsx scripts/seed-community-experiences.ts
 *
 * Uses the existing communities / spaces / rooms / posts / comments / messages
 * tables. Does not create a second community system. Service-role writes only.
 *
 * Editorial personas (editorial+*@jimvio.com) are controlled house identities —
 * not independent users. Existing user communities (e.g. forex-hub, gcs-unity)
 * are never modified.
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
  EDITORIAL_PERSONAS,
  editorialPersonaEmail,
  pickPersonaForCategory,
  type EditorialPersonaSpec,
} from "../lib/community/editorial-personas";
import { ensureDefaultCommunityWorkspace } from "../lib/community/ensure-default-workspace";

config({ path: ".env.local" });

const SEED_NOW = Date.parse("2026-08-30T12:00:00.000Z");
const PRESERVED_USER_SLUGS = new Set(["forex-hub", "gcs-unity"]);

function atDaysAgo(daysAgo: number, hour = 12): string {
  const date = new Date(SEED_NOW - daysAgo * 86_400_000);
  date.setUTCHours(hour, 18, 0, 0);
  return date.toISOString();
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return { url, key };
}

type PersonaRow = EditorialPersonaSpec & { id: string };

async function ensureEditorialPersonas(db: SupabaseClient): Promise<PersonaRow[]> {
  const rows: PersonaRow[] = [];
  for (const persona of EDITORIAL_PERSONAS) {
    const email = editorialPersonaEmail(persona.key);
    const { data: existing } = await db
      .from("profiles")
      .select("id, email")
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

    const password = randomBytes(32).toString("hex");
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
        jimvio: {
          origin: "editorial",
          persona: true,
          key: persona.key,
        },
        providers: ["jimvio_editorial"],
      },
    });
    if (error || !created.user?.id) {
      throw new Error(`persona ${persona.key}: ${error?.message ?? "create failed"}`);
    }

    await db
      .from("profiles")
      .upsert({
        id: created.user.id,
        email,
        full_name: persona.fullName,
        username: persona.username,
        bio: persona.bio,
        avatar_url: persona.avatarUrl,
        is_active: true,
      });

    rows.push({ ...persona, id: created.user.id });
    console.log(`Created editorial persona ${persona.fullName} <${email}>`);
  }
  return rows;
}

function pickAuthor(
  authorId: string,
  personas: PersonaRow[],
  category: string,
  salt: string,
  personaKey?: string
): string {
  if (personaKey) {
    const match = personas.find((p) => p.key === personaKey);
    if (match) return match.id;
  }
  if (!personas.length) return authorId;
  const picked = pickPersonaForCategory(category, salt);
  const row = personas.find((p) => p.key === picked.key);
  return row?.id ?? authorId;
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
  if (error || !inserted?.id) {
    throw new Error(`room ${room.slug}: ${error?.message}`);
  }
  return inserted.id;
}

async function seedRoomMessages(input: {
  db: SupabaseClient;
  communityId: string;
  roomId: string;
  room: EditorialCommunitySpec["extraRoom"];
  authorId: string;
  personas: PersonaRow[];
  category: string;
}) {
  const { db, communityId, roomId, room, authorId, personas, category } = input;
  const { data: existingMessages } = await db
    .from("community_messages")
    .select("id, metadata, body, sender_id")
    .eq("community_id", communityId)
    .eq("room_id", roomId);

  const idByKey = new Map<string, string>();
  for (const row of existingMessages ?? []) {
    const key = readMessageEditorialKey(row.metadata);
    if (key) idByKey.set(key, row.id);
  }

  for (const message of room.messages) {
    if (idByKey.has(message.key)) continue;
    const createdAt = atDaysAgo(message.daysAgo, message.hour);
    const senderId = pickAuthor(
      authorId,
      personas,
      category,
      message.key,
      message.personaKey
    );
    const replyToId = message.replyToKey ? idByKey.get(message.replyToKey) : undefined;
    const replySource = message.replyToKey
      ? room.messages.find((m) => m.key === message.replyToKey)
      : undefined;

    const { data: inserted, error } = await db
      .from("community_messages")
      .insert({
        room_id: roomId,
        community_id: communityId,
        sender_id: senderId,
        body: message.body,
        message_type: "text",
        is_pinned: Boolean(message.pinned),
        is_deleted: false,
        reply_to_id: replyToId ?? null,
        reply_to_body: replySource?.body?.slice(0, 280) ?? null,
        metadata: editorialMessageMetadata({ key: message.key }),
        created_at: createdAt,
      })
      .select("id")
      .single();
    if (error || !inserted?.id) {
      throw new Error(`message ${message.key}: ${error?.message}`);
    }
    idByKey.set(message.key, inserted.id);
    console.log(`  + message ${message.key}`);
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

async function seedCommunity(
  db: SupabaseClient,
  spec: EditorialCommunitySpec,
  author: { id: string },
  personas: PersonaRow[]
) {
  if (PRESERVED_USER_SLUGS.has(spec.slug)) {
    throw new Error(`Refusing to seed preserved user community slug: ${spec.slug}`);
  }

  const isCore = [
    "news-desk",
    "entertainment-circle",
    "sports-room",
    "faith-and-inspiration",
  ].includes(spec.slug);
  const featuredFlag = spec.featured ?? isCore;

  const settings = communityEditorialSettings({
    onboarding: {
      welcomeTitle: spec.welcomeTitle,
      welcomeMessage: spec.welcomeMessage,
      rules: spec.rules,
    },
  });

  const { data: existing } = await db
    .from("communities")
    .select("id, settings")
    .eq("slug", spec.slug)
    .maybeSingle();

  let communityId = existing?.id as string | undefined;

  const communityFields = {
    name: spec.name,
    tagline: spec.tagline,
    description: spec.description,
    long_description: spec.longDescription,
    category: spec.category,
    tags: spec.tags,
    visibility: "public" as const,
    visibility_mode: "public" as const,
    is_private: false,
    is_free: true,
    is_featured: featuredFlag,
    is_active: true,
    ...(spec.avatarUrl ? { avatar_url: spec.avatarUrl } : {}),
    ...(spec.coverImage
      ? { cover_image: spec.coverImage, banner_url: spec.coverImage }
      : {}),
  };

  if (communityId) {
    const { error } = await db
      .from("communities")
      .update({
        ...communityFields,
        settings: communityEditorialSettings(existing?.settings ?? settings),
      })
      .eq("id", communityId);
    if (error) throw new Error(`[${spec.slug}] community update: ${error.message}`);
    console.log(`Updated community ${spec.slug}`);
  } else {
    const { data: created, error } = await db
      .from("communities")
      .insert({
        owner_id: author.id,
        slug: spec.slug,
        ...communityFields,
        settings,
        created_at: spec.createdAt,
        member_count: 0,
        post_count: 0,
        space_count: 0,
      })
      .select("id")
      .single();
    if (error || !created?.id) {
      throw new Error(`[${spec.slug}] community insert: ${error?.message}`);
    }
    communityId = created.id;
    console.log(`Created community ${spec.slug}`);
  }

  const memberIds = new Set<string>([author.id, ...personas.map((p) => p.id)]);
  for (const userId of memberIds) {
    const { data: membership } = await db
      .from("community_memberships")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membership) continue;
    const { error } = await db.from("community_memberships").insert({
      community_id: communityId,
      user_id: userId,
      role: userId === author.id ? "owner" : "member",
      plan_type: "lifetime",
      status: "active",
    });
    if (error) throw new Error(`[${spec.slug}] membership: ${error.message}`);
  }

  const workspace = await ensureDefaultCommunityWorkspace(db, communityId);
  if (!workspace.spaceId || !workspace.roomId) {
    throw new Error(`[${spec.slug}] default workspace missing`);
  }

  await db
    .from("rooms")
    .update({
      visibility: "public",
      is_active: true,
      welcome_message:
        "Discussion is the main feed for this Jimvio-managed community. Questions and longer posts belong here.",
    })
    .eq("id", workspace.roomId);

  const rooms = editorialRoomsFor(spec);
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]!;
    const roomId = await ensureRoom(db, communityId, workspace.spaceId, room, i + 1);
    await seedRoomMessages({
      db,
      communityId,
      roomId,
      room,
      authorId: author.id,
      personas,
      category: spec.category,
    });
  }

  const { data: existingPosts } = await db
    .from("community_posts")
    .select("id, attachments, comment_count")
    .eq("community_id", communityId);

  const postsByKey = new Map<string, { id: string; comment_count: number | null }>();
  for (const row of existingPosts ?? []) {
    const key = readPostEditorialMeta(row.attachments).key;
    if (key) postsByKey.set(key, { id: row.id, comment_count: row.comment_count });
  }

  for (const post of spec.posts) {
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

    let postId = postsByKey.get(post.key)?.id;
    const postAuthorId = pickAuthor(author.id, personas, spec.category, post.key);
    if (!postId) {
      const { data: inserted, error } = await db
        .from("community_posts")
        .insert({
          community_id: communityId,
          room_id: workspace.roomId,
          space_id: workspace.spaceId,
          author_id: post.origin === "promotion" ? author.id : postAuthorId,
          title: post.title,
          body: post.body,
          post_type: post.postType,
          attachments,
          audience: "public",
          is_published: true,
          is_pinned: Boolean(post.pinned),
          is_exclusive: false,
          published_at: publishedAt,
          created_at: publishedAt,
          updated_at: publishedAt,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
        })
        .select("id")
        .single();
      if (error || !inserted?.id) {
        throw new Error(`[${spec.slug}] post ${post.key}: ${error?.message}`);
      }
      postId = inserted.id;
      postsByKey.set(post.key, { id: postId, comment_count: 0 });
      console.log(`  + post ${post.key}`);
    }

    const { data: existingComments } = await db
      .from("community_post_comments")
      .select("id, body")
      .eq("post_id", postId);

    const commentBodies = new Set((existingComments ?? []).map((row) => row.body));
    for (const comment of post.comments ?? []) {
      if (commentBodies.has(comment.body)) continue;
      const createdAt = atDaysAgo(comment.daysAgo, comment.hour);
      const commentAuthor = pickAuthor(
        author.id,
        personas,
        spec.category,
        comment.key
      );
      const { error } = await db.from("community_post_comments").insert({
        post_id: postId,
        author_id: commentAuthor,
        body: comment.body,
        is_published: true,
        created_at: createdAt,
      });
      if (error) {
        throw new Error(`[${spec.slug}] comment ${comment.key}: ${error.message}`);
      }
    }

    const { count: commentCount } = await db
      .from("community_post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("is_published", true);
    await db
      .from("community_posts")
      .update({ comment_count: commentCount ?? 0 })
      .eq("id", postId);
  }

  const [{ count: memberCount }, { count: postCount }, { count: roomCount }] =
    await Promise.all([
      db
        .from("community_memberships")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("status", "active"),
      db
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId)
        .eq("is_published", true),
      db
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("space_id", workspace.spaceId)
        .eq("is_active", true),
    ]);

  await db
    .from("communities")
    .update({
      member_count: memberCount ?? 1,
      post_count: postCount ?? 0,
      space_count: 1,
    })
    .eq("id", communityId);
  await db.from("spaces").update({ room_count: roomCount ?? 1 }).eq("id", workspace.spaceId);

  console.log(
    `  ${spec.name}: ${postCount ?? 0} posts, ${memberCount ?? 0} members, ${roomCount ?? 0} rooms`
  );
}

async function main() {
  const { url, key } = requireEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  const authorEmail =
    process.env.JIMVIO_EDITORIAL_EMAIL ?? JIMVIO_EDITORIAL_AUTHOR_EMAIL;

  const { data: author, error: authorError } = await db
    .from("profiles")
    .select("id, email, username, full_name")
    .eq("email", authorEmail)
    .maybeSingle();

  if (authorError || !author?.id) {
    throw new Error(
      `Editorial profile not found for ${authorEmail}. Refusing to invent an owner identity.`
    );
  }

  console.log(`Editorial owner: ${author.full_name || author.username || author.email}`);
  console.log(`Catalog size: ${EDITORIAL_CATALOG.length} communities`);

  const personas = await ensureEditorialPersonas(db);
  console.log(`Editorial personas ready: ${personas.length}`);

  for (const spec of EDITORIAL_CATALOG) {
    await seedCommunity(db, spec, author, personas);
  }

  // Verify preserved user communities untouched by slug collision
  for (const slug of PRESERVED_USER_SLUGS) {
    const { data } = await db.from("communities").select("slug, settings").eq("slug", slug).maybeSingle();
    if (data?.settings && typeof data.settings === "object" && data.settings !== null) {
      const jimvio = (data.settings as { jimvio?: unknown }).jimvio;
      if (jimvio) {
        console.warn(`Warning: preserved community ${slug} has jimvio settings block`);
      }
    }
  }

  console.log("Community editorial ecosystem seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
