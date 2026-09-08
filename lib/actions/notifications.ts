"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { trackNotificationEvent } from "@/lib/notifications/analytics";

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id, action_url")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (data?.id) {
    await trackNotificationEvent({
      userId,
      notificationId: data.id,
      eventName: "read",
    });
  }
  revalidatePath("/notifications");
  revalidatePath("/inbox");
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("archived_at", null);

  if (error) return { ok: false, error: error.message };
  await trackNotificationEvent({
    userId,
    eventName: "read",
    properties: { scope: "mark_all" },
  });
  revalidatePath("/notifications");
  revalidatePath("/inbox");
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function archiveNotification(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ archived_at: new Date().toISOString(), is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  await trackNotificationEvent({
    userId,
    notificationId,
    eventName: "archived",
  });
  revalidatePath("/notifications");
  revalidatePath("/inbox");
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function dismissNotification(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  await trackNotificationEvent({
    userId,
    notificationId,
    eventName: "deleted",
  });
  revalidatePath("/notifications");
  revalidatePath("/inbox");
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function trackNotificationClick(
  notificationId: string
): Promise<{ ok: boolean }> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false };
  await trackNotificationEvent({
    userId,
    notificationId,
    eventName: "click",
  });
  return { ok: true };
}
