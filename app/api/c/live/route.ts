import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubLiveDashboard } from "@/services/community/hub-data";
import { getEmptyHubLiveDashboard } from "@/lib/community/hub-live-demo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(getEmptyHubLiveDashboard());
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim() || null;
  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() || null;

  const data = await getHubLiveDashboard(user.id, {
    communitySlug: slug,
    communityId,
  });
  return NextResponse.json(data);
}
