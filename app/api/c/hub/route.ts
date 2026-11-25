import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubDashboard } from "@/services/community/hub-data";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getHubDashboard(user.id);
    return NextResponse.json(data);
  } catch (error) {
    logCommunityFailure("hub.dashboard", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Could not load Community dashboard") },
      { status: 503 },
    );
  }
}
