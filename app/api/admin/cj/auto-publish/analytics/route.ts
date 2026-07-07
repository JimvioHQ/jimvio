import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeAutoPublishAnalytics,
  getLatestAutoPublishAnalytics,
} from "@/lib/cj/premium-intelligence/auto-publish-analytics";

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

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const analytics = refresh
    ? await computeAutoPublishAnalytics()
    : (await getLatestAutoPublishAnalytics()) ?? (await computeAutoPublishAnalytics());

  return NextResponse.json({ success: true, analytics });
}
