/**
 * Notification preference store — categories, quiet hours, channel readiness.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { explicitReengagementGranted, explicitReengagementWrite } from "@/lib/notifications/explicit-consent";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database, Json } from "@/types/supabase";
import {
  DEFAULT_CATEGORY_ENABLED,
  type NotificationCategory,
} from "@/lib/notifications/categories";

export type NotificationPreferenceRow = {
  user_id: string;
  email_daily: boolean;
  email_weekly_digest: boolean;
  email_achievements: boolean;
  email_reengagement: boolean;
  email_reengagement_explicit_at?: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string | null;
  categories: Record<string, boolean>;
  updated_at?: string;
};

const DEFAULTS: Omit<NotificationPreferenceRow, "user_id"> = {
  email_daily: true,
  email_weekly_digest: true,
  email_achievements: true,
  email_reengagement: false,
  push_enabled: false,
  email_enabled: true,
  sms_enabled: false,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  quiet_hours_timezone: "UTC",
  categories: { ...DEFAULT_CATEGORY_ENABLED },
};

function db(): SupabaseClient<Database> {
  return createServiceRoleClient() as SupabaseClient<Database>;
}

function mergeCategories(raw: unknown): Record<string, boolean> {
  const base = { ...DEFAULT_CATEGORY_ENABLED };
  if (!raw || typeof raw !== "object") return base;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean") base[key as NotificationCategory] = value;
  }
  return base;
}

/**
 * Display projection. email_reengagement is true only when the row has an
 * explicit grant timestamp. A missing row and a database default are false.
 */
export async function getPlatformPreferences(
  userId: string
): Promise<NotificationPreferenceRow> {
  const { data } = await db()
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    user_id: userId,
    ...DEFAULTS,
    ...(data ?? {}),
    categories: mergeCategories(data?.categories),
    email_enabled: data?.email_enabled ?? DEFAULTS.email_enabled,
    sms_enabled: data?.sms_enabled ?? DEFAULTS.sms_enabled,
    quiet_hours_enabled: data?.quiet_hours_enabled ?? DEFAULTS.quiet_hours_enabled,
    quiet_hours_start: data?.quiet_hours_start ?? null,
    quiet_hours_end: data?.quiet_hours_end ?? null,
    quiet_hours_timezone: data?.quiet_hours_timezone ?? "UTC",
    email_reengagement: explicitReengagementGranted(data),
    email_reengagement_explicit_at: typeof data?.email_reengagement_explicit_at === "string"
      ? data.email_reengagement_explicit_at
      : null,
  };
}

export async function upsertPlatformPreferences(
  userId: string,
  patch: Partial<NotificationPreferenceRow>
): Promise<NotificationPreferenceRow> {
  const { data: stored, error: readError } = await db()
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error("Notification preferences could not be saved.");

  const current = await getPlatformPreferences(userId);
  const nextCategories =
    patch.categories != null
      ? mergeCategories({ ...current.categories, ...patch.categories })
      : current.categories;
  const reengagement = explicitReengagementWrite({
    storedValue: typeof stored?.email_reengagement === "boolean" ? stored.email_reengagement : undefined,
    storedExplicitAt: typeof stored?.email_reengagement_explicit_at === "string" ? stored.email_reengagement_explicit_at : null,
    patch: patch.email_reengagement,
    now: new Date(),
  });

  const payload = {
    user_id: userId,
    email_daily: patch.email_daily ?? current.email_daily,
    email_weekly_digest: patch.email_weekly_digest ?? current.email_weekly_digest,
    email_achievements: patch.email_achievements ?? current.email_achievements,
    email_reengagement: reengagement.email_reengagement,
    email_reengagement_explicit_at: reengagement.email_reengagement_explicit_at,
    push_enabled: patch.push_enabled ?? current.push_enabled,
    email_enabled: patch.email_enabled ?? current.email_enabled,
    sms_enabled: patch.sms_enabled ?? current.sms_enabled,
    quiet_hours_enabled: patch.quiet_hours_enabled ?? current.quiet_hours_enabled,
    quiet_hours_start:
      patch.quiet_hours_start !== undefined
        ? patch.quiet_hours_start
        : current.quiet_hours_start,
    quiet_hours_end:
      patch.quiet_hours_end !== undefined ? patch.quiet_hours_end : current.quiet_hours_end,
    quiet_hours_timezone:
      patch.quiet_hours_timezone ?? current.quiet_hours_timezone ?? "UTC",
    categories: nextCategories as Json,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db()
    .from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error("Notification preferences could not be saved.");

  return {
    ...(data as NotificationPreferenceRow),
    categories: mergeCategories(data?.categories),
    email_reengagement: explicitReengagementGranted(data),
    email_reengagement_explicit_at: typeof (data as NotificationPreferenceRow | null)?.email_reengagement_explicit_at === "string"
      ? (data as NotificationPreferenceRow).email_reengagement_explicit_at
      : null,
  };
}

export function isCategoryEnabled(
  prefs: NotificationPreferenceRow,
  category: NotificationCategory
): boolean {
  const map = prefs.categories ?? DEFAULT_CATEGORY_ENABLED;
  if (typeof map[category] === "boolean") return map[category];
  return DEFAULT_CATEGORY_ENABLED[category] ?? true;
}

/** Returns true when current local time in preference TZ falls inside quiet hours. */
export function isInQuietHours(
  prefs: Pick<
    NotificationPreferenceRow,
    "quiet_hours_enabled" | "quiet_hours_start" | "quiet_hours_end" | "quiet_hours_timezone"
  >,
  now = new Date()
): boolean {
  if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }

  const tz = prefs.quiet_hours_timezone || "UTC";
  let localMinutes: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    localMinutes = hour * 60 + minute;
  } catch {
    localMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  }

  const parseHm = (raw: string) => {
    const [h, m] = raw.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };

  const start = parseHm(String(prefs.quiet_hours_start).slice(0, 5));
  const end = parseHm(String(prefs.quiet_hours_end).slice(0, 5));

  if (start === end) return false;
  if (start < end) return localMinutes >= start && localMinutes < end;
  // Overnight window (e.g. 22:00–07:00)
  return localMinutes >= start || localMinutes < end;
}
