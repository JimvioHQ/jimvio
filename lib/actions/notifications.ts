"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthUserId(): Promise<string | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
}

export async function markNotificationRead(notificationId: string): Promise<{ ok: boolean; error?: string }> {
    const userId = await getAuthUserId();
    if (!userId) return { ok: false, error: "Not signed in" };

    const supabase = await createClient();
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/notifications");
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
        .eq("is_read", false);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    return { ok: true };
}

export async function dismissNotification(notificationId: string): Promise<{ ok: boolean; error?: string }> {
    const userId = await getAuthUserId();
    if (!userId) return { ok: false, error: "Not signed in" };

    const supabase = await createClient();
    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    return { ok: true };
}
