import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { currentRequester } from "@/lib/trust/requester";

export const dynamic = "force-dynamic";

/** The signed-in person's recent checks. */
export async function GET(req: NextRequest) {
  const requester = await currentRequester(req.headers);
  if (!requester.userId) return NextResponse.json({ scans: [], authenticated: false });
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db
    .from("trust_scans")
    .select("id, input_url, file_name, overall_level, created_at")
    .eq("user_id", requester.userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "Scan history is temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ scans: data ?? [], authenticated: true });
}
