import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedGrowthEvent, trackGrowthEvent } from "@/services/growth/events";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.eventName !== "string" || !isAllowedGrowthEvent(body.eventName)) {
    return NextResponse.json({ error: "Invalid growth event" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await trackGrowthEvent(user?.id ?? null, body.eventName, typeof body.properties === "object" && body.properties ? body.properties : {});
  return NextResponse.json({ ok: true }, { status: 202 });
}
