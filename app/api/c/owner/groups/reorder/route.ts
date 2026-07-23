import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveGroupManageContext,
} from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

/** Reorder groups within a community. Body: { communityId, orderedIds: string[] } */
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
    orderedIds?: string[];
  };
  const communityId =
    typeof body.communityId === "string" ? body.communityId.trim() : "";
  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((id): id is string => typeof id === "string")
    : [];

  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
  }

  const ctx = await resolveGroupManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("spaces")
    .select("id")
    .eq("community_id", communityId)
    .in("id", orderedIds);

  const allowed = new Set((existing ?? []).map((r) => r.id));
  const updates = orderedIds
    .filter((id) => allowed.has(id))
    .map((id, index) =>
      admin.from("spaces").update({ sort_order: index }).eq("id", id)
    );

  await Promise.all(updates);

  return NextResponse.json({ ok: true, count: updates.length });
}
