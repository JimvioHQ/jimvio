import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeMarketplaceIntelligenceAnalytics } from "@/lib/marketplace/intelligence-v4/analytics";

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

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await computeMarketplaceIntelligenceAnalytics();
  return NextResponse.json({ success: true, analytics });
}
