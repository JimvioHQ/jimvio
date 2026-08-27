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
 * complete. Insert only after required Identity fields are filled. UPDATE
 * that affects zero rows is not a successful sync — INSERT instead.
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
 * Ensure the legacy `influencers` join-key exists for a COMPLETE Identity.
 * UPDATE if it exists (0 rows is not success). INSERT if it does not.
 * Never upsert-on-conflict. Never invent a second profile.
 */
export async function ensureInfluencerMirror(
  userId: string,
): Promise<InfluencerMirrorResult> {
  if (!userId) return { id: null, created: false, reason: "no-user" };
  const db = createServiceRoleClient();

  const [{ data: profile, error: profileErr }, { data: identity, error: jipErr }, { data: existing, error: existingErr }] =
    await Promise.all([
      db.from("profiles").select("id, bio, avatar_url, full_name, username").eq("id", userId).maybeSingle(),
      db.from("jip_identity").select("user_id, headline").eq("user_id", userId).maybeSingle(),
      db.from("influencers").select("id").eq("user_id", userId).maybeSingle(),
    ]);

  const completion = evaluateCreatorProfileCompletion({
    fullName: profile?.full_name,
    headline: identity?.headline,
    bio: profile?.bio,
  });

  logMirror({
    event: "ensure-start",
    userId,
    profile: Boolean(profile?.id),
    jip: Boolean(identity?.user_id),
    mirror: Boolean(existing?.id),
    complete: completion.complete,
    missing: completion.missing.map((m) => m.id),
    profileReadFailed: Boolean(profileErr),
    jipReadFailed: Boolean(jipErr),
    mirrorReadFailed: Boolean(existingErr),
  });

  if (!completion.complete) {
    return {
      id: existing?.id ?? null,
      created: false,
      reason: "incomplete",
    };
  }
  if (!profile?.id) {
    logMirror({ event: "no-profile", userId, reason: "no-profile" });
    return { id: null, created: false, reason: "no-profile" };
  }

  const payload = {
    display_name: identityDisplayName(profile),
    bio: profile.bio ?? null,
    profile_image: profile.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data: updated, error: updateErr } = await db
      .from("influencers")
      .update(payload)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (updateErr) {
      logMirror({
        event: "update-failed",
        userId,
        code: updateErr.code ?? null,
        message: updateErr.message,
      });
    }
    if (updated?.id) {
      logMirror({ event: "updated", userId, created: false, reason: "updated" });
      return { id: updated.id, created: false, reason: "updated" };
    }
    logMirror({ event: "update-zero-rows", userId, reason: "insert-fallback" });
  }

  const { data: inserted, error: insertErr } = await db
    .from("influencers")
    .insert({ user_id: userId, ...payload })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    logMirror({
      event: "insert-failed",
      userId,
      code: insertErr.code ?? null,
      message: insertErr.message,
    });
    if (insertErr.code === "23505") {
      const { data: raced } = await db
        .from("influencers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (raced?.id) {
        logMirror({ event: "recovered-unique", userId, created: false, reason: "existing" });
        return { id: raced.id, created: false, reason: "existing" };
      }
    }
  }

  if (inserted?.id) {
    logMirror({ event: "inserted", userId, created: true, reason: "inserted" });
    return { id: inserted.id, created: true, reason: "inserted" };
  }

  const { data: row } = await db.from("influencers").select("id").eq("user_id", userId).maybeSingle();
  if (row?.id) {
    logMirror({ event: "recovered", userId, created: false, reason: "recovered" });
    return { id: row.id, created: false, reason: "recovered" };
  }

  logMirror({ event: "missing-after-write", userId, reason: "insert-failed" });
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
    const ensured = await ensureInfluencerMirror(userId);
    if (ensured.id) synced.push("influencers");
    else if (ensured.reason !== "incomplete") errors.push(`influencers:${ensured.reason}`);
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
