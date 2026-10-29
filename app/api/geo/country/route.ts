import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAccountCountry } from "@/lib/geo/country-trust-server";

export const dynamic = "force-dynamic";

/** The signed-in person's country as Jimvio records it. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const c = await loadAccountCountry(user.id);
  return NextResponse.json({
    country: c.declared,
    locked: c.locked,
    source: c.source,
    confidence: c.confidence,
    vpnSuspected: c.vpnSuspected,
  });
}
