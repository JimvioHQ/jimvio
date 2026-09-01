#!/usr/bin/env node
/**
 * Idempotent: one active Space per Community.
 * - Keeps canonical Space (slug general, else lowest sort_order)
 * - Migrates messages/posts to canonical discussion room
 * - Archives redundant Spaces (is_active=false, is_hidden=true)
 * - Syncs Space name to Community name when still "General"
 *
 * Usage: node scripts/ops/consolidate-community-spaces.mjs [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DISCUSSION_SLUG_RE = /^(discussion|general|chat|lounge)$/i;

function pickCanonicalSpace(spaces) {
  const active = spaces.filter((s) => s.is_active !== false);
  if (!active.length) return null;
  return (
    active.find((s) => s.slug === "general") ??
    active.find((s) => s.is_featured) ??
    [...active].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
  );
}

function pickDiscussionRoom(rooms) {
  const active = (rooms ?? []).filter((r) => r.is_active !== false && r.room_type === "chat");
  return (
    active.find((r) => DISCUSSION_SLUG_RE.test(r.slug ?? "")) ??
    active.find((r) => DISCUSSION_SLUG_RE.test(r.name ?? "")) ??
    active[0] ??
    null
  );
}

async function main() {
  const { data: communities, error } = await db
    .from("communities")
    .select("id, name, slug")
    .eq("is_active", true);

  if (error) throw error;

  let consolidated = 0;
  let archived = 0;
  let messagesMoved = 0;
  let postsMoved = 0;

  for (const community of communities ?? []) {
    const { data: spaces } = await db
      .from("spaces")
      .select("id, name, slug, sort_order, is_featured, is_active")
      .eq("community_id", community.id)
      .order("sort_order", { ascending: true });

    const activeSpaces = (spaces ?? []).filter((s) => s.is_active !== false);
    if (activeSpaces.length <= 1) {
      const only = activeSpaces[0];
      if (only && /^general$/i.test(only.name.trim()) && community.name) {
        if (!dryRun) {
          await db
            .from("spaces")
            .update({ name: community.name.slice(0, 120) })
            .eq("id", only.id);
        }
      }
      continue;
    }

    const canonical = pickCanonicalSpace(activeSpaces);
    if (!canonical) continue;

    const { data: allRooms } = await db
      .from("rooms")
      .select("id, slug, name, room_type, space_id, is_active")
      .eq("community_id", community.id)
      .eq("is_active", true);

    const canonicalRooms = (allRooms ?? []).filter((r) => r.space_id === canonical.id);
    let targetRoom = pickDiscussionRoom(canonicalRooms);

    if (!targetRoom) {
      if (dryRun) {
        console.log(`[dry-run] Would ensure discussion room for ${community.slug}`);
        continue;
      }
      const { data: created, error: roomErr } = await db
        .from("rooms")
        .insert({
          space_id: canonical.id,
          community_id: community.id,
          name: "Discussion",
          slug: "discussion",
          room_type: "chat",
          channel_kind: "discussion",
          access_type: "inherit",
          sort_order: 0,
          is_active: true,
        })
        .select("id")
        .single();
      if (roomErr) {
        console.error(`[${community.slug}] room create:`, roomErr.message);
        continue;
      }
      targetRoom = { id: created.id };
    }

    const redundantSpaces = activeSpaces.filter((s) => s.id !== canonical.id);

    for (const space of redundantSpaces) {
      const redundantRooms = (allRooms ?? []).filter((r) => r.space_id === space.id);
      for (const room of redundantRooms) {
        if (room.id === targetRoom.id) continue;
        const { count } = await db
          .from("community_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id);
        if (count && count > 0) {
          if (!dryRun) {
            const { error: msgErr } = await db
              .from("community_messages")
              .update({ room_id: targetRoom.id, community_id: community.id })
              .eq("room_id", room.id);
            if (msgErr) console.error(`[${community.slug}] messages:`, msgErr.message);
          }
          messagesMoved += count;
        }
      }

      const { count: postCount } = await db
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("space_id", space.id);

      if (postCount && postCount > 0) {
        if (!dryRun) {
          await db
            .from("community_posts")
            .update({ space_id: canonical.id, room_id: targetRoom.id })
            .eq("space_id", space.id);
        }
        postsMoved += postCount;
      }

      if (!dryRun) {
        await db
          .from("spaces")
          .update({ is_active: false, is_hidden: true })
          .eq("id", space.id);
        await db.from("rooms").update({ is_active: false }).eq("space_id", space.id);
      }
      archived += 1;
    }

    const canonicalName =
      /^general$/i.test((canonical.name ?? "").trim()) && community.name
        ? community.name.slice(0, 120)
        : canonical.name;

    if (!dryRun) {
      await db
        .from("spaces")
        .update({
          name: canonicalName,
          room_count: 1,
          sort_order: 0,
          is_hidden: false,
        })
        .eq("id", canonical.id);
      await db
        .from("communities")
        .update({ space_count: 1 })
        .eq("id", community.id);
    }
    consolidated += 1;
    console.log(`✓ ${community.slug}: kept ${canonical.slug}, archived ${redundantSpaces.length}`);
  }

  console.log(
    JSON.stringify({ dryRun, consolidated, archived, messagesMoved, postsMoved }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
