import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { getAdminDB } from "@/services/base";
import { buildWeeklyCreatorReportSummary, getNotificationPreferences, sendDigestEmail } from "@/services/growth/retention";

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
  const { data: users, error } = await (getAdminDB() as any)
    .from("notification_preferences")
    .select("user_id")
    .eq("email_weekly_digest", true)
    .limit(500);
  if (error) return NextResponse.json({ error: "Unable to load recipients" }, { status: 500 });

  if (!send) return NextResponse.json({ dryRun: true, recipients: users?.length ?? 0 });

  let queued = 0;
  for (const { user_id: userId } of users ?? []) {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences.email_weekly_digest) continue;
    await sendDigestEmail(userId, await buildWeeklyCreatorReportSummary(userId));
    queued += 1;
  }
  return NextResponse.json({ dryRun: false, queued });
}
