import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExperimentVariant, trackExperimentExposure, type ExperimentVariant } from "@/lib/growth/experiments";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ variant: "control" });
  return NextResponse.json({ variant: await getExperimentVariant(key, user.id) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.key !== "string" || !["control", "variant"].includes(body.variant)) {
    return NextResponse.json({ error: "key and variant are required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await trackExperimentExposure(user.id, body.key, body.variant as ExperimentVariant);
  return NextResponse.json({ ok: true }, { status: 202 });
}
