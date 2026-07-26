import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { notifyAdminAnnouncement } from "@/lib/notifications/publishers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST — admin broadcast announcement.
 * Body: { title, message, actionUrl?, userIds?: string[], allActive?: boolean }
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const limited = rateLimit(`admin-announce:${gate.user.id}`, 10, 3_600_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    message?: string;
    actionUrl?: string;
    userIds?: string[];
    allActive?: boolean;
  } | null;

  if (!body?.title?.trim() || !body?.message?.trim()) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  let userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];

  if (body.allActive) {
    const admin = createServiceRoleClient() as any;
    const { data } = await admin
      .from("profiles")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(2000);
    userIds = (data ?? []).map((r: { id: string }) => r.id);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }

  const announcementId = `ann-${Date.now().toString(36)}`;
  const results = await notifyAdminAnnouncement({
    userIds,
    title: body.title.trim(),
    message: body.message.trim(),
    actionUrl: body.actionUrl,
    announcementId,
  });

  const delivered = results.filter((r) => r.ok && !r.skipped).length;
  return NextResponse.json({
    ok: true,
    announcementId,
    recipients: userIds.length,
    delivered,
  });
}
