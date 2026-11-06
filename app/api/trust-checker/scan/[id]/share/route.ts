import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { currentRequester } from "@/lib/trust/requester";
import { createShareToken, shareSecret } from "@/lib/trust/share-token";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Creates an expiring share link for a scan. Only the person who ran the scan can create one. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  const secret = shareSecret();
  if (!secret) return NextResponse.json({ error: "Sharing is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  const requester = await currentRequester(req.headers);
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await db.from("trust_scans").select("user_id, requester_hash").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Sharing is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  const mine = data && (data.user_id ? data.user_id === requester.userId : data.requester_hash === requester.hash);
  if (!mine) return NextResponse.json({ error: "Only the person who ran this check can share it." }, { status: 404, headers: NO_STORE });
  const { token, expiresAt } = createShareToken(id, Date.now(), secret);
  const path = `/trust-checker?scan=${encodeURIComponent(id)}&share=${encodeURIComponent(token)}`;
  return NextResponse.json({ path, expiresAt }, { headers: NO_STORE });
}
