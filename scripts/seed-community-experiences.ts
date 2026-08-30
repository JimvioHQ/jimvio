/**
 * Idempotent seeder for Jimvio-managed community programming.
 *
 * Usage: npx tsx scripts/seed-community-experiences.ts
 *
 * Uses the existing communities / spaces / rooms / posts / comments / messages
 * tables. Does not create a second community system. Does not invent human
 * identities. Service-role writes only; app reads stay on RLS.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { EDITORIAL_CATALOG } from "../lib/community/editorial-catalog";
import {
  JIMVIO_EDITORIAL_AUTHOR_EMAIL,
  communityEditorialSettings,
  editorialMessageMetadata,
  editorialPostAttachments,
  readMessageEditorialKey,
  readPostEditorialMeta,
} from "../lib/community/editorial-origin";
import { ensureDefaultCommunityWorkspace } from "../lib/community/ensure-default-workspace";

config({ path: ".env.local" });

const SEED_NOW = Date.parse("2026-08-30T12:00:00.000Z");

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
      `Editorial profile not found for ${authorEmail}. Refusing to create fake users.`
    );
  }

  console.log(`Editorial author: ${author.full_name || author.username || author.email}`);

  for (const spec of EDITORIAL_CATALOG) {
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

    if (communityId) {
      const { error } = await db
        .from("communities")
        .update({
          name: spec.name,
          tagline: spec.tagline,
          description: spec.description,
          long_description: spec.longDescription,
          category: spec.category,
          tags: spec.tags,
          visibility: "public",
          visibility_mode: "public",
          is_private: false,
          is_free: true,
          is_featured: true,
          is_active: true,
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
          name: spec.name,
          slug: spec.slug,
          tagline: spec.tagline,
          description: spec.description,
          long_description: spec.longDescription,
          category: spec.category,
          tags: spec.tags,
          visibility: "public",
          visibility_mode: "public",
          is_private: false,
          is_free: true,
          is_featured: true,
          is_active: true,
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

    const { data: membership } = await db
      .from("community_memberships")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", author.id)
      .maybeSingle();

    if (!membership) {
      const { error } = await db.from("community_memberships").insert({
        community_id: communityId,
        user_id: author.id,
        role: "owner",
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

    const { data: extraExisting } = await db
      .from("rooms")
      .select("id")
      .eq("community_id", communityId)
      .eq("slug", spec.extraRoom.slug)
      .maybeSingle();

    let extraRoomId = extraExisting?.id as string | undefined;
    if (!extraRoomId) {
      const { data: extraRoom, error } = await db
        .from("rooms")
        .insert({
          space_id: workspace.spaceId,
          community_id: communityId,
          name: spec.extraRoom.name,
          slug: spec.extraRoom.slug,
          description: spec.extraRoom.description,
          welcome_message: spec.extraRoom.welcomeMessage,
          room_type: "chat",
          channel_kind: "discussion",
          access_type: "inherit",
          visibility: "public",
          sort_order: 1,
          is_active: true,
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !extraRoom?.id) {
        throw new Error(`[${spec.slug}] extra room: ${error?.message}`);
      }
      extraRoomId = extraRoom.id;
    } else {
      await db
        .from("rooms")
        .update({
          name: spec.extraRoom.name,
          description: spec.extraRoom.description,
          welcome_message: spec.extraRoom.welcomeMessage,
          visibility: "public",
          is_active: true,
        })
        .eq("id", extraRoomId);
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
      if (!postId) {
        const { data: inserted, error } = await db
          .from("community_posts")
          .insert({
            community_id: communityId,
            room_id: workspace.roomId,
            space_id: workspace.spaceId,
            author_id: author.id,
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
        .select("id, body, created_at")
        .eq("post_id", postId)
        .eq("author_id", author.id);

      const commentBodies = new Set((existingComments ?? []).map((row) => row.body));
      for (const comment of post.comments ?? []) {
        if (commentBodies.has(comment.body)) continue;
        const createdAt = atDaysAgo(comment.daysAgo, comment.hour);
        const { error } = await db.from("community_post_comments").insert({
          post_id: postId,
          author_id: author.id,
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

    const { data: existingMessages } = await db
      .from("community_messages")
      .select("id, metadata")
      .eq("community_id", communityId)
      .eq("room_id", extraRoomId);

    const messagesByKey = new Set(
      (existingMessages ?? [])
        .map((row) => readMessageEditorialKey(row.metadata))
        .filter((key): key is string => Boolean(key))
    );

    for (const message of spec.extraRoom.messages) {
      if (messagesByKey.has(message.key)) continue;
      const createdAt = atDaysAgo(message.daysAgo, message.hour);
      const { error } = await db.from("community_messages").insert({
        room_id: extraRoomId,
        community_id: communityId,
        sender_id: author.id,
        body: message.body,
        message_type: "text",
        is_pinned: Boolean(message.pinned),
        is_deleted: false,
        metadata: editorialMessageMetadata({ key: message.key }),
        created_at: createdAt,
      });
      if (error) {
        throw new Error(`[${spec.slug}] message ${message.key}: ${error.message}`);
      }
      console.log(`  + message ${message.key}`);
    }

    const [{ count: memberCount }, { count: postCount }, { count: roomCount }, { count: messageCount }] =
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
        db
          .from("community_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", extraRoomId)
          .eq("is_deleted", false),
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
    await db
      .from("rooms")
      .update({ message_count: messageCount ?? 0, last_activity_at: new Date().toISOString() })
      .eq("id", extraRoomId);

    console.log(
      `  ${spec.name}: ${postCount ?? 0} posts, ${memberCount ?? 0} members, ${messageCount ?? 0} chat messages`
    );
  }

  console.log("Community editorial seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
