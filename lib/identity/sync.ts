/**
 * syncRoleMirrors — after a `profiles` update, mirror the handful of
 * duplicated display columns that role-specific tables (influencers,
 * affiliates) still read directly for legacy UI. This is purely additive
 * and MUST NOT become a second source of truth: `profiles` stays canonical
 * and this only copies values outward, never the other way around.
 *
 * Never throws — a mirror failure must not fail the originating request.
 *
 * The influencers row is the UGC join-key, not proof the creator profile is
 * complete. Insert it only after Identity required fields are filled.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  evaluateCreatorProfileCompletion,
  type CreatorProfileCompletion,
} from "@/lib/identity/creator-profile-completion";

export interface RoleMirrorProfile {
  bio?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  website?: string | null;
  headline?: string | null;
}

export type InfluencerMirrorResult = {
  id: string | null;
  created: boolean;
  reason: string;
};

export function identityDisplayName(profile: {
  full_name?: string | null;
  username?: string | null;
}): string {
  return profile.full_name?.trim() || profile.username?.trim() || "Creator";
}

export function isIdentityReadyForCreatorMirror(profile: {
  full_name?: string | null;
  username?: string | null;
  headline?: string | null;
  bio?: string | null;
}): boolean {
  return evaluateCreatorProfileCompletion({
    fullName: profile.full_name,
    headline: profile.headline,
    bio: profile.bio,
  }).complete;
}

function logMirror(payload: Record<string, unknown>) {
  console.info("[ugc-influencer-mirror]", payload);
}

export async function loadCreatorProfileCompletion(
  userId: string,
): Promise<CreatorProfileCompletion> {
  if (!userId) {
    return evaluateCreatorProfileCompletion({});
  }
  const db = createServiceRoleClient();
  const [{ data: profile }, { data: identity }] = await Promise.all([
    db.from("profiles").select("full_name, bio").eq("id", userId).maybeSingle(),
    db.from("jip_identity").select("headline").eq("user_id", userId).maybeSingle(),
  ]);
  return evaluateCreatorProfileCompletion({
    fullName: profile?.full_name,
    headline: identity?.headline,
    bio: profile?.bio,
  });
}

/**
 * Ensure the legacy `influencers` join-key row exists for a COMPLETE Identity.
 * Does not invent a second profile — copies display fields from `profiles`.
 * Incomplete identities are not auto-inserted.
 */
export async function ensureInfluencerMirror(
  userId: string,
): Promise<InfluencerMirrorResult> {
  if (!userId) return { id: null, created: false, reason: "no-user" };
  const db = createServiceRoleClient();

  const { data: existing, error: existingErr } = await db
    .from("influencers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingErr) {
    logMirror({
      event: "select-existing-failed",
      userId,
      code: existingErr.code ?? null,
      message: existingErr.message,
    });
  }

  const completion = await loadCreatorProfileCompletion(userId);
  if (!completion.complete) {
    logMirror({
      event: "incomplete",
      userId,
      missing: completion.missing.map((m) => m.id),
    });
    return {
      id: existing?.id ?? null,
      created: false,
      reason: "incomplete",
    };
  }

  if (existing?.id) {
    return { id: existing.id, created: false, reason: "existing" };
  }

  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("bio, avatar_url, full_name, username")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    logMirror({
      event: "select-profile-failed",
      userId,
      code: profileErr.code ?? null,
      message: profileErr.message,
    });
    return { id: null, created: false, reason: "profile-read-failed" };
  }
  if (!profile) {
    logMirror({ event: "no-profile", userId, reason: "no-profile" });
    return { id: null, created: false, reason: "no-profile" };
  }

  const now = new Date().toISOString();
  const { error } = await db.from("influencers").upsert(
    {
      user_id: userId,
      display_name: identityDisplayName(profile),
      bio: profile.bio ?? null,
      profile_image: profile.avatar_url ?? null,
      updated_at: now,
    },
    { onConflict: "user_id", ignoreDuplicates: false },
  );

  if (error) {
    logMirror({
      event: "upsert-failed",
      userId,
      code: error.code ?? null,
      message: error.message,
    });
  }

  const { data: row, error: reloadErr } = await db
    .from("influencers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (reloadErr) {
    logMirror({
      event: "reload-failed",
      userId,
      code: reloadErr.code ?? null,
      message: reloadErr.message,
    });
  }
  if (row?.id) {
    logMirror({
      event: error ? "recovered-after-upsert-error" : "ensured",
      userId,
      created: true,
      reason: error ? "recovered" : "upserted",
    });
    return {
      id: row.id,
      created: true,
      reason: error ? "recovered" : "upserted",
    };
  }

  logMirror({ event: "missing-after-upsert", userId, reason: "insert-failed" });
  return { id: null, created: false, reason: "insert-failed" };
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
        .select("bio, avatar_url, full_name, username, website")
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
    const { data: existing } = await db
      .from("influencers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      bio: source.bio ?? null,
      profile_image: source.avatar_url ?? null,
      display_name: identityDisplayName(source),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await db.from("influencers").update(payload).eq("user_id", userId);
      if (error) errors.push(`influencers:${error.message}`);
      else synced.push("influencers");
    } else {
      const ensured = await ensureInfluencerMirror(userId);
      if (ensured.id) synced.push("influencers");
      else if (ensured.reason === "incomplete") {
        /* join-key is created only after required Identity fields are saved */
      } else errors.push(`influencers:${ensured.reason}`);
    }
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
