import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  COMMUNITY_SETTINGS_SELECT,
  asCommunitySettingsRow,
  mapCommunitySettings,
  resolveSettingsContext,
} from "@/lib/community/owner-console/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  let ctx = await resolveSettingsContext(
    supabase,
    user.id,
    communityId,
    "security.manage"
  );
  if ("error" in ctx) {
    ctx = await resolveSettingsContext(
      supabase,
      user.id,
      communityId,
      "settings.manage"
    );
  }
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const [{ data: community }, { count: members }, { count: spaces }, { count: rooms }] =
    await Promise.all([
      admin
        .from("communities")
        .select(COMMUNITY_SETTINGS_SELECT)
        .eq("id", communityId)
        .maybeSingle(),
      admin
        .from("community_memberships")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId),
      admin
        .from("spaces")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId),
      admin
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("community_id", communityId),
    ]);

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const settings = mapCommunitySettings(asCommunitySettingsRow(community));

  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    communityId,
    counts: {
      members: members ?? 0,
      groups: spaces ?? 0,
      channels: rooms ?? 0,
    },
    settings,
  });
}
