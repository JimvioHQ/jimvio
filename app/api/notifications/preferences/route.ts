import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformPreferences,
  upsertPlatformPreferences,
} from "@/lib/notifications/preferences";
import { isNotificationCategory } from "@/lib/notifications/categories";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getPlatformPreferences(user.id));
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const boolKeys = [
    "email_daily",
    "email_weekly_digest",
    "email_achievements",
    "email_reengagement",
    "push_enabled",
    "email_enabled",
    "sms_enabled",
    "quiet_hours_enabled",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of boolKeys) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (typeof body.quiet_hours_start === "string" || body.quiet_hours_start === null) {
    patch.quiet_hours_start = body.quiet_hours_start;
  }
  if (typeof body.quiet_hours_end === "string" || body.quiet_hours_end === null) {
    patch.quiet_hours_end = body.quiet_hours_end;
  }
  if (typeof body.quiet_hours_timezone === "string") {
    patch.quiet_hours_timezone = body.quiet_hours_timezone;
  }
  if (body.categories && typeof body.categories === "object") {
    const categories: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(body.categories as Record<string, unknown>)) {
      if (isNotificationCategory(k) && typeof v === "boolean") categories[k] = v;
    }
    patch.categories = categories;
  }

  try {
    const updated = await upsertPlatformPreferences(user.id, patch as any);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 400 }
    );
  }
}
