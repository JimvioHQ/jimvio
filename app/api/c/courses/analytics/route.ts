import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership } from "@/services/communityService";
import { getCourseAnalytics } from "@/lib/community/courses/analytics";

export const dynamic = "force-dynamic";

/** GET /api/c/courses/analytics?communityId= */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim();
  if (!communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: community } = await admin
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .maybeSingle();
  const membership = await getUserMembership(user.id, communityId);
  const staff =
    community?.owner_id === user.id ||
    (membership?.status === "active" &&
      ["owner", "admin", "moderator", "creator"].includes(membership?.role ?? ""));
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const analytics = await getCourseAnalytics({ communityId });
  return NextResponse.json({ analytics });
}
