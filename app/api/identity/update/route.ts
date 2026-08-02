import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { syncRoleMirrors } from "@/lib/identity/sync";
import { ensureJipIdentity, getIdentityByUserId } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

const AVAILABILITY_VALUES = new Set(["open", "limited", "booked", "unavailable"]);
const PRIVACY_VALUES = new Set(["public", "private", "brand_only", "followers_only", "custom"]);

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
  if (typeof body.bio === "string") profileUpdates.bio = body.bio;
  if (typeof body.website === "string") profileUpdates.website = body.website;
  if (typeof body.country === "string") profileUpdates.country = body.country;
  if (typeof body.city === "string") profileUpdates.city = body.city;
  if (typeof body.language === "string") profileUpdates.language = body.language;
  if (typeof body.avatarUrl === "string") profileUpdates.avatar_url = body.avatarUrl;
  if (typeof body.username === "string") {
    const desired = body.username.trim().toLowerCase();
    if (desired.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
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
  if (typeof body.headline === "string") identityUpdates.headline = body.headline;
  if (typeof body.coverImage === "string") identityUpdates.cover_image = body.coverImage;
  if (Array.isArray(body.languages)) identityUpdates.languages = body.languages;
  if (Array.isArray(body.skills)) identityUpdates.skills = body.skills;
  if (Array.isArray(body.specialties)) identityUpdates.specialties = body.specialties;
  if (Array.isArray(body.equipment)) identityUpdates.equipment = body.equipment;
  if (Array.isArray(body.industries)) identityUpdates.industries = body.industries;
  if (typeof body.availabilityNote === "string") identityUpdates.availability_note = body.availabilityNote;
  if (typeof body.mediaKitUrl === "string") identityUpdates.media_kit_url = body.mediaKitUrl;
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

  await ensureJipIdentity(user.id);

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileErr } = await db
      .from("profiles")
      .update({ ...profileUpdates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }
  }

  if (Object.keys(identityUpdates).length > 0) {
    const { error: identityErr } = await db
      .from("jip_identity")
      .update({ ...identityUpdates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (identityErr) {
      return NextResponse.json({ error: identityErr.message }, { status: 400 });
    }
  }

  // Additive, best-effort mirror — never fails the request.
  const mirror = await syncRoleMirrors(user.id);

  const identity = await getIdentityByUserId(user.id, user.id);
  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  return NextResponse.json({ ...identity, mirror });
}
