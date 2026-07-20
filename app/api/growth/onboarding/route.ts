import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeWelcome,
  dismissTip,
  getOrCreateOnboarding,
  markChecklistItem,
  type WelcomeIntent,
} from "@/services/growth/onboarding";
import { trackGrowthEvent } from "@/services/growth/events";

async function currentUser() {
  const supabase = await createClient();
  return (await supabase.auth.getUser()).data.user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getOrCreateOnboarding(user.id));
  } catch {
    return NextResponse.json({ error: "Unable to load onboarding" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    if (body.action === "complete_welcome" && ["browse", "create", "sell", "join"].includes(body.intent)) {
      const onboarding = await completeWelcome(user.id, body.intent as WelcomeIntent);
      void trackGrowthEvent(user.id, "growth.welcome_completed", { intent: body.intent });
      return NextResponse.json(onboarding);
    }
    if (body.action === "mark_checklist" && typeof body.key === "string") {
      const onboarding = await markChecklistItem(user.id, body.key);
      void trackGrowthEvent(user.id, "growth.checklist_completed", { key: body.key });
      return NextResponse.json(onboarding);
    }
    if (body.action === "dismiss_tip" && typeof body.tipId === "string") {
      return NextResponse.json(await dismissTip(user.id, body.tipId));
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update onboarding" }, { status: 400 });
  }
}
