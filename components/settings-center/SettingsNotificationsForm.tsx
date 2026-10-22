"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { NotificationCategory } from "@/lib/notifications/categories";
import { useSettingsCenter } from "./settings-center-context";
import { SettingsCard, SettingsPageHeader, SettingsStatus, settingsInputClass } from "./settings-ui";

type Preferences = {
  email_daily: boolean;
  email_weekly_digest: boolean;
  email_achievements: boolean;
  email_reengagement: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  categories: Record<string, boolean>;
};

const CHANNELS: Array<{ key: keyof Preferences; label: string; description: string }> = [
  { key: "email_enabled", label: "Email notifications", description: "Send account and activity emails when a channel is enabled below." },
  { key: "push_enabled", label: "In-app notifications", description: "Keep alerts in your Jimvio notification center." },
  { key: "email_daily", label: "Daily activity email", description: "A summary of the day's relevant activity." },
  { key: "email_weekly_digest", label: "Weekly digest", description: "A weekly recap of progress and updates." },
  { key: "email_achievements", label: "Achievements", description: "Milestones and completed goals." },
  { key: "email_reengagement", label: "Helpful reminders", description: "Occasional emails if you have unfinished work." },
];

const CATEGORY_GROUPS: Array<{
  title: string;
  description: string;
  items: Array<{ key: NotificationCategory; label: string }>;
}> = [
  {
    title: "Orders and payments",
    description: "Marketplace purchases, shipping, and refunds.",
    items: [
      { key: "product_purchased", label: "Product purchased" },
      { key: "order_update", label: "Order updates" },
      { key: "shipping_update", label: "Shipping updates" },
      { key: "refund", label: "Refunds" },
    ],
  },
  {
    title: "Communities and live",
    description: "Messages, mentions, invites, and live events.",
    items: [
      { key: "new_message", label: "New messages" },
      { key: "mention", label: "Mentions" },
      { key: "reply", label: "Replies" },
      { key: "community_invite", label: "Community invites" },
      { key: "live_started", label: "Live started" },
      { key: "live_reminder", label: "Live reminders" },
    ],
  },
  {
    title: "Creator and affiliate",
    description: "Campaign and commission activity.",
    items: [
      { key: "campaign_update", label: "Campaign updates" },
      { key: "affiliate_commission", label: "Affiliate commissions" },
    ],
  },
  {
    title: "System",
    description: "Product announcements that affect your account.",
    items: [
      { key: "admin_announcement", label: "Announcements" },
      { key: "system", label: "Account system alerts" },
    ],
  },
];

export function SettingsNotificationsForm() {
  const { menuButton } = useSettingsCenter();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load preferences"))))
      .then(setPreferences)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load preferences"));
  }, []);

  async function patch(body: Record<string, unknown>, rollback: Preferences) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setPreferences(rollback);
      const json = await res.json().catch(() => null);
      const message = json?.error || "Could not save notification preferences";
      setError(message);
      toast.error(message);
    } else {
      const next = await res.json();
      setPreferences(next);
    }
    setSaving(false);
  }

  function toggleChannel(key: keyof Preferences) {
    if (!preferences || saving || typeof preferences[key] !== "boolean") return;
    const rollback = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    void patch({ [key]: next[key] }, rollback);
  }

  function toggleCategory(key: NotificationCategory) {
    if (!preferences || saving) return;
    const rollback = preferences;
    const categories = { ...preferences.categories, [key]: !preferences.categories?.[key] };
    setPreferences({ ...preferences, categories });
    void patch({ categories: { [key]: categories[key] } }, rollback);
  }

  return (
    <div>
      <SettingsPageHeader
        title="Notifications"
        description="Choose which emails and in-app alerts Jimvio should send."
        menuButton={menuButton}
      />

      {!preferences && !error ? (
        <p className="text-[14px] text-[#6B7280]">Loading preferences…</p>
      ) : null}
      {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}

      {preferences ? (
        <div className="space-y-5">
          <SettingsCard title="Channels" description="These controls persist to your notification preferences.">
            <div className="divide-y divide-[#F3F4F6]">
              {CHANNELS.map((item) => (
                <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span>
                    <span className="block text-[14px] font-medium text-[#111827]">{item.label}</span>
                    <span className="mt-0.5 block text-[13px] text-[#6B7280]">{item.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[item.key])}
                    disabled={saving}
                    onChange={() => toggleChannel(item.key)}
                    className="mt-1 h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                  />
                </label>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard
            title="Quiet hours"
            description="When enabled, Jimvio suppresses non-critical delivery during this window."
          >
            <label className="mb-4 flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-[#111827]">Enable quiet hours</span>
              <input
                type="checkbox"
                checked={preferences.quiet_hours_enabled}
                disabled={saving}
                onChange={() => toggleChannel("quiet_hours_enabled")}
                className="h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
              />
            </label>
            {preferences.quiet_hours_enabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[13px] font-medium text-[#374151]">
                  From
                  <input
                    type="time"
                    className={`${settingsInputClass} mt-1.5`}
                    value={(preferences.quiet_hours_start ?? "22:00").slice(0, 5)}
                    disabled={saving}
                    onChange={(event) => {
                      const rollback = preferences;
                      const next = { ...preferences, quiet_hours_start: event.target.value };
                      setPreferences(next);
                      void patch({ quiet_hours_start: event.target.value }, rollback);
                    }}
                  />
                </label>
                <label className="text-[13px] font-medium text-[#374151]">
                  To
                  <input
                    type="time"
                    className={`${settingsInputClass} mt-1.5`}
                    value={(preferences.quiet_hours_end ?? "07:00").slice(0, 5)}
                    disabled={saving}
                    onChange={(event) => {
                      const rollback = preferences;
                      const next = { ...preferences, quiet_hours_end: event.target.value };
                      setPreferences(next);
                      void patch({ quiet_hours_end: event.target.value }, rollback);
                    }}
                  />
                </label>
              </div>
            ) : null}
          </SettingsCard>

          {CATEGORY_GROUPS.map((group) => (
            <SettingsCard key={group.title} title={group.title} description={group.description}>
              <div className="divide-y divide-[#F3F4F6]">
                {group.items.map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="text-[14px] font-medium text-[#111827]">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={preferences.categories?.[item.key] !== false}
                      disabled={saving}
                      onChange={() => toggleCategory(item.key)}
                      className="h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                    />
                  </label>
                ))}
              </div>
            </SettingsCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
