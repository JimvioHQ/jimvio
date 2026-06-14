import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubEarnings, getHubWallet } from "@/services/community/hub-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [wallet, earnings] = await Promise.all([
    getHubWallet(user.id),
    getHubEarnings(user.id),
  ]);

  return NextResponse.json({ wallet, earnings });
}
