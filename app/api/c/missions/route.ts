import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubMissions } from "@/services/community/hub-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const missions = await getHubMissions(user.id);
  return NextResponse.json({ missions });
}
