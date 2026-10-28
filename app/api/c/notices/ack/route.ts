import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NOTICES = new Set(["financial-risk"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST — record that the signed-in member has seen a one-time community
 * notice. Returns `firstTime: true` only the first time, so the notice is
 * shown once per member per community, on any device.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { communityId?: string; notice?: string } | null;
  const communityId = body?.communityId ?? "";
  const notice = body?.notice ?? "";
  if (!UUID.test(communityId) || !NOTICES.has(notice)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, firstTime: null });

  // Table added in 20261028221812_community_notice_acks (not in generated types yet).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as unknown as { from: (table: string) => any };
  const { data, error } = await db
    .from("community_notice_acks")
    .upsert(
      { user_id: user.id, community_id: communityId, notice },
      { onConflict: "user_id,community_id,notice", ignoreDuplicates: true },
    )
    .select("seen_at");
  if (error) {
    // Never block the page on this; the client falls back to device memory.
    return NextResponse.json({ signedIn: true, firstTime: null }, { status: 200 });
  }
  return NextResponse.json({ signedIn: true, firstTime: (data ?? []).length > 0 });
}
