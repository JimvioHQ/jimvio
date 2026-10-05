/**
 * Canonical authorized Create Post destinations for a user.
 * Unique by community.id — never fan out owner-visible membership rows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PostDestination = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  /** 0 = owned, 1 = staff, 2 = member */
  priority: 0 | 1 | 2;
  role: string;
};

const STAFF_ROLES = new Set(["owner", "admin", "moderator"]);

type CommunityLite = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  is_active?: boolean | null;
};

/**
 * Communities the user may post into: owned + active memberships.
 * Deduped by community id. Owned first, then staff, then members.
 */
export async function getAuthorizedPostDestinations(
  supabase: SupabaseClient,
  userId: string
): Promise<PostDestination[]> {
  const byId = new Map<string, PostDestination>();

  const { data: owned, error: ownedErr } = await supabase
    .from("communities")
    .select("id, name, slug, avatar_url, is_active")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (!ownedErr) {
    for (const c of (owned ?? []) as CommunityLite[]) {
      if (!c?.id) continue;
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        slug: c.slug,
        avatarUrl: c.avatar_url,
        priority: 0,
        role: "owner",
      });
    }
  }

  const { data: memberships, error: mErr } = await supabase
    .from("community_memberships")
    .select(
      "role, community_id, created_at, communities!inner(id, name, slug, avatar_url, is_active)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!mErr) {
    for (const row of memberships ?? []) {
      const community = row.communities as unknown as
        | CommunityLite
        | CommunityLite[]
        | null;
      const c = Array.isArray(community) ? community[0] : community;
      if (!c?.id || c.is_active === false || byId.has(c.id)) continue;
      const role = String(row.role || "member");
      const priority: 0 | 1 | 2 = STAFF_ROLES.has(role) ? 1 : 2;
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        slug: c.slug,
        avatarUrl: c.avatar_url,
        priority,
        role,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
}

/** Pick default destination: preferred slug → owned → first authorized. */
export function pickDefaultPostDestination(
  destinations: PostDestination[],
  preferredSlug?: string | null
): PostDestination | null {
  if (!destinations.length) return null;
  const slug = preferredSlug?.trim().toLowerCase();
  if (slug) {
    const match = destinations.find((d) => d.slug.toLowerCase() === slug);
    if (match) return match;
  }
  return destinations.find((d) => d.priority === 0) ?? destinations[0] ?? null;
}
