import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveMyCommunityHome } from "@/lib/community/my-community-home";

export const dynamic = "force-dynamic";

/** GET — canonical "My Community" destination for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const home = await resolveMyCommunityHome(
    supabase,
    user.id,
    profile?.username ?? null
  );

  return NextResponse.json(home);
}
