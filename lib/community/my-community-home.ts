/**
 * Resolve the best "My Community" destination for the signed-in user.
 * Reuses Owner Console / manage routes — never invents /dashboard.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listManageableCommunities,
  manageCommunityHref,
  OWNER_CONSOLE_HUB,
} from "@/lib/community/owner-console";

export type MyCommunityHome = {
  href: string;
  label: string;
  mode: "manage_one" | "manage_hub" | "member" | "profile";
};

export async function resolveMyCommunityHome(
  supabase: SupabaseClient,
  userId: string,
  username?: string | null
): Promise<MyCommunityHome> {
  const manageable = await listManageableCommunities(supabase, userId);
  if (manageable.length === 1) {
    return {
      href: manageCommunityHref(manageable[0].slug),
      label: "My Community",
      mode: "manage_one",
    };
  }
  if (manageable.length > 1) {
    return {
      href: OWNER_CONSOLE_HUB,
      label: "My Communities",
      mode: "manage_hub",
    };
  }

  const { data: memberships } = await supabase
    .from("community_memberships")
    .select("community_id, communities!inner(slug, name, is_active)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(5);

  for (const row of memberships ?? []) {
    const community = row.communities as
      | { slug?: string; name?: string; is_active?: boolean | null }
      | { slug?: string; name?: string; is_active?: boolean | null }[]
      | null;
    const c = Array.isArray(community) ? community[0] : community;
    if (!c?.slug || c.is_active === false) continue;
    return {
      href: `/communities/${encodeURIComponent(c.slug)}`,
      label: "My Community",
      mode: "member",
    };
  }

  const profileHref = username?.trim()
    ? `/u/${encodeURIComponent(username.trim())}`
    : "/communities/profile";

  return {
    href: profileHref,
    label: "Community profile",
    mode: "profile",
  };
}
