import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { currentRequester } from "@/lib/trust/requester";

export const dynamic = "force-dynamic";

/** A scan report, only for the person who ran it. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const requester = await currentRequester(req.headers);
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db.from("trust_scans").select("user_id, requester_hash, report").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Scan report is temporarily unavailable." }, { status: 503 });
  const mine = data && (data.user_id ? data.user_id === requester.userId : data.requester_hash === requester.hash);
  if (!mine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report: data.report });
}
