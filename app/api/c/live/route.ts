import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubLiveDashboard } from "@/services/community/hub-data";
import { getEmptyHubLiveDashboard } from "@/lib/community/hub-live-demo";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(getEmptyHubLiveDashboard());
  }

  const data = await getHubLiveDashboard(user.id);
  return NextResponse.json(data);
}
