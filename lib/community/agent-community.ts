/**
 * Account-scoped community updates for Jimvio AI.
 * Ownership is checked with the signed-in user before any admin write.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDefaultCommunityWorkspace } from "@/lib/community/ensure-default-workspace";

export type OwnedCommunityRef = {
  id: string;
  slug: string;
  name: string;
  archived_at: string | null;
};

export function mergeCommunitySettings(current: unknown, rules?: string): Record<string, unknown> {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  if (rules) base.rules = rules;
  return base;
}

export function slugifyChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function cleanLabel(value: string, max: number) {
  return value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function findOwnedCommunityBySlug(
  db: SupabaseClient,
  userId: string,
  slug: string,
): Promise<OwnedCommunityRef | null> {
  if (!userId || !slug) return null;
  const { data, error } = await db
    .from("communities")
    .select("id, slug, name, archived_at")
    .eq("slug", slug)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as OwnedCommunityRef;
}

export async function loadOwnedCommunity(
  db: SupabaseClient,
  userId: string,
  communityId: string,
): Promise<OwnedCommunityRef | null> {
  if (!userId || !communityId || communityId.length > 80) return null;
  const { data, error } = await db
    .from("communities")
    .select("id, slug, name, archived_at")
    .eq("id", communityId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as OwnedCommunityRef;
}

export async function updateOwnedCommunityDetails(
  db: SupabaseClient,
  userId: string,
  communityId: string,
  input: { description?: string; rules?: string; category?: string },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const owned = await loadOwnedCommunity(db, userId, communityId);
  if (!owned) return { ok: false, error: "That community is not available on this account.", status: 403 };
  if (owned.archived_at) return { ok: false, error: "That community is archived.", status: 409 };

  const { data: row, error: readError } = await db
    .from("communities")
    .select("settings, long_description")
    .eq("id", owned.id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (readError || !row) {
    return { ok: false, error: "That community is not available on this account.", status: 403 };
  }

  const description = input.description ? cleanLabel(input.description, 500) : "";
  const rules = input.rules ? cleanLabel(input.rules, 400) : "";
  const category = input.category ? cleanLabel(input.category, 40) : "";
  const patch: Record<string, unknown> = {};
  if (description) patch.description = description;
  if (category) patch.category = category;
  if (rules) {
    patch.settings = mergeCommunitySettings(row.settings, rules);
    if (!row.long_description) patch.long_description = rules;
  }
  if (!Object.keys(patch).length) return { ok: true };

  const { data: updated, error } = await db
    .from("communities")
    .update(patch as never)
    .eq("id", owned.id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: "Could not update the community.", status: 400 };
  return { ok: true };
}

export async function ensureOwnedCommunityChannels(
  userDb: SupabaseClient,
  adminDb: SupabaseClient,
  userId: string,
  communityId: string,
  channels: string[],
): Promise<{ ok: true; channels: string[] } | { ok: false; error: string; status: number }> {
  const owned = await loadOwnedCommunity(userDb, userId, communityId);
  if (!owned) return { ok: false, error: "That community is not available on this account.", status: 403 };
  if (owned.archived_at) return { ok: false, error: "That community is archived.", status: 409 };

  const seeded = await ensureDefaultCommunityWorkspace(adminDb, owned.id, {
    communityName: owned.name,
    communitySlug: owned.slug,
  });
  if (!seeded.spaceId) {
    return { ok: false, error: "The default community space is not available yet.", status: 500 };
  }

  const requested = channels
    .map((name) => cleanLabel(name, 40))
    .filter((name) => name.length >= 2)
    .slice(0, 3);

  const { data: existing, error } = await adminDb
    .from("rooms")
    .select("id, slug")
    .eq("space_id", seeded.spaceId)
    .eq("is_active", true);
  if (error) return { ok: false, error: "Could not read the community channels.", status: 500 };

  const have = new Set((existing ?? []).map((room) => String((room as { slug?: string }).slug || "")));
  const ready: string[] = [];
  let sortOrder = have.size;

  for (const name of requested) {
    const slug = slugifyChannelName(name);
    if (!slug) continue;
    if (have.has(slug)) {
      ready.push(name);
      continue;
    }
    const { error: insertError } = await adminDb
      .from("rooms")
      .insert({
        space_id: seeded.spaceId,
        community_id: owned.id,
        name,
        slug,
        description: `${name} for ${owned.name}`,
        room_type: "chat",
        channel_kind: "discussion",
        access_type: "inherit",
        sort_order: sortOrder,
        is_active: true,
        visibility: "members",
        last_activity_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();
    if (insertError && insertError.code !== "23505") {
      return { ok: false, error: "Could not add a channel.", status: 500 };
    }
    have.add(slug);
    ready.push(name);
    sortOrder += 1;
  }

  await adminDb.from("spaces").update({ room_count: have.size } as never).eq("id", seeded.spaceId);
  return { ok: true, channels: ready };
}
