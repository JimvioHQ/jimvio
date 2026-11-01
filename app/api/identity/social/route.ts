import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { toSocialAccount } from "@/lib/identity/resolve";
import type { SocialAccount } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set([
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
  "website",
]);

/**
 * GET /api/identity/social?userId=... — public list of a user's social accounts.
 * Defaults to the current authenticated user when userId is omitted.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const { user } = await requireUser();
  let targetId = userId;

  if (!targetId) {
    if (!user) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    targetId = user.id;
  }

  const isSelf = Boolean(user && user.id === targetId);
  const db = createServiceRoleClient();
  let query = db
    .from("jip_social_accounts")
    .select("*")
    .eq("user_id", targetId)
    .order("followers", { ascending: false });

  // A public lookup never returns private or unverified social accounts.
  // The owner can still retrieve every account in their own settings.
  if (!isSelf) {
    query = query.eq("is_public", true).or("is_verified.eq.true,platform.eq.website");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: ((data ?? []) as SocialAccount[]).map(toSocialAccount) });
}

/**
 * POST /api/identity/social
 * Body: { platform, handle?, url?, followers?, avgViews?, engagementRate? }
 * Upserts (user_id, platform) is unique — repeated POSTs update the account.
 */
export async function POST(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform ?? "").toLowerCase();
  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid or missing platform" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    platform,
    handle: typeof body.handle === "string" ? body.handle.trim() : null,
    url: typeof body.url === "string" ? body.url.trim() : null,
    followers: Number.isFinite(Number(body.followers)) ? Math.max(0, Number(body.followers)) : 0,
    avg_views: Number.isFinite(Number(body.avgViews)) ? Math.max(0, Number(body.avgViews)) : 0,
    engagement_rate: Number.isFinite(Number(body.engagementRate))
      ? Math.max(0, Number(body.engagementRate))
      : 0,
    is_public: body.isPublic === false ? false : true,
    metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
  };

  const { data, error: upsertErr } = await db
    .from("jip_social_accounts")
    .upsert(payload, { onConflict: "user_id,platform" })
    .select("*")
    .single();

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });
  return NextResponse.json({ account: toSocialAccount(data as SocialAccount) }, { status: 201 });
}

/**
 * PATCH /api/identity/social
 * Body: { id, handle?, url?, followers?, avgViews?, engagementRate?, metadata? }
 */
export async function PATCH(req: NextRequest) {
  const { user, db: rawDb, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const db = rawDb as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.handle === "string") updates.handle = body.handle.trim();
  if (typeof body.url === "string") updates.url = body.url.trim();
  if (body.followers !== undefined) updates.followers = Math.max(0, Number(body.followers) || 0);
  if (body.avgViews !== undefined) updates.avg_views = Math.max(0, Number(body.avgViews) || 0);
  if (body.engagementRate !== undefined) {
    updates.engagement_rate = Math.max(0, Number(body.engagementRate) || 0);
  }
  if (typeof body.isPublic === "boolean") updates.is_public = body.isPublic;
  if (typeof body.metadata === "object" && body.metadata !== null) updates.metadata = body.metadata;

  const { data, error: updateErr } = await db
    .from("jip_social_accounts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ account: toSocialAccount(data as SocialAccount) });
}

/**
 * DELETE /api/identity/social?id=...
 */
export async function DELETE(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error: deleteErr } = await db
    .from("jip_social_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
