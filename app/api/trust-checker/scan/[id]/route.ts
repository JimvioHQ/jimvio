import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { currentRequester } from "@/lib/trust/requester";
import { publicReport, shareSecret, verifyShareToken } from "@/lib/trust/share-token";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * A scan report. The person who ran it can always open it. Anyone else needs a
 * valid share token (`?share=`) that the owner created with the Share button.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  const share = req.nextUrl.searchParams.get("share");
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (share) {
    const secret = shareSecret();
    if (!secret) return NextResponse.json({ error: "Shared results are temporarily unavailable." }, { status: 503, headers: NO_STORE });
    const check = verifyShareToken(id, share, Date.now(), secret);
    if (!check.ok) {
      return check.reason === "expired"
        ? NextResponse.json({ error: "This share link has expired. Ask the person who shared it for a new link." }, { status: 410, headers: NO_STORE })
        : NextResponse.json({ error: "This share link is not valid." }, { status: 404, headers: NO_STORE });
    }
    const { data, error } = await db.from("trust_scans").select("report").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: "Scan report is temporarily unavailable." }, { status: 503, headers: NO_STORE });
    if (!data?.report) return NextResponse.json({ error: "This shared result no longer exists." }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ report: publicReport(data.report), shared: { expiresAt: check.expiresAt } }, { headers: { ...NO_STORE, "X-Robots-Tag": "noindex, nofollow" } });
  }

  const requester = await currentRequester(req.headers);
  const { data, error } = await db.from("trust_scans").select("user_id, requester_hash, report").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Scan report is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  const mine = data && (data.user_id ? data.user_id === requester.userId : data.requester_hash === requester.hash);
  if (!mine) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ report: data.report }, { headers: NO_STORE });
}
