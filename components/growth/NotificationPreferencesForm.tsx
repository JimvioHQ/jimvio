"use client";

import { useEffect, useState } from "react";

type Preferences = {
  email_daily: boolean;
  email_weekly_digest: boolean;
  email_achievements: boolean;
  email_reengagement: boolean;
  push_enabled: boolean;
};

const labels: Record<keyof Preferences, string> = {
  email_daily: "Daily activity email",
  email_weekly_digest: "Weekly creator report",
  email_achievements: "Achievements and milestones",
  email_reengagement: "Helpful return reminders",
  push_enabled: "Browser push notifications",
};

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/growth/preferences").then((r) => r.ok ? r.json() : null).then(setPreferences).catch(() => undefined);
  }, []);

  async function update(key: keyof Preferences) {
    if (!preferences || saving) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSaving(true);
    const response = await fetch("/api/growth/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
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
        {!preferences ? <p className="p-5 text-sm text-[var(--color-text-muted)]">Loading preferences…</p> : Object.entries(labels).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--color-border)] p-4 last:border-0">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
            <input
              type="checkbox"
              checked={preferences[key as keyof Preferences]}
              disabled={saving}
              onChange={() => update(key as keyof Preferences)}
              className="h-4 w-4 accent-[#fd5000]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
