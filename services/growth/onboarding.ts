import { getAdminDB } from "@/services/base";
import {
  computeProgress,
  listChecklistForIntent,
  type Checklist,
  type WelcomeIntent,
} from "@/lib/growth/onboarding-checklist";
import { notifyUser } from "@/lib/notifications/notify-user";
import { trackGrowthEvent } from "@/services/growth/events";

export { computeProgress, listChecklistForIntent };
export type { Checklist, WelcomeIntent };

const db = () => getAdminDB() as any;

export async function getOrCreateOnboarding(userId: string) {
  const { data, error } = await db()
    .from("user_onboarding")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeWelcome(userId: string, intent: WelcomeIntent) {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("user_onboarding")
    .upsert(
      {
        user_id: userId,
        welcome_intent: intent,
        welcome_completed_at: now,
        progress_percent: 0,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw error;

  // Best-effort welcome email once (never blocks onboarding).
  void maybeSendWelcomeEmail(userId, intent, data?.welcome_email_sent_at ?? null);

  return data;
}

async function maybeSendWelcomeEmail(
  userId: string,
  intent: WelcomeIntent,
  alreadySentAt: string | null,
) {
  if (alreadySentAt) return;
  try {
    await notifyUser(db(), {
      userId,
      type: "system",
      title: "Welcome to Jimvio",
      message: "Your account is ready. Open your dashboard to continue setup.",
      actionUrl: "/dashboard",
      email: { kind: "welcome", intent },
    });
    await db()
      .from("user_onboarding")
      .update({ welcome_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("welcome_email_sent_at", null);
    void trackGrowthEvent(userId, "growth.welcome_email_sent", { intent });
  } catch (error) {
    console.warn("[onboarding] welcome email failed:", error);
  }
}

export async function markChecklistItem(userId: string, key: string) {
  const onboarding = await getOrCreateOnboarding(userId);
  const intent = onboarding.welcome_intent as WelcomeIntent | null;
  if (!intent || !listChecklistForIntent(intent).some((item) => item.key === key)) {
    throw new Error("Unknown checklist item");
  }

  const checklist: Checklist = onboarding.checklist ?? {};
  checklist[key] = { done: true, at: new Date().toISOString() };
  const { data, error } = await db()
    .from("user_onboarding")
    .update({
      checklist,
      progress_percent: computeProgress(checklist, intent),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dismissTip(userId: string, tipId: string) {
  const onboarding = await getOrCreateOnboarding(userId);
  const dismissed = Array.isArray(onboarding.tips_dismissed) ? onboarding.tips_dismissed : [];
  const tipsDismissed = dismissed.includes(tipId) ? dismissed : [...dismissed, tipId];
  const { data, error } = await db()
    .from("user_onboarding")
    .update({ tips_dismissed: tipsDismissed, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
