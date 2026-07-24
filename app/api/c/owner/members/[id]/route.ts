import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  MEMBERSHIP_SELECT,
  asMembershipRow,
  mapMembershipToOwnerMember,
  mapModerationLogRow,
  mapNoteRow,
  resolveMemberManageContext,
} from "@/lib/community/owner-console/members";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const row = asMembershipRow(data)!;
  const includeEmail = hasCapability(ctx.role, "members.manage");
  const member = mapMembershipToOwnerMember(row, { includeEmail });

  const [{ data: notes }, { data: logs }] = await Promise.all([
    admin
      .from("community_member_notes")
      .select(
        "id, body, author_id, created_at, profiles:author_id(full_name, username, avatar_url)"
      )
      .eq("membership_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("community_moderation_logs")
      .select(
        "id, action, reason, moderator_id, created_at, profiles:moderator_id(full_name, username, avatar_url)"
      )
      .eq("community_id", communityId)
      .eq("target_user_id", row.user_id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    member: {
      ...member,
      notes: (notes ?? []).map(mapNoteRow),
      moderationHistory: (logs ?? []).map(mapModerationLogRow),
      communitiesCount: 1,
    },
  });
}
