import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/services/growth/retention";

async function currentUser() {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getNotificationPreferences(user.id));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed = ["email_daily", "email_weekly_digest", "email_achievements", "email_reengagement", "push_enabled"] as const;
  const preferences = Object.fromEntries(
    allowed.filter((key) => typeof body[key] === "boolean").map((key) => [key, body[key]]),
  );
  return NextResponse.json(await upsertNotificationPreferences(user.id, preferences));
}
