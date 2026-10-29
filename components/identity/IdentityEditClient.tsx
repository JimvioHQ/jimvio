"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  Camera,
  Check,
  Eye,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import { getInitials } from "@/lib/utils";
import type {
  IdentityAvailability,
  IdentityPrivacyVisibility,
  IdentityProfilePayload,
  IdentitySocialAccount,
  IdentitySocialPlatform,
} from "@/lib/identity/types";
import {
  IdentityButton,
  IdentityCard,
  cn,
} from "@/components/identity/identity-ui";
import { evaluateCreatorProfileCompletion, evaluateProfileStrength } from "@/lib/identity/creator-profile-completion";
import { CreatorProfileChecklist } from "@/components/identity/CreatorProfileChecklist";
import { CategoryPicker } from "@/components/identity/CategoryPicker";
import { LockedCountryField } from "@/components/geo/LockedCountryField";
import { VerifiedBadge } from "@/components/identity/VerifiedBadge";

type Tab = "profile";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
];

const AVAILABILITY_OPTIONS: { value: IdentityAvailability; label: string }[] = [
  { value: "open", label: "Open to work" },
  { value: "limited", label: "Limited availability" },
  { value: "booked", label: "Fully booked" },
  { value: "unavailable", label: "Not available" },
];

const PLATFORMS: IdentitySocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
  "website",
];

export function IdentityEditClient({ initialPayload }: { initialPayload: IdentityProfilePayload }) {
  const [tab, setTab] = useState<Tab>("profile");
  const { profile } = initialPayload;

  const [core, setCore] = useState({
    fullName: profile.fullName ?? "",
    username: profile.username ?? "",
    industries: profile.industries ?? [],
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    website: profile.website ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    language: profile.language ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    coverImage: profile.coverImage ?? "",
    languages: profile.languages,
    skills: profile.skills,
    specialties: profile.specialties ?? [],
    availability: profile.availability,
    availabilityNote: profile.availabilityNote ?? "",
    contactPreferences: profile.contactPreferences,
    privacyVisibility: profile.privacyVisibility,
    mediaKitUrl: profile.mediaKitUrl ?? "",
  });

  const [social, setSocial] = useState<IdentitySocialAccount[]>(initialPayload.social);

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<"complete" | "incomplete" | null>(null);

  const saveCore = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...core,
          username: core.username.trim() && core.username.trim() !== (profile.username ?? "") ? core.username.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");

      const missing = Array.isArray(json.missing)
        ? (json.missing as Array<{ id?: string; label?: string }>)
            .map((m) => m.label)
            .filter((label): label is string => Boolean(label))
        : [];

      if (json.saved === true && json.complete === true) {
        setSaveNotice("complete");
        toast.success("Creator Profile Saved", {
          description: "Your creator profile is ready.",
        });
        return;
      }

      setSaveNotice("incomplete");
      if (missing.length > 0) {
        toast.message("Complete these remaining items", {
          description: missing.map((label) => `• ${label}`).join("\n"),
        });
      } else {
        toast.error(json.error ?? "Creator profile is not complete yet.");
      }
    } catch (err) {
      setSaveNotice(null);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [core]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
          <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
            Edit your profile
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {profile.username && (
            <Link
              href={`/u/${profile.username}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 text-[12.5px] font-semibold text-[#1C1B19] hover:border-black/20"
            >
              <Eye className="h-3.5 w-3.5" /> View public profile
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors lg:w-full",
                  active ? "bg-[#161512] text-white" : "text-[#59544B] hover:bg-black/[0.04]",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-5">
          {tab === "profile" && (
            <ProfileTab
              core={core}
              setCore={setCore}
              onSave={saveCore}
              saving={saving}
              saveNotice={saveNotice}
              username={profile.username}
              identityVerified={profile.identityVerified}
              social={social}
              setSocial={setSocial}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile tab ────────────────────────────────────────────────────────────

type CoreState = {
  fullName: string;
  username: string;
  industries: string[];
  headline: string;
  bio: string;
  website: string;
  country: string;
  city: string;
  language: string;
  avatarUrl: string;
  coverImage: string;
  languages: string[];
  skills: string[];
  specialties: string[];
  availability: IdentityAvailability;
  availabilityNote: string;
  contactPreferences: { email: boolean; in_app: boolean; booking: boolean };
  privacyVisibility: IdentityPrivacyVisibility;
  mediaKitUrl: string;
};

function ProfileTab({
  core,
  setCore,
  onSave,
  saving,
  saveNotice,
  username,
  identityVerified,
  social,
  setSocial,
}: {
  core: CoreState;
  setCore: React.Dispatch<React.SetStateAction<CoreState>>;
  onSave: () => void;
  saving: boolean;
  saveNotice: "complete" | "incomplete" | null;
  username: string | null;
  identityVerified: boolean;
  social: IdentitySocialAccount[];
  setSocial: React.Dispatch<React.SetStateAction<IdentitySocialAccount[]>>;
}) {
  const avatarUpload = useCloudinaryUpload("jimvio/avatars");
  const coverUpload = useCloudinaryUpload("jimvio/identity");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarFile(file: File) {
    const result = await avatarUpload.upload(file, "image");
    if ("url" in result) setCore((c) => ({ ...c, avatarUrl: result.url }));
    else toast.error(result.error);
  }
  async function handleCoverFile(file: File) {
    const result = await coverUpload.upload(file, "image");
    if ("url" in result) setCore((c) => ({ ...c, coverImage: result.url }));
    else toast.error(result.error);
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="overflow-hidden">
        <div className="relative h-32 w-full bg-[linear-gradient(135deg,#FFEDE2,#FFF7F0_45%,#F3F1EC)] sm:h-40">
          {core.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={core.coverImage} alt="" className="h-full w-full object-cover" />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUpload.uploading}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur-sm hover:bg-black/60"
          >
            <Camera className="h-3 w-3" /> {coverUpload.uploading ? `${coverUpload.progress}%` : "Change cover"}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleCoverFile(e.target.files[0])}
          />
        </div>
        <div className="relative flex flex-col gap-3 px-4 pb-5 pt-0 sm:flex-row sm:items-end sm:gap-4 sm:px-6">
          <div className="-mt-10 flex flex-col items-center gap-2 sm:items-start">
            <div className="relative h-20 w-20 overflow-hidden rounded-[22px] border-4 border-white bg-[#FF5A1F] shadow-lg">
              {core.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={core.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-white">
                  {getInitials(core.fullName || "You")}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUpload.uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity hover:bg-black/40 hover:opacity-100"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}
              />
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-[11px] font-semibold text-[#D6480F]"
            >
              {avatarUpload.uploading ? `${avatarUpload.progress}%` : "Change photo"}
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 pb-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p className="truncate text-[18px] font-semibold text-[#161512]">
                {core.fullName.trim() || "Your name"}
              </p>
              <VerifiedBadge verified={identityVerified} />
            </div>
            <p className="truncate text-[13px] text-[#59544B]">
              {core.headline.trim() || "Add a headline that describes what you do"}
            </p>
            <p className="text-[12px] text-[#9A9388]">
              {[core.city, core.country].filter(Boolean).join(", ") || "Add your location"}
            </p>
            {(() => {
              const strength = evaluateProfileStrength({
                ...core,
                identityVerified,
              });
              return (
                <div className="pt-1">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-[#59544B]">Profile strength</span>
                    <span className="font-bold tabular-nums text-[#161512]">{strength.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#FF5A1F] transition-[width]"
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  {strength.nextHint ? (
                    <p className="mt-1.5 text-[11.5px] text-[#8B8579]">{strength.nextHint}</p>
                  ) : null}
                </div>
              );
            })()}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
              {username ? (
                <Link
                  href={`/u/${username}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-[12px] font-semibold text-[#1C1B19]"
                >
                  <Eye className="h-3.5 w-3.5" /> View public profile
                </Link>
              ) : null}
              {!identityVerified ? (
                <Link
                  href="/identity/verification"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FFF1EA] px-3 text-[12px] font-semibold text-[#D6480F]"
                >
                  <BadgeCheck className="h-3.5 w-3.5" /> Verify identity
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </IdentityCard>

      <IdentityCard className="space-y-4 p-5 sm:p-6">
        {(() => {
          const live = evaluateCreatorProfileCompletion({
            fullName: core.fullName,
            username: core.username,
            categories: core.industries,
            headline: core.headline,
            bio: core.bio,
            country: core.country,
            socialCount: social.filter((a) => a.platform !== "website").length,
          });
          return <CreatorProfileChecklist completion={live} saved={saveNotice === "complete"} />;
        })()}
        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Full name" required id="field-fullName">
            <input
              className="identity-input"
              value={core.fullName}
              onChange={(e) => setCore((c) => ({ ...c, fullName: e.target.value }))}
              maxLength={120}
            />
          </EditField>
          <EditField label="Username" required id="field-username">
            <div className="flex items-center rounded-xl">
              <span className="pr-1 text-[13px] text-[#9A9388]">@</span>
              <input
                className="identity-input"
                placeholder="yourname"
                value={core.username}
                onChange={(e) =>
                  setCore((c) => ({ ...c, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) }))
                }
                maxLength={24}
              />
            </div>
          </EditField>
        </div>

        <EditField label="What you create" required id="field-categories">
          <CategoryPicker value={core.industries} onChange={(v) => setCore((c) => ({ ...c, industries: v }))} />
        </EditField>

        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Headline" required id="field-headline">
            <input
              className="identity-input"
              placeholder="e.g. Beauty & lifestyle creator"
              value={core.headline}
              onChange={(e) => setCore((c) => ({ ...c, headline: e.target.value }))}
              maxLength={160}
            />
          </EditField>
        </div>

        <EditField label="Bio" required id="field-bio">
          <textarea
            className="identity-input resize-none"
            rows={4}
            value={core.bio}
            onChange={(e) => setCore((c) => ({ ...c, bio: e.target.value }))}
            maxLength={2000}
          />
        </EditField>

        <div className="grid gap-4 sm:grid-cols-3">
          <EditField label="Country" required id="field-country">
            <LockedCountryField fallback={core.country || null} />
          </EditField>
          <EditField label="City">
            <input
              className="identity-input"
              value={core.city}
              onChange={(e) => setCore((c) => ({ ...c, city: e.target.value }))}
            />
          </EditField>
          <EditField label="Website">
            <input
              className="identity-input"
              placeholder="https://"
              value={core.website}
              onChange={(e) => setCore((c) => ({ ...c, website: e.target.value }))}
            />
          </EditField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Languages">
            <TagInput
              values={core.languages}
              onChange={(v) => setCore((c) => ({ ...c, languages: v }))}
              placeholder="Add a language and press Enter"
            />
          </EditField>
          <EditField label="Skills">
            <TagInput
              values={core.skills}
              onChange={(v) => setCore((c) => ({ ...c, skills: v }))}
              placeholder="Add a skill and press Enter"
            />
          </EditField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Availability">
            <select
              className="identity-input"
              value={core.availability}
              onChange={(e) => setCore((c) => ({ ...c, availability: e.target.value as IdentityAvailability }))}
            >
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </EditField>
          <EditField label="Availability note">
            <input
              className="identity-input"
              value={core.availabilityNote}
              onChange={(e) => setCore((c) => ({ ...c, availabilityNote: e.target.value }))}
              placeholder="Optional"
            />
          </EditField>
        </div>

        <EditField label="Media kit / rate card URL">
          <input
            className="identity-input"
            placeholder="https://"
            value={core.mediaKitUrl}
            onChange={(e) => setCore((c) => ({ ...c, mediaKitUrl: e.target.value }))}
          />
        </EditField>

        <div className="border-t border-black/[0.06] pt-4">
          <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
            Contact preferences
          </p>
          <div className="flex flex-wrap gap-4">
            {(["email", "in_app", "booking"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-[13px] text-[#3E3A34]">
                <Toggle
                  checked={core.contactPreferences[key]}
                  onChange={(checked) =>
                    setCore((c) => ({
                      ...c,
                      contactPreferences: { ...c.contactPreferences, [key]: checked },
                    }))
                  }
                />
                {key === "email" ? "Email" : key === "in_app" ? "In-app notifications" : "Booking requests"}
              </label>
            ))}
          </div>
        </div>

        <div id="field-social" className="scroll-mt-24">
          <ExternalLinksSection social={social} setSocial={setSocial} />
        </div>

        <div className="flex justify-end">
          <IdentityButton onClick={onSave} loading={saving}>
            <Save className="h-4 w-4" /> Save profile
          </IdentityButton>
        </div>
      </IdentityCard>
      <style jsx global>{identityInputStyles}</style>
    </div>
  );
}

function ExternalLinksSection({
  social,
  setSocial,
}: {
  social: IdentitySocialAccount[];
  setSocial: React.Dispatch<React.SetStateAction<IdentitySocialAccount[]>>;
}) {
  const [form, setForm] = useState({
    platform: "instagram" as IdentitySocialPlatform,
    handle: "",
    url: "",
    followers: "",
  });
  const [saving, setSaving] = useState(false);

  async function addAccount() {
    if (!form.handle.trim() && !form.url.trim()) {
      toast.error("Add a handle or URL");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/identity/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          handle: form.handle,
          url: form.url,
          followers: Math.max(0, Math.floor(Number(form.followers) || 0)),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add link");
      setSocial((prev) => [json.account, ...prev.filter((a) => a.platform !== form.platform)]);
      setForm({ platform: "instagram", handle: "", url: "", followers: "" });
      toast.success("Link added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link");
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount(id: string) {
    setSocial((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/identity/social?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="border-t border-black/[0.06] pt-4">
      <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
        Social media accounts <span className="text-[#D6480F]">*</span>
      </p>
      <p className="mb-3 text-[12px] text-[#8B8579]">
        Add at least one account where you post (TikTok, Instagram, YouTube…). Brands review these before accepting you.
      </p>
      <div className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_110px_auto]">
        <select
          className="identity-input"
          value={form.platform}
          onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as IdentitySocialPlatform }))}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="identity-input"
          placeholder="Handle"
          value={form.handle}
          onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
        />
        <input
          className="identity-input"
          placeholder="Profile URL"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        />
        <input
          className="identity-input"
          inputMode="numeric"
          placeholder="Followers"
          value={form.followers}
          onChange={(e) => setForm((f) => ({ ...f, followers: e.target.value.replace(/[^0-9]/g, "").slice(0, 10) }))}
        />
        <IdentityButton size="sm" onClick={addAccount} loading={saving} className="sm:w-auto">
          <Plus className="h-3.5 w-3.5" /> Add
        </IdentityButton>
      </div>
      {social.length > 0 ? (
        <div className="mt-3 space-y-2">
          {social.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-[#FAFAF8] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold capitalize text-[#1C1B19]">{a.platform}</p>
                <p className="truncate text-[12px] text-[#9A9388]">
                  {a.handle ? `@${a.handle}` : a.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAccount(a.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#B9B3A6] hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${a.platform}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EditField({
  label,
  required,
  id,
  children,
}: {
  label: string;
  required?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block scroll-mt-24" id={id}>
      <span className="mb-1.5 block text-[12px] font-medium text-[#7C766B]">
        {label}
        {required ? <span className="ml-0.5 text-[#D6480F]">*</span> : null}
      </span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-[#FF5A1F]" : "bg-black/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  return (
    <div className="identity-input flex h-auto min-h-[40px] flex-wrap items-center gap-1.5 py-1.5">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] text-[#3E3A34]">
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-[#9A9388] hover:text-[#1C1B19]">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : ""}
        className="min-w-[100px] flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-[#B9B3A6]"
      />
    </div>
  );
}

const identityInputStyles = `
  .identity-input {
    width: 100%;
    min-height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.08);
    background: #fff;
    padding: 0 12px;
    font-size: 13.5px;
    color: #1C1B19;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .identity-input:focus-within, .identity-input:focus {
    border-color: #FF5A1F;
  }
  textarea.identity-input {
    height: auto;
    padding: 10px 12px;
  }
`;
