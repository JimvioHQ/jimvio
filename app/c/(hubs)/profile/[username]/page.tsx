"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, MapPin, Link as LinkIcon, Loader2, Check, X } from "lucide-react";

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

export default function ProfilePage() {
    const params = useParams<{ username: string }>();
    const usernameParam = params.username;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        bio: "",
        location: "",
        website: "",
    });

    useEffect(() => {
        async function load() {
            setLoading(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) setCurrentUserId(user.id);

            const { data, error } = await supabase
                .from("profiles")
                .select("id,full_name,avatar_url,username,bio,location,website,updated_at")
                .eq("username", usernameParam)
                .maybeSingle();

            if (error) {
                console.error("Failed to load profile:", error);
            } else if (data) {
                setProfile(data as Profile);
                setIsOwnProfile(user?.id === data.id);
                setFormData({
                    full_name: data.full_name || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    website: data.website || "",
                });
            } else {
                setProfile(null);
            }

            setLoading(false);
        }

        if (usernameParam) load();
    }, [usernameParam]);

    async function handleSave() {
        if (!currentUserId || !isOwnProfile) return;
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
                setProfile((prev) => prev ? { ...prev, ...formData } : null);
                setEditing(false);
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !currentUserId || !isOwnProfile) return;

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

            setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
        } catch (error) {
            console.error("Avatar upload failed:", error);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-4">Loading profile...</div>;
    if (!profile) return <div className="p-4">Profile not found.</div>;

    return (
        <div className="min-h-screen bg-bg">
            <div className="mx-auto max-w-2xl p-4">
                <div className="mb-8">
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <User className="h-6 w-6" />
                        {isOwnProfile ? "My Profile" : `@${profile.username ?? usernameParam}`}
                    </h1>
                </div>

                <div className="mb-6 rounded-lg border border-border bg-surface p-6">
                    <div className="mb-6 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        className="h-20 w-20 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                                        {(profile.full_name || profile.username || "U")[0]?.toUpperCase()}
                                    </div>
                                )}
                                {editing && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={saving}
                                        className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white hover:bg-primary/80"
                                    >
                                        <LinkIcon className="h-4 w-4" />
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
                                {profile.updated_at && (
                                    <div className="text-xs text-text-muted">
                                        Updated {new Date(profile.updated_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => setEditing(!editing)}
                                className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/80"
                            >
                                {editing ? "Cancel" : "Edit"}
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Full Name</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                disabled={!editing}
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                                <User className="h-4 w-4" />
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={!editing}
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">Bio</label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                disabled={!editing}
                                rows={4}
                                placeholder="Tell us about yourself..."
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                                <MapPin className="h-4 w-4" />
                                Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                disabled={!editing}
                                placeholder="City, Country"
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="mb-1 flex items-center gap-1 text-sm font-medium">
                                <LinkIcon className="h-4 w-4" />
                                Website
                            </label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                disabled={!editing}
                                placeholder="https://example.com"
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 disabled:opacity-50"
                            />
                        </div>

                        {editing && isOwnProfile && (
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
