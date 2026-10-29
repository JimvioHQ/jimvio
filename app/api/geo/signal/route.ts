import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordCountrySignal } from "@/lib/geo/country-trust-server";

export const dynamic = "force-dynamic";

/**
 * Daily country check-in from the browser: the server reads the network
 * country from the edge, the browser sends only its clock offset and zone.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as { offsetMinutes?: unknown; timeZone?: unknown };
  try {
    const decision = await recordCountrySignal(user.id, req.headers, body);
    return NextResponse.json({ confidence: decision.confidence });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
