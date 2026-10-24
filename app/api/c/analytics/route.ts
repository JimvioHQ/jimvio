import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";
import { getHubAnalytics } from "@/services/community/hub-data";

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
    const data = await getHubAnalytics(user.id);
    return NextResponse.json(data);
  } catch (error) {
    logCommunityFailure("analytics.get", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Could not load analytics") },
      { status: 500 },
    );
  }
}
