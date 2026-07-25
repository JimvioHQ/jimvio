import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubEvents } from "@/services/community/hub-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communitySlug = req.nextUrl.searchParams.get("community")?.trim() || undefined;
  const events = await getHubEvents(user.id, { communitySlug });
  return NextResponse.json({ events });
}
