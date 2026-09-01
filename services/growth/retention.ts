import { getAdminDB } from "@/services/base";
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
  email_reengagement: true,
  push_enabled: false,
};

const db = () => getAdminDB() as any;

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await db().from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_PREFERENCES, ...(data ?? {}) };
}

export async function upsertNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
  const { data, error } = await db()
    .from("notification_preferences")
    .upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as NotificationPreferences;
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
