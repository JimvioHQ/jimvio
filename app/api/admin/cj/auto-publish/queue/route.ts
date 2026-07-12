import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAutoPublishQueue } from "@/lib/cj/premium-intelligence/auto-publish-queue";
import { AUTO_PUBLISH_WORKER_BATCH_SIZE } from "@/lib/cj/premium-intelligence/system-publish";

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

export async function POST() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
  return NextResponse.json({ success: true, result });
}
