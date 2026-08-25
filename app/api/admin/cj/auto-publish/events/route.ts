import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getCatalogDB } from "@/lib/cj/premium-intelligence/db";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    100,
    parseInt(new URL(req.url).searchParams.get("limit") ?? "50", 10) || 50
  );

  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_auto_publish_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, events: data ?? [] });
}
