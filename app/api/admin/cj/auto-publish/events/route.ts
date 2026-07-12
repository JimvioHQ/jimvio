import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCatalogDB } from "@/lib/cj/premium-intelligence/db";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdminRole = roles?.some((r) => r.role === "admin") ?? false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return isAdminRole || adminEmails.includes(user.email ?? "");
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
