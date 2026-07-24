import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  COMMUNITY_SETTINGS_SELECT,
  asCommunitySettingsRow,
  canPerformDangerAction,
  mapCommunitySettings,
  resolveSettingsContext,
} from "@/lib/community/owner-console/settings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    action?: string;
    confirmSlug?: string;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  if (!communityId || !action) {
    return NextResponse.json(
      { error: "communityId and action are required" },
      { status: 400 }
    );
  }

  const ctx = await resolveSettingsContext(
    supabase,
    user.id,
    communityId,
    "settings.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (
    !canPerformDangerAction({
      actorRole: ctx.role,
      actorUserId: user.id,
      ownerId: ctx.ownerId,
      action,
    })
  ) {
    return NextResponse.json(
      { error: "Only the community owner can perform this action" },
      { status: 403 }
    );
  }

  if (action === "transfer") {
    return NextResponse.json({
      ok: false,
      accepted: false,
      message: "Ownership transfer is future-ready",
    });
  }

  const admin = createServiceRoleClient();
  const { data: community } = await admin
    .from("communities")
    .select(COMMUNITY_SETTINGS_SELECT)
    .eq("id", communityId)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const mapped = mapCommunitySettings(asCommunitySettingsRow(community));
  const now = new Date().toISOString();

  if (action === "archive") {
    const { data, error } = await admin
      .from("communities")
      .update({
        is_active: false,
        archived_at: now,
        archived_by: user.id,
        updated_at: now,
      })
      .eq("id", communityId)
      .select(COMMUNITY_SETTINGS_SELECT)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Archive failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      settings: mapCommunitySettings(asCommunitySettingsRow(data)),
    });
  }

  if (action === "restore") {
    const { data, error } = await admin
      .from("communities")
      .update({
        is_active: true,
        archived_at: null,
        archived_by: null,
        updated_at: now,
      })
      .eq("id", communityId)
      .select(COMMUNITY_SETTINGS_SELECT)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Restore failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      settings: mapCommunitySettings(asCommunitySettingsRow(data)),
    });
  }

  if (action === "delete") {
    const confirm = body.confirmSlug?.trim() ?? "";
    if (confirm !== mapped.slug) {
      return NextResponse.json(
        { error: "Type the community slug to confirm deletion" },
        { status: 400 }
      );
    }
    // Soft-delete: archive permanently rather than hard delete to protect data
    const { data, error } = await admin
      .from("communities")
      .update({
        is_active: false,
        archived_at: now,
        archived_by: user.id,
        updated_at: now,
        slug: `${mapped.slug}-deleted-${Date.now().toString(36)}`,
      })
      .eq("id", communityId)
      .select(COMMUNITY_SETTINGS_SELECT)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Delete failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      deleted: true,
      settings: mapCommunitySettings(asCommunitySettingsRow(data)),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
