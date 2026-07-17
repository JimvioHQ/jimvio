"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Bell, Lock, Eye, Mail, Loader2 } from "lucide-react";

interface UserSettings {
  email_notifications: boolean;
  message_notifications: boolean;
  marketing_emails: boolean;
  profile_private: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    message_notifications: true,
    marketing_emails: false,
    profile_private: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        loadSettings(user.id);
      }
    }
    getUser();
  }, []);

  async function loadSettings(userId: string) {
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load settings:", error);
      } else if (data) {
        setSettings(data as UserSettings);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const { error } = await createClient()
        .from("user_settings")
        .upsert({
          user_id: currentUserId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to save settings:", error);
        alert("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!currentUserId) return <div className="p-4">Loading...</div>;
  if (loading) return <div className="p-4">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </h1>
        </div>

        {/* Notification Settings */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-text-muted">Receive emails about activity and updates</div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={() => toggleSetting("email_notifications")}
                  className="w-5 h-5 rounded border-border"
                />
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="font-medium">Message Notifications</div>
                <div className="text-sm text-text-muted">Get notified of new messages</div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.message_notifications}
                  onChange={() => toggleSetting("message_notifications")}
                  className="w-5 h-5 rounded border-border"
                />
              </label>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Marketing Emails</div>
                <div className="text-sm text-text-muted">Receive promotional and marketing emails</div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.marketing_emails}
                  onChange={() => toggleSetting("marketing_emails")}
                  className="w-5 h-5 rounded border-border"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-500" />
            Privacy
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Private Profile</div>
                <div className="text-sm text-text-muted">Only approved users can see your profile</div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.profile_private}
                  onChange={() => toggleSetting("profile_private")}
                  className="w-5 h-5 rounded border-border"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-500" />
            Account
          </h2>

          <div className="space-y-4">
            <div className="py-3">
              <div className="font-medium">Email Address</div>
              <div className="text-sm text-text-muted mt-1">
                Your email is used for account recovery and login. To change it, please update your account settings in your profile settings.
              </div>
            </div>

            <div className="py-3 border-t border-border">
              <div className="font-medium text-red-600">Danger Zone</div>
              <p className="text-sm text-text-muted mt-2 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="px-4 py-2 bg-red-600/10 text-red-600 border border-red-600/20 rounded-lg hover:bg-red-600/20 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
