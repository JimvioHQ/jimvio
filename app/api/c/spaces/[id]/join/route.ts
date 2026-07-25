import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getUserMembership,
  isMembershipActive,
} from "@/services/communityService";
import { canAccessSpace } from "@/services/accessControl";
import { grantSpaceAccess } from "@/lib/community/space-access";

export const dynamic = "force-dynamic";

/**
 * Member self-join for a Group (`spaces` row).
 * Requires active community membership; grants `space_access` for this space.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: spaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, community_id, name, member_count, is_active, access_type")
    .eq("id", spaceId)
    .maybeSingle();

  if (!space || space.is_active === false) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { data: community } = await admin
    .from("communities")
    .select("owner_id")
    .eq("id", space.community_id)
    .maybeSingle();

  const membership = await getUserMembership(user.id, space.community_id);
  if (!membership || !isMembershipActive(membership)) {
    return NextResponse.json(
      {
        error: "Join the community first",
        code: "community_membership_required",
      },
      { status: 403 }
    );
  }

  const already =
    community?.owner_id === user.id ||
    (await canAccessSpace(user.id, spaceId));

  if (already) {
    // Still ensure premium groups have an explicit space_access entry when needed.
    const access = membership.space_access ?? [];
    const needsExplicit =
      String(space.access_type).toLowerCase() === "premium" &&
      !(membership.plan_type === "yearly" || membership.plan_type === "lifetime") &&
      !access.map(String).includes(String(spaceId));

    if (!needsExplicit) {
      return NextResponse.json({
        ok: true,
        alreadyJoined: true,
        spaceAccess: membership.space_access ?? [],
      });
    }
  }

  const nextAccess = grantSpaceAccess(membership.space_access, spaceId);
  const now = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("community_memberships")
    .update({ space_access: nextAccess, updated_at: now })
    .eq("id", membership.id)
    .select("id, space_access, status, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const nextCount = (space.member_count ?? 0) + 1;
  await admin
    .from("spaces")
    .update({ member_count: nextCount })
    .eq("id", spaceId);

  return NextResponse.json({
    ok: true,
    alreadyJoined: false,
    membership: updated,
    spaceAccess: updated.space_access ?? nextAccess,
  });
}
