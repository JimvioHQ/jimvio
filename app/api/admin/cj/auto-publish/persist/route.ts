import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateIntelligence } from "@/lib/cj/premium-intelligence/catalog-repository";

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
  const isAdminEmail = adminEmails.includes(user.email ?? "");

  return isAdminRole || isAdminEmail;
}

export async function POST(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    items?: Array<{
      pid: string;
      auto_publish_ready: boolean;
      auto_publish_score: number;
      auto_publish_status: string;
      auto_publish_failures: string[];
      pending_enrichment_reasons?: string[];
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ success: true, saved: 0 });
  }

  const now = new Date().toISOString();
  let saved = 0;

  const BATCH = 50;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (item) => {
        if (!item.pid) return;
        try {
          await updateIntelligence(item.pid, {
            auto_publish_ready: item.auto_publish_ready,
            auto_publish_score: item.auto_publish_score,
            auto_publish_status: item.auto_publish_status,
            auto_publish_failures: item.auto_publish_failures,
            pending_enrichment_reasons: item.pending_enrichment_reasons ?? [],
            last_auto_publish_check: now,
          });
          saved += 1;
        } catch {
          // Skip individual failures
        }
      })
    );
  }

  if (saved > 0) {
    const { queueReadyProductsFromIntel } = await import(
      "@/lib/cj/premium-intelligence/auto-publish-queue"
    );
    await queueReadyProductsFromIntel(Math.min(saved, 200)).catch(() => {});
  }

  return NextResponse.json({ success: true, saved });
}
