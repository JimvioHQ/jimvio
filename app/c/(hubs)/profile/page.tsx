"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Camera, MapPin, Flag, Check, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseProfileLocationInput, formatProfileLocation } from "@/lib/profile-location";

export default function HubProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
  } | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    location: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, bio, location")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled && data) {
          setProfile(data);
          setForm({
            full_name: data.full_name ?? "",
            bio: data.bio ?? "",
            location: formatProfileLocation(data.location),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Avatar must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }

      const locationParsed = parseProfileLocationInput(form.location);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          bio: form.bio.trim() || null,
          location: locationParsed,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((p) => p ? { ...p, full_name: form.full_name || null, bio: form.bio || null, location: locationParsed, avatar_url: avatarUrl } : null);
      setEditing(false);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch (err) {
      console.error("[Profile] save failed:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({
      full_name: profile?.full_name ?? "",
      bio: profile?.bio ?? "",
      location: formatProfileLocation(profile?.location),
    });
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_url;

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
      <div className="mx-auto max-w-[720px] space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 animate-in animate-fade-in-up">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-social)]/15 text-[var(--color-social)]">
                <Flag className="h-5 w-5" />
              </div>
              {editing ? "Edit Profile" : "My Profile"}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {editing ? "Update your profile information" : "Manage your public profile"}
            </p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-4 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)]"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                <Edit className="h-3.5 w-3.5" /> Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Avatar + Name */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 ring-2 ring-[var(--color-accent)]/30">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={profile?.full_name ?? "Profile"} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-social)] text-white font-bold text-[24px]">
                    {(profile?.full_name ?? profile?.username ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                {editing && (
                  <label className="absolute bottom-0 right-0 p-1.5" htmlFor="avatar-upload">
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg transition hover:bg-[var(--color-accent-hover)]">
                      <Camera className="h-4 w-4" />
                    </button>
                  </label>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-black text-[var(--color-text-primary)]">{profile?.full_name ?? profile?.username ?? "User"}</p>
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">@{profile?.username}</p>
              {editing && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Full Name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Your name"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Tell the community about yourself…"
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="City, Country"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/40 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex justify-end gap-2 animate-in animate-fade-in">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-4 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)]"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-growth)]/15 text-[var(--color-growth)]">
                <Flag className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Location</h3>
            </div>
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              {profile?.location ? formatProfileLocation(profile.location) : "Not set"}
            </p>
            {editing && (
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">Format: City, Country (e.g. Nairobi, Kenya)</p>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-social)]/15 text-[var(--color-social)]">
                <User className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Account</h3>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Username</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">@{profile?.username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Email</dt>
                <dd className="font-semibold text-[var(--color-text-primary)] truncate max-w-[200px]">{profile?.email ?? "—"}</dd>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-live)]/15 text-[var(--color-live)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Privacy & Security</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Private profile</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Only community members can see your profile</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Two-factor authentication</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Add an extra layer of security</p>
                </div>
                <button className="rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)]">
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-black text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="mb-4 text-[12px] text-red-300">This action is irreversible. All your data will be permanently deleted.</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-red-500">
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        </div>
      </div>
    </div>
  );
}