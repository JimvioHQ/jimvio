"use client";

import { useState, useTransition } from "react";
import { User, Mail, BadgeCheck, ShieldCheck } from "lucide-react";
import {
    Divider,
    Field,
    Grid,
    SaveBar,
    TextInput,
    Toast,
    type ToastMsg,
    useBeforeUnload,
} from "@/components/admin/form-primitive";
import { Textarea } from "@/components/ui/textarea";
import { updateAdminProfile, type AdminProfileData } from "@/lib/actions/admin-profile";

export function AdminProfileForm({ initial }: { initial: AdminProfileData }) {
    const [profile, setProfile] = useState(initial);
    const [dirty, setDirty] = useState(false);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<ToastMsg | null>(null);

    useBeforeUnload(dirty);

    function setField<K extends keyof AdminProfileData>(key: K, value: AdminProfileData[K]) {
        setProfile((p) => ({ ...p, [key]: value }));
        setDirty(true);
    }

    function handleSave() {
        startTransition(async () => {
            const result = await updateAdminProfile({
                full_name: profile.full_name,
                username: profile.username,
                phone: profile.phone,
                bio: profile.bio,
                website: profile.website,
                city: profile.city,
                country: profile.country,
                avatar_url: profile.avatar_url,
            });

            if (!result.success) {
                setToast({ msg: result.error, type: "err" });
                return;
            }

            setToast({ msg: "Profile updated", type: "ok" });
            setDirty(false);
        });
    }

    const initials = (profile.full_name || profile.email)
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="space-y-8">
                <header className="flex items-center gap-3">
                    <div
                        className="size-9 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--color-accent-light)" }}
                    >
                        <User className="size-4" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Your profile</h2>
                        <p className="text-[12px] text-muted-foreground">
                            Admin account details shown in the panel and user directory
                        </p>
                    </div>
                </header>

                <div className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--color-border)] p-4 bg-[var(--color-surface-secondary)]/40">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.full_name || "Admin"}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--color-border)]"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center text-lg font-bold">
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                            {profile.full_name || "Admin user"}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                            <Mail className="size-3.5" />
                            {profile.email}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {profile.is_verified && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    <BadgeCheck className="size-3" />
                                    Verified email
                                </span>
                            )}
                            {profile.two_factor_enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                                    <ShieldCheck className="size-3" />
                                    2FA enabled
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <section>
                    <Divider label="Identity" />
                    <Grid cols={2}>
                        <Field label="Full name" required>
                            <TextInput
                                value={profile.full_name}
                                onChange={(v) => setField("full_name", v)}
                                placeholder="Your name"
                            />
                        </Field>
                        <Field label="Username" hint="Lowercase, numbers, underscores">
                            <TextInput
                                value={profile.username}
                                onChange={(v) => setField("username", v.toLowerCase())}
                                placeholder="admin_handle"
                            />
                        </Field>
                        <Field label="Avatar URL">
                            <TextInput
                                value={profile.avatar_url}
                                onChange={(v) => setField("avatar_url", v)}
                                placeholder="https://"
                            />
                        </Field>
                        <Field label="Email" hint="Contact support to change login email">
                            <div
                                className="flex h-9 items-center rounded-sm border px-3 text-[13px] text-[var(--color-text-muted)]"
                                style={{
                                    borderColor: "var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                }}
                            >
                                {profile.email}
                            </div>
                        </Field>
                    </Grid>
                </section>

                <section>
                    <Divider label="Contact & location" />
                    <Grid cols={2}>
                        <Field label="Phone">
                            <TextInput
                                value={profile.phone}
                                onChange={(v) => setField("phone", v)}
                                placeholder="+250 ..."
                            />
                        </Field>
                        <Field label="Website">
                            <TextInput
                                value={profile.website}
                                onChange={(v) => setField("website", v)}
                                placeholder="https://"
                            />
                        </Field>
                        <Field label="City">
                            <TextInput
                                value={profile.city}
                                onChange={(v) => setField("city", v)}
                                placeholder="Kigali"
                            />
                        </Field>
                        <Field label="Country code">
                            <TextInput
                                value={profile.country}
                                onChange={(v) => setField("country", v.toUpperCase())}
                                placeholder="RW"
                            />
                        </Field>
                    </Grid>
                    <div className="mt-4">
                        <Field label="Bio">
                            <Textarea
                                value={profile.bio}
                                onChange={(e) => setField("bio", e.target.value)}
                                placeholder="Short admin bio (optional)"
                                className="min-h-[96px] text-[13px]"
                            />
                        </Field>
                    </div>
                </section>

                <div className="h-20" />
            </div>

            {dirty && (
                <SaveBar
                    pending={pending}
                    onSave={handleSave}
                    onDiscard={() => {
                        setProfile(initial);
                        setDirty(false);
                    }}
                />
            )}
        </>
    );
}
