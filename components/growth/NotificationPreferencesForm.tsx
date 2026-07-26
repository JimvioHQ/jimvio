"use client";

import { useEffect, useState } from "react";

type Preferences = {
  email_daily: boolean;
  email_weekly_digest: boolean;
  email_achievements: boolean;
  email_reengagement: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

const labels: Partial<Record<keyof Preferences, string>> = {
  email_enabled: "Email notifications",
  email_daily: "Daily activity email",
  email_weekly_digest: "Weekly creator report",
  email_achievements: "Achievements and milestones",
  email_reengagement: "Helpful return reminders",
  push_enabled: "Browser push (ready)",
  sms_enabled: "SMS (coming soon)",
  quiet_hours_enabled: "Quiet hours",
};

const toggleKeys = [
  "email_enabled",
  "email_daily",
  "email_weekly_digest",
  "email_achievements",
  "email_reengagement",
  "push_enabled",
  "sms_enabled",
  "quiet_hours_enabled",
] as const;

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPreferences(data);
        else {
          return fetch("/api/growth/preferences")
            .then((r) => (r.ok ? r.json() : null))
            .then(setPreferences);
        }
      })
      .catch(() => undefined);
  }, []);

  async function update(key: (typeof toggleKeys)[number]) {
    if (!preferences || saving) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaving(true);
    const response = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    if (!response.ok) {
      // Fallback to growth prefs for legacy keys
      const legacy = await fetch("/api/growth/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!legacy.ok) setPreferences(preferences);
    }
    setSaving(false);
  }

  async function updateQuietTime(field: "quiet_hours_start" | "quiet_hours_end", value: string) {
    if (!preferences || saving) return;
    const next = { ...preferences, [field]: value || null };
    setPreferences(next);
    setSaving(true);
    const response = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (!response.ok) setPreferences(preferences);
    setSaving(false);
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#fd5000]">Notifications</p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">Choose your updates</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">Keep the emails and alerts that help you make progress.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {!preferences ? (
          <p className="p-5 text-sm text-[var(--color-text-muted)]">Loading preferences…</p>
        ) : (
          <>
            {toggleKeys.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--color-border)] p-4 last:border-0"
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{labels[key]}</span>
                <input
                  type="checkbox"
                  checked={Boolean(preferences[key])}
                  disabled={saving || key === "sms_enabled"}
                  onChange={() => update(key)}
                  className="h-4 w-4 accent-[#fd5000]"
                />
              </label>
            ))}
            {preferences.quiet_hours_enabled && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] p-4">
                <label className="text-sm text-[var(--color-text-muted)]">
                  From
                  <input
                    type="time"
                    value={(preferences.quiet_hours_start ?? "22:00").slice(0, 5)}
                    onChange={(e) => updateQuietTime("quiet_hours_start", e.target.value)}
                    className="ml-2 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-sm text-[var(--color-text-muted)]">
                  To
                  <input
                    type="time"
                    value={(preferences.quiet_hours_end ?? "07:00").slice(0, 5)}
                    onChange={(e) => updateQuietTime("quiet_hours_end", e.target.value)}
                    className="ml-2 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                  />
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
