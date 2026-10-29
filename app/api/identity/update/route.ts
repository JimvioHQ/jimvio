import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ugc/platform/auth";
import {
  evaluateBasicIdentity,
  isCreatorWorkspaceReady,
} from "@/lib/identity/creator-profile-completion";
import { cleanCategories } from "@/lib/identity/creator-categories";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import {
  ensureInfluencerMirror,
  loadCreatorProfileCompletion,
  syncRoleMirrors,
} from "@/lib/identity/sync";
import { ensureJipIdentity, getIdentityByUserId } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

const AVAILABILITY_VALUES = new Set(["open", "limited", "booked", "unavailable"]);
const PRIVACY_VALUES = new Set(["public", "private", "brand_only", "followers_only", "custom"]);

function logSave(payload: Record<string, unknown>) {
  console.info("[creator-profile-save]", payload);
}

/**
 * PATCH /api/identity/update
 * Body (flat, camelCase — matches `IdentityEditClient`'s `core` state):
 *   { fullName?, bio?, website?, country?, city?, language?, avatarUrl?,
 *     headline?, coverImage?, languages?, skills?, specialties?,
 *     availability?, availabilityNote?, contactPreferences?,
 *     privacyVisibility?, mediaKitUrl? }
 * Splits fields between `profiles` (source of truth) and `jip_identity`
 * (extensions), then mirrors a subset into role tables (influencers/affiliates).
 */
export async function PATCH(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const profileUpdates: Record<string, unknown> = {};
  if (typeof body.fullName === "string") profileUpdates.full_name = body.fullName.trim();
  if (typeof body.bio === "string") profileUpdates.bio = body.bio.trim();
  if (typeof body.website === "string") profileUpdates.website = body.website;
  if (typeof body.country === "string") {
    const trimmed = body.country.trim();
    profileUpdates.country = trimmed ? normalizeCountryCode(trimmed) ?? trimmed.slice(0, 60) : null;
  }
  if (typeof body.city === "string") profileUpdates.city = body.city;
  if (typeof body.language === "string") profileUpdates.language = body.language;
  if (typeof body.avatarUrl === "string") profileUpdates.avatar_url = body.avatarUrl;
  if (typeof body.username === "string") {
    const desired = body.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(desired)) {
      return NextResponse.json(
        { error: "Username must be 3–24 characters and use lowercase letters, numbers, or underscores." },
        { status: 400 },
      );
    }
    const { data: taken } = await db
      .from("profiles")
      .select("id")
      .ilike("username", desired)
      .neq("id", user.id)
      .maybeSingle();
    if (taken) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    profileUpdates.username = desired;
  }

  const identityUpdates: Record<string, unknown> = {};
  if (typeof body.headline === "string") identityUpdates.headline = body.headline.trim();
  if (typeof body.coverImage === "string") identityUpdates.cover_image = body.coverImage;
  if (Array.isArray(body.languages)) identityUpdates.languages = body.languages;
  if (Array.isArray(body.skills)) identityUpdates.skills = body.skills;
  if (Array.isArray(body.specialties)) identityUpdates.specialties = body.specialties;
  if (Array.isArray(body.equipment)) identityUpdates.equipment = body.equipment;
  if (Array.isArray(body.industries)) identityUpdates.industries = cleanCategories(body.industries);
  if (typeof body.availabilityNote === "string") identityUpdates.availability_note = body.availabilityNote;
  if (typeof body.mediaKitUrl === "string") identityUpdates.media_kit_url = body.mediaKitUrl;
  if (body.responseTimeHours !== undefined) {
    const hours = Number(body.responseTimeHours);
    if (!Number.isFinite(hours) || hours < 0) {
      return NextResponse.json({ error: "Invalid responseTimeHours value" }, { status: 400 });
    }
    identityUpdates.response_time_hours = hours;
  }
  if (body.contactPreferences && typeof body.contactPreferences === "object") {
    identityUpdates.contact_preferences = body.contactPreferences;
  }
  if (body.availability !== undefined) {
    if (!AVAILABILITY_VALUES.has(String(body.availability))) {
      return NextResponse.json({ error: "Invalid availability value" }, { status: 400 });
    }
    identityUpdates.availability = body.availability;
  }
  if (body.privacyVisibility !== undefined) {
    if (!PRIVACY_VALUES.has(String(body.privacyVisibility))) {
      return NextResponse.json({ error: "Invalid privacyVisibility value" }, { status: 400 });
    }
    identityUpdates.privacy_visibility = body.privacyVisibility;
  }
  if (body.privacyCustom && typeof body.privacyCustom === "object") {
    identityUpdates.privacy_custom = body.privacyCustom;
  }

  await ensureJipIdentity(user.id);

  if (Object.keys(profileUpdates).length > 0) {
    const { data: profileRow, error: profileErr } = await db
      .from("profiles")
      .update({ ...profileUpdates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    if (profileErr) {
      return NextResponse.json({ saved: false, error: profileErr.message }, { status: 400 });
    }
    if (!profileRow?.id) {
      logSave({ event: "profile-update-zero-rows", userId: user.id });
      return NextResponse.json(
        { saved: false, complete: false, error: "Profile could not be saved." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(identityUpdates).length > 0) {
    const { data: identityRow, error: identityErr } = await db
      .from("jip_identity")
      .update({ ...identityUpdates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();
    if (identityErr) {
      return NextResponse.json({ saved: false, error: identityErr.message }, { status: 400 });
    }
    if (!identityRow?.user_id) {
      await ensureJipIdentity(user.id);
      const { data: retried, error: retryErr } = await db
        .from("jip_identity")
        .update({ ...identityUpdates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select("user_id")
        .maybeSingle();
      if (retryErr || !retried?.user_id) {
        logSave({ event: "jip-update-zero-rows", userId: user.id });
        return NextResponse.json(
          { saved: false, complete: false, error: "Identity could not be saved." },
          { status: 400 },
        );
      }
    }
  }

  const completion = await loadCreatorProfileCompletion(user.id);
  const submitted = evaluateBasicIdentity({
    fullName: typeof body.fullName === "string" ? body.fullName.trim() : undefined,
    headline: typeof body.headline === "string" ? body.headline.trim() : undefined,
    bio: typeof body.bio === "string" ? body.bio.trim() : undefined,
  });
  const basicIds = new Set(["fullName", "headline", "bio"]);
  if (submitted.complete && completion.missing.some((m) => basicIds.has(m.id))) {
    logSave({
      event: "persist-mismatch",
      userId: user.id,
      missing: completion.missing.map((m) => m.id),
    });
    return NextResponse.json(
      {
        saved: false,
        complete: false,
        missing: completion.missing,
        error: "Profile fields did not persist. Try saving again.",
      },
      { status: 500 },
    );
  }

  const mirrorSync = await syncRoleMirrors(user.id);
  const mirror = completion.complete
    ? await ensureInfluencerMirror(user.id)
    : { id: null as string | null, created: false, reason: "incomplete" };

  const identity = await getIdentityByUserId(user.id, user.id);
  if (!identity) {
    return NextResponse.json({ saved: false, error: "Identity not found" }, { status: 404 });
  }

  const ready = isCreatorWorkspaceReady(completion, mirror);
  logSave({
    event: "saved",
    userId: user.id,
    profile: true,
    jip: true,
    mirror: Boolean(mirror.id),
    complete: ready,
    missing: completion.missing.map((m) => m.id),
    mirrorReason: mirror.reason,
    mirrorCreated: mirror.created,
    syncErrors: mirrorSync.errors,
  });

  if (completion.complete && !ready) {
    return NextResponse.json(
      {
        ...identity,
        saved: false,
        complete: false,
        needsProfile: true,
        missing: completion.missing,
        mirror: { ...mirror, sync: mirrorSync },
        error: "Creator workspace could not be synchronized. Try saving again.",
      },
      { status: 500 },
    );
  }

  revalidatePath("/identity/edit");
  revalidatePath("/settings/profile");
  revalidatePath("/settings/privacy");
  revalidatePath("/identity");
  revalidatePath("/ugc/applications");
  revalidatePath("/ugc");
  revalidatePath("/ugc/dashboard");
  revalidatePath("/ugc/calendar");
  revalidatePath("/ugc/achievements");
  revalidatePath("/ugc/matches");

  return NextResponse.json({
    ...identity,
    saved: true,
    complete: ready,
    needsProfile: !ready,
    missing: completion.missing,
    mirror: { ...mirror, sync: mirrorSync },
  });
}
