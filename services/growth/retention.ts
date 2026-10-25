import { getAdminDB } from "@/services/base";
import { explicitReengagementGranted, explicitReengagementWrite } from "@/lib/notifications/explicit-consent";
import { notifyUser } from "@/lib/notifications/notify-user";
import { trackGrowthEvent } from "./events";

export type NotificationPreferences = {
  email_daily: boolean;
  email_weekly_digest: boolean;
  email_achievements: boolean;
  email_reengagement: boolean;
  push_enabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_daily: true,
  email_weekly_digest: true,
  email_achievements: true,
  email_reengagement: false,
  push_enabled: false,
};

const db = () => getAdminDB();

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await db().from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return {
    ...DEFAULT_PREFERENCES,
    ...(data ?? {}),
    email_reengagement: explicitReengagementGranted(data),
  };
}

export async function upsertNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
  const { data: existing, error: readError } = await db()
    .from("notification_preferences")
    .select("email_daily, email_weekly_digest, email_achievements, email_reengagement, email_reengagement_explicit_at, push_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error("Notification preferences could not be saved.");
  const reengagement = explicitReengagementWrite({
    storedValue: existing?.email_reengagement,
    storedExplicitAt: existing?.email_reengagement_explicit_at,
    patch: preferences.email_reengagement,
    now: new Date(),
  });
  const { data, error } = await db()
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      email_daily: preferences.email_daily ?? existing?.email_daily ?? true,
      email_weekly_digest: preferences.email_weekly_digest ?? existing?.email_weekly_digest ?? true,
      email_achievements: preferences.email_achievements ?? existing?.email_achievements ?? true,
      email_reengagement: reengagement.email_reengagement,
      email_reengagement_explicit_at: reengagement.email_reengagement_explicit_at,
      push_enabled: preferences.push_enabled ?? existing?.push_enabled ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw new Error("Notification preferences could not be saved.");
  return {
    ...(data as NotificationPreferences),
    email_reengagement: explicitReengagementGranted(data),
  };
}

export async function buildWeeklyCreatorReportSummary(userId: string) {
  const [communities, vendor] = await Promise.all([
    db().from("communities").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    db().from("vendors").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (communities.error) throw communities.error;
  if (vendor.error) throw vendor.error;

  let productsSold = 0;
  let productsListed = 0;
  if (vendor.data?.id) {
    const [sold, listed] = await Promise.all([
      db().from("orders").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.data.id).eq("payment_status", "paid"),
      db().from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.data.id),
    ]);
    productsSold = sold.count ?? 0;
    productsListed = listed.count ?? 0;
  }

  return {
    communitiesOwned: communities.count ?? 0,
    isVendor: Boolean(vendor.data),
    productsListed,
    productsSold,
  };
}

export async function listReengagementCandidates(daysInactive: number) {
  const cutoff = new Date(Date.now() - daysInactive * 86_400_000).toISOString();
  const { data, error } = await db()
    .from("profiles")
    .select("id, email, full_name, updated_at")
    .lt("updated_at", cutoff)
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function sendAchievementEmail(userId: string, title: string, message: string) {
  await notifyUser(db(), { userId, type: "system", title, message, actionUrl: "/" });
  await trackGrowthEvent(userId, "growth.achievement_queued", { title });
}

export async function sendDigestEmail(userId: string, summary: Awaited<ReturnType<typeof buildWeeklyCreatorReportSummary>>) {
  await notifyUser(db(), {
    userId,
    type: "system",
    title: "Your weekly Jimvio report",
    message: `${summary.communitiesOwned} communities, ${summary.productsListed} products, and ${summary.productsSold} paid sales this week.`,
    actionUrl: "/",
  });
  await trackGrowthEvent(userId, "growth.digest_queued", summary);
}
