import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveChannelManageContext } from "@/lib/community/owner-console/channels";

export const dynamic = "force-dynamic";

/** Reorder channels. Body: { communityId, groupId?, orderedIds: string[] } */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    groupId?: string;
    orderedIds?: string[];
  };
  const communityId =
    typeof body.communityId === "string" ? body.communityId.trim() : "";
  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((id): id is string => typeof id === "string")
    : [];

  if (!communityId || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "communityId and orderedIds are required" },
      { status: 400 }
    );
  }

  const ctx = await resolveChannelManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  let query = admin
    .from("rooms")
    .select("id")
    .eq("community_id", communityId)
    .in("id", orderedIds);
  if (typeof body.groupId === "string" && body.groupId.trim()) {
    query = query.eq("space_id", body.groupId.trim());
  }
  const { data: existing } = await query;
  const allowed = new Set((existing ?? []).map((r) => r.id));

  await Promise.all(
    orderedIds
      .filter((id) => allowed.has(id))
      .map((id, index) =>
        admin.from("rooms").update({ sort_order: index }).eq("id", id)
      )
  );

  return NextResponse.json({ ok: true });
}
