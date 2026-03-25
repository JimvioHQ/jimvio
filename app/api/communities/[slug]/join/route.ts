import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinFreeCommunity } from "@/services/communityService";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("communities")
    .select("id, is_free")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  try {
    const membership = await joinFreeCommunity(user.id, community.id);
    return NextResponse.json({ membership });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Join failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
