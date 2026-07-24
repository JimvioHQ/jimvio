import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapModeratedMember,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";

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

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const kind = req.nextUrl.searchParams.get("kind")?.trim() ?? "muted";
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let query = admin
    .from("community_memberships")
    .select(
      "id, user_id, role, status, muted_until, timeout_until, suspended_until, ban_reason, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("community_id", communityId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (kind === "muted") {
    query = query.gt("muted_until", now);
  } else if (kind === "suspended") {
    query = query.or(`suspended_until.gt.${now},status.eq.suspended`);
  } else if (kind === "banned") {
    query = query.eq("status", "banned");
  } else {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    members: (data ?? []).map(mapModeratedMember),
  });
}
