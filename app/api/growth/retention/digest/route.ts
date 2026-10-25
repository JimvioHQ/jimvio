import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { getAdminDB } from "@/services/base";
import { classifyDigestResult } from "@/services/growth/digest";
import { buildWeeklyCreatorReportSummary, sendDigestEmail, weeklyDigestConsent } from "@/services/growth/retention";

export async function POST(request: Request) {
  const hasCronCredentials = Boolean(request.headers.get("authorization") || request.headers.get("x-cron-secret"));
  if (hasCronCredentials) {
    const cronError = assertCronAuthorized(request);
    if (cronError) return cronError;
  } else {
    const admin = await requirePlatformAdmin();
    if ("error" in admin) return admin.error;
  }

  const send = new URL(request.url).searchParams.get("send") === "1";
  const { data: users, error } = await getAdminDB()
    .from("notification_preferences")
    .select("user_id")
    .eq("email_weekly_digest", true)
    .limit(500);
  if (error) return NextResponse.json({ error: "Unable to load recipients" }, { status: 500 });

  if (!send) return NextResponse.json({ dryRun: true, recipients: users?.length ?? 0 });

  let queued = 0;
  let duplicates = 0;
  let skipped = 0;
  let failed = 0;
  for (const { user_id: userId } of users ?? []) {
    try {
      const allowed = await weeklyDigestConsent(userId);
      if (!allowed) {
        skipped += 1;
        continue;
      }
      const result = await sendDigestEmail(userId, await buildWeeklyCreatorReportSummary(userId));
      const outcome = classifyDigestResult(result);
      if (outcome === "sent") queued += 1;
      else if (outcome === "duplicate") duplicates += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ dryRun: false, queued, duplicates, skipped, failed });
}
