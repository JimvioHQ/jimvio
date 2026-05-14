"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, MapPin, Link as LinkIcon, Loader2, Check, X } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  updated_at?: string;
}

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    location: "",
    website: "",
  });

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        loadProfile(user.id);
      }
    }
    getUser();
  }, []);

  async function loadProfile(userId: string) {
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from("profiles")
        .select("id,full_name,avatar_url,username,bio,location,website,updated_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to load profile:", error);
      } else if (data) {
        setProfile(data as Profile);
        setFormData({
          full_name: data.full_name || "",
          username: data.username || "",
          bio: data.bio || "",
          location: data.location || "",
          website: data.website || "",
        });
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
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUserId);

      if (error) {
        console.error("Failed to save profile:", error);
      } else {
        setProfile(prev => prev ? { ...prev, ...formData } : null);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    setSaving(true);
    try {
      const filename = `${currentUserId}-${Date.now()}`;
      const { error: uploadError } = await createClient().storage
        .from("avatars")
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = createClient().storage
        .from("avatars")
        .getPublicUrl(filename);

      const { error: updateError } = await createClient()
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUserId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (error) {
      console.error("Avatar upload failed:", error);
    } finally {
      setSaving(false);
    }
  }

  if (!currentUserId) return <div className="p-4">Loading...</div>;
  if (loading) return <div className="p-4">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" />
            My Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          {/* Avatar */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {(profile?.full_name || "U")[0]?.toUpperCase()}
                  </div>
                )}
                {editing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="absolute bottom-0 right-0 bg-primary hover:bg-primary/80 text-white p-2 rounded-full"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div>
                <div className="text-sm text-text-muted">Profile Picture</div>
                {profile?.updated_at && (
                  <div className="text-xs text-text-muted">
                    Updated {new Date(profile.updated_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!editing}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <User className="w-4 h-4" />
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!editing}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!editing}
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!editing}
                placeholder="City, Country"
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={!editing}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg disabled:opacity-50"
              />
            </div>

            {editing && (
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User ID Info */}
        <div className="bg-surface rounded-lg border border-border p-4 text-center">
          <div className="text-sm text-text-muted mb-1">User ID</div>
          <div className="font-mono text-sm text-text-primary break-all">{currentUserId}</div>
        </div>
      </div>
    </div>
  );
}
