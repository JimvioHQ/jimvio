/**
 * syncRoleMirrors — after a `profiles` update, mirror the handful of
 * duplicated display columns that role-specific tables (influencers,
 * affiliates) still read directly for legacy UI. This is purely additive
 * and MUST NOT become a second source of truth: `profiles` stays canonical
 * and this only copies values outward, never the other way around.
 *
 * Never throws — a mirror failure must not fail the originating request.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface RoleMirrorProfile {
  bio?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  website?: string | null;
}

export async function syncRoleMirrors(
  userId: string,
  profile?: RoleMirrorProfile
): Promise<{ synced: string[]; errors: string[] }> {
  const synced: string[] = [];
  const errors: string[] = [];
  if (!userId) return { synced, errors };

  const db = createServiceRoleClient();

  let source = profile;
  if (!source) {
    try {
      const { data } = await db
        .from("profiles")
        .select("bio, avatar_url, full_name, website")
        .eq("id", userId)
        .maybeSingle();
      source = data ?? undefined;
    } catch (err) {
      errors.push(`profiles:read:${(err as Error).message}`);
      return { synced, errors };
    }
  }
  if (!source) return { synced, errors };

  try {
    const { error } = await db
      .from("influencers")
      .update({
        bio: source.bio ?? null,
        profile_image: source.avatar_url ?? null,
        display_name: source.full_name ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) errors.push(`influencers:${error.message}`);
    else synced.push("influencers");
  } catch (err) {
    errors.push(`influencers:${(err as Error).message}`);
  }

  try {
    const { error } = await db
      .from("affiliates")
      .update({
        bio: source.bio ?? null,
        website: source.website ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) errors.push(`affiliates:${error.message}`);
    else synced.push("affiliates");
  } catch (err) {
    errors.push(`affiliates:${(err as Error).message}`);
  }

  return { synced, errors };
}
