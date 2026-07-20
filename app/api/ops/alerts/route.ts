import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { getAdminDB } from "@/services/base";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { data, error } = await (getAdminDB() as any)
    .from("ops_alert_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Unable to load alerts" }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}
