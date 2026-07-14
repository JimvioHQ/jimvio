"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Bell, Shield, User, Trash2, AlertTriangle, Check, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type UserSettings = {
  email_notifications: boolean;
  message_notifications: boolean;
  marketing_emails: boolean;
  profile_private: boolean;
};

type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
};

export default function HubSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    message_notifications: true,
    marketing_emails: false,
    profile_private: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: settingsData }, { data: profileData }] = await Promise.all([
          supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, email")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (!cancelled) {
          if (settingsData) setSettings(settingsData);
          if (profileData) setProfile(profileData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (saving) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(key);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, [key]: value }, { onConflict: "user_id" });

    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const ToggleRow = ({ label, description, icon: Icon, value, onChange, disabled }: {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{label}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors",
          value
            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
            : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]",
        )}
        aria-pressed={value}
        aria-label={value ? "Enabled" : "Disabled"}
      >
        <span className={cn(
          "absolute top-0.5 left-0.5 block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          value ? "translate-x-5" : "translate-x-0",
        )} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto max-w-[800px] space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <Shield className="h-5 w-5" />
              </div>
              Settings
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Manage your notifications, privacy & account
            </p>
          </div>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name ?? "Profile"} className="w-14 h-14 rounded-xl object-cover ring-2 ring-[var(--color-accent)]/30" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-white font-bold text-[18px]">
                {(profile?.full_name ?? profile?.username ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-[14px] font-black text-[var(--color-text-primary)]">{profile?.full_name ?? profile?.username ?? "User"}</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">@{profile?.username ?? "username"}</p>
            </div>
            <HubLinkButton href="/c/profile" variant="secondary" size="sm">
              <Edit className="mr-1 h-3.5 w-3.5" />
              Edit profile
            </HubLinkButton>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4">
          <h3 className="mb-4 flex items-center gap-2 text-[13px] font-black text-[var(--color-text-primary)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-live)]/15 text-[var(--color-live)]">
              <Bell className="h-4 w-4" />
            </div>
            Notifications
          </h3>
          <div className="space-y-3">
            <ToggleRow
              label="Email notifications"
              description="Receive email updates about your activity"
              icon={Bell}
              value={settings.email_notifications}
              onChange={(v) => updateSetting("email_notifications", v)}
            />
            <ToggleRow
              label="Message notifications"
              description="Get notified when you receive new messages"
              icon={MessageSquare}
              value={settings.message_notifications}
              onChange={(v) => updateSetting("message_notifications", v)}
            />
            <ToggleRow
              label="Marketing emails"
              description="Receive tips, updates & community highlights"
              icon={Megaphone}
              value={settings.marketing_emails}
              onChange={(v) => updateSetting("marketing_emails", v)}
            />
          </div>
        </div>

        {/* Privacy */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4">
          <h3 className="mb-4 flex items-center gap-2 text-[13px] font-black text-[var(--color-text-primary)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-growth)]/15 text-[var(--color-growth)]">
              <Shield className="h-4 w-4" />
            </div>
            Privacy
          </h3>
          <ToggleRow
            label="Private profile"
            description="Only community members can see your profile"
            icon={User}
            value={settings.profile_private}
            onChange={(v) => updateSetting("profile_private", v)}
          />
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-black text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="mb-4 text-[12px] text-red-300">This action is irreversible. All your data will be permanently deleted.</p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        </div>

        {/* Account info */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4">
          <h3 className="mb-4 flex items-center gap-2 text-[13px] font-black text-[var(--color-text-primary)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-social)]/15 text-[var(--color-social)]">
              <Info className="h-4 w-4" />
            </div>
            Account Info
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Email</dt>
              <dd className="text-[13px] font-semibold text-[var(--color-text-primary)]">{profile?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Username</dt>
              <dd className="text-[13px] font-semibold text-[var(--color-text-primary)]">@{profile?.username ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">User ID</dt>
              <dd className="font-mono text-[11px] font-semibold text-[var(--color-text-secondary)]">{profile?.id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Joined</dt>
              <dd className="text-[13px] font-semibold text-[var(--color-text-primary)]">—</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}