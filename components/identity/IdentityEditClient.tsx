"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  Briefcase,
  Camera,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import { getInitials } from "@/lib/utils";
import type {
  IdentityAvailability,
  IdentityPortfolioItem,
  IdentityPortfolioKind,
  IdentityPrivacyVisibility,
  IdentityProfilePayload,
  IdentityResumeEntry,
  IdentityResumeEntryType,
  IdentitySocialAccount,
  IdentitySocialPlatform,
} from "@/lib/identity/types";
import {
  IdentityButton,
  IdentityCard,
  IdentityPill,
  cn,
} from "@/components/identity/identity-ui";

type Tab = "profile" | "social" | "portfolio" | "resume" | "privacy";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "social", label: "Social accounts", icon: Globe },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "resume", label: "Resume", icon: Shield },
  { id: "privacy", label: "Privacy", icon: Lock },
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

const PORTFOLIO_KINDS: IdentityPortfolioKind[] = ["video", "image", "campaign", "brand", "testimonial", "other"];
const RESUME_TYPES: IdentityResumeEntryType[] = [
  "experience",
  "industry",
  "brand",
  "campaign",
  "education",
  "certification",
];

export function IdentityEditClient({ initialPayload }: { initialPayload: IdentityProfilePayload }) {
  const [tab, setTab] = useState<Tab>("profile");
  const { profile } = initialPayload;

  const [core, setCore] = useState({
    fullName: profile.fullName ?? "",
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
  const [portfolio, setPortfolio] = useState<IdentityPortfolioItem[]>(initialPayload.portfolio);
  const [resume, setResume] = useState<IdentityResumeEntry[]>(initialPayload.resume);

  const [saving, setSaving] = useState(false);

  const saveCore = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(core),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Profile saved");
    } catch (err) {
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
          {tab === "profile" && <ProfileTab core={core} setCore={setCore} onSave={saveCore} saving={saving} />}
          {tab === "social" && <SocialTab social={social} setSocial={setSocial} />}
          {tab === "portfolio" && <PortfolioTab portfolio={portfolio} setPortfolio={setPortfolio} />}
          {tab === "resume" && <ResumeTab resume={resume} setResume={setResume} />}
          {tab === "privacy" && (
            <PrivacyTab
              privacyVisibility={core.privacyVisibility}
              onChangeVisibility={(v) => setCore((c) => ({ ...c, privacyVisibility: v }))}
              onSave={saveCore}
              saving={saving}
              identityVerified={profile.identityVerified}
              documentsVerified={profile.documentsVerified}
              socialVerified={profile.socialVerified}
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
}: {
  core: CoreState;
  setCore: React.Dispatch<React.SetStateAction<CoreState>>;
  onSave: () => void;
  saving: boolean;
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
        <div className="relative flex items-end gap-4 px-6 pb-5">
          <div className="-mt-10 flex flex-col items-center gap-2">
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
          </div>
          <p className="pb-1 text-[11.5px] text-[#9A9388]">
            {avatarUpload.uploading ? `Uploading photo… ${avatarUpload.progress}%` : "Square photo works best."}
          </p>
        </div>
      </IdentityCard>

      <IdentityCard className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditField label="Full name">
            <input
              className="identity-input"
              value={core.fullName}
              onChange={(e) => setCore((c) => ({ ...c, fullName: e.target.value }))}
              maxLength={120}
            />
          </EditField>
          <EditField label="Headline">
            <input
              className="identity-input"
              placeholder="e.g. Beauty & lifestyle creator"
              value={core.headline}
              onChange={(e) => setCore((c) => ({ ...c, headline: e.target.value }))}
              maxLength={160}
            />
          </EditField>
        </div>

        <EditField label="Bio">
          <textarea
            className="identity-input resize-none"
            rows={4}
            value={core.bio}
            onChange={(e) => setCore((c) => ({ ...c, bio: e.target.value }))}
            maxLength={2000}
          />
        </EditField>

        <div className="grid gap-4 sm:grid-cols-3">
          <EditField label="Country">
            <input
              className="identity-input"
              value={core.country}
              onChange={(e) => setCore((c) => ({ ...c, country: e.target.value }))}
            />
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
          <EditField label="Availability note (optional)">
            <input
              className="identity-input"
              value={core.availabilityNote}
              onChange={(e) => setCore((c) => ({ ...c, availabilityNote: e.target.value }))}
              maxLength={300}
            />
          </EditField>
        </div>

        <EditField label="Media kit / rate card URL (optional)">
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
                    setCore((c) => ({ ...c, contactPreferences: { ...c.contactPreferences, [key]: checked } }))
                  }
                />
                {key === "email" ? "Email" : key === "in_app" ? "In-app notifications" : "Booking requests"}
              </label>
            ))}
          </div>
        </div>
      </IdentityCard>

      <div className="flex justify-end">
        <IdentityButton onClick={onSave} loading={saving}>
          <Save className="h-4 w-4" /> Save profile
        </IdentityButton>
      </div>
      <style jsx global>{identityInputStyles}</style>
    </div>
  );
}

// ─── Social tab ─────────────────────────────────────────────────────────────

function SocialTab({
  social,
  setSocial,
}: {
  social: IdentitySocialAccount[];
  setSocial: React.Dispatch<React.SetStateAction<IdentitySocialAccount[]>>;
}) {
  const [form, setForm] = useState({ platform: "instagram" as IdentitySocialPlatform, handle: "", url: "", followers: 0 });
  const [saving, setSaving] = useState(false);

  async function addAccount() {
    setSaving(true);
    try {
      const res = await fetch("/api/identity/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add account");
      setSocial((prev) => [json.account, ...prev.filter((a) => a.platform !== form.platform)]);
      setForm({ platform: "instagram", handle: "", url: "", followers: 0 });
      toast.success("Account added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount(id: string) {
    setSocial((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/identity/social?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="p-6">
        <p className="mb-4 text-[13px] font-semibold text-[#1C1B19]">Add a channel</p>
        <div className="grid gap-3 sm:grid-cols-4">
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
            type="number"
            placeholder="Followers"
            value={form.followers || ""}
            onChange={(e) => setForm((f) => ({ ...f, followers: Number(e.target.value) }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <IdentityButton size="sm" onClick={addAccount} loading={saving}>
            <Plus className="h-3.5 w-3.5" /> Add channel
          </IdentityButton>
        </div>
      </IdentityCard>

      <div className="space-y-2.5">
        {social.map((a) => (
          <IdentityCard key={a.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13.5px] font-semibold capitalize text-[#1C1B19]">{a.platform}</p>
                {a.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-[#FF5A1F]" />}
              </div>
              <p className="truncate text-[12px] text-[#9A9388]">
                {a.handle ? `@${a.handle}` : a.url} · {a.followers.toLocaleString()} followers
              </p>
            </div>
            <button
              onClick={() => removeAccount(a.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#B9B3A6] hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </IdentityCard>
        ))}
      </div>
      <style jsx global>{identityInputStyles}</style>
    </div>
  );
}

// ─── Portfolio tab ──────────────────────────────────────────────────────────

function PortfolioTab({
  portfolio,
  setPortfolio,
}: {
  portfolio: IdentityPortfolioItem[];
  setPortfolio: React.Dispatch<React.SetStateAction<IdentityPortfolioItem[]>>;
}) {
  const [form, setForm] = useState({ kind: "image" as IdentityPortfolioKind, title: "", brandName: "", mediaUrl: "", externalUrl: "" });
  const [saving, setSaving] = useState(false);
  const upload = useCloudinaryUpload("jimvio/identity");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const result = await upload.upload(file, isVideo ? "video" : "image");
    if ("url" in result) setForm((f) => ({ ...f, mediaUrl: result.url, kind: isVideo ? "video" : "image" }));
    else toast.error(result.error);
  }

  async function addItem() {
    if (!form.title.trim()) return toast.error("Add a title");
    setSaving(true);
    try {
      const res = await fetch("/api/identity/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add item");
      setPortfolio((prev) => [...prev, json.item]);
      setForm({ kind: "image", title: "", brandName: "", mediaUrl: "", externalUrl: "" });
      toast.success("Added to portfolio");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/identity/portfolio?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function toggleFeatured(item: IdentityPortfolioItem) {
    const next = !item.isFeatured;
    setPortfolio((prev) => prev.map((p) => (p.id === item.id ? { ...p, isFeatured: next } : p)));
    await fetch("/api/identity/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isFeatured: next }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="p-6">
        <p className="mb-4 text-[13px] font-semibold text-[#1C1B19]">Add a portfolio piece</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="identity-input"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="identity-input"
            placeholder="Brand name (optional)"
            value={form.brandName}
            onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
          />
          <input
            className="identity-input"
            placeholder="External link (optional)"
            value={form.externalUrl}
            onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.uploading}
            className="identity-input flex items-center justify-center gap-1.5 text-[#7C766B] hover:border-black/20"
          >
            <Camera className="h-3.5 w-3.5" />
            {upload.uploading ? `Uploading… ${upload.progress}%` : form.mediaUrl ? "Media added ✓" : "Upload photo/video"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <IdentityButton size="sm" onClick={addItem} loading={saving}>
            <Plus className="h-3.5 w-3.5" /> Add to portfolio
          </IdentityButton>
        </div>
      </IdentityCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {portfolio.map((item) => (
          <div key={item.id} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/[0.06] bg-[#F1EFEA]">
            {item.thumbnailUrl || item.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl ?? item.mediaUrl ?? ""} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#C7C1B4]">
                <Briefcase className="h-6 w-6" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => toggleFeatured(item)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full bg-white/90",
                    item.isFeatured ? "text-[#D6480F]" : "text-[#59544B]",
                  )}
                  title="Feature"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-500"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="truncate text-[12px] font-semibold text-white">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{identityInputStyles}</style>
    </div>
  );
}

// ─── Resume tab ─────────────────────────────────────────────────────────────

function ResumeTab({
  resume,
  setResume,
}: {
  resume: IdentityResumeEntry[];
  setResume: React.Dispatch<React.SetStateAction<IdentityResumeEntry[]>>;
}) {
  const [form, setForm] = useState({
    entryType: "experience" as IdentityResumeEntryType,
    title: "",
    organization: "",
    startedOn: "",
    endedOn: "",
    isCurrent: false,
  });
  const [saving, setSaving] = useState(false);

  async function addEntry() {
    if (!form.title.trim()) return toast.error("Add a title");
    setSaving(true);
    try {
      const res = await fetch("/api/identity/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add entry");
      setResume((prev) => [...prev, json.entry]);
      setForm({ entryType: "experience", title: "", organization: "", startedOn: "", endedOn: "", isCurrent: false });
      toast.success("Added to resume");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    setResume((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/identity/resume?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="p-6">
        <p className="mb-4 text-[13px] font-semibold text-[#1C1B19]">Add experience</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="identity-input"
            value={form.entryType}
            onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as IdentityResumeEntryType }))}
          >
            {RESUME_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="identity-input"
            placeholder="Title (e.g. Lead Creator)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="identity-input"
            placeholder="Organization / Brand"
            value={form.organization}
            onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="identity-input"
              value={form.startedOn}
              onChange={(e) => setForm((f) => ({ ...f, startedOn: e.target.value }))}
            />
            {!form.isCurrent && (
              <input
                type="date"
                className="identity-input"
                value={form.endedOn}
                onChange={(e) => setForm((f) => ({ ...f, endedOn: e.target.value }))}
              />
            )}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12.5px] text-[#3E3A34]">
          <Toggle checked={form.isCurrent} onChange={(v) => setForm((f) => ({ ...f, isCurrent: v }))} />
          This is current
        </label>
        <div className="mt-3 flex justify-end">
          <IdentityButton size="sm" onClick={addEntry} loading={saving}>
            <Plus className="h-3.5 w-3.5" /> Add to resume
          </IdentityButton>
        </div>
      </IdentityCard>

      <div className="space-y-2.5">
        {resume.map((entry) => (
          <IdentityCard key={entry.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[#1C1B19]">{entry.title}</p>
              <p className="truncate text-[12px] text-[#9A9388]">
                {entry.organization} · {entry.entryType}
              </p>
            </div>
            <button
              onClick={() => removeEntry(entry.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#B9B3A6] hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </IdentityCard>
        ))}
      </div>
      <style jsx global>{identityInputStyles}</style>
    </div>
  );
}

// ─── Privacy tab ────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: { value: IdentityPrivacyVisibility; label: string; description: string }[] = [
  { value: "public", label: "Public", description: "Anyone on the internet can view your profile." },
  { value: "followers_only", label: "Followers only", description: "Only people who follow you can view details." },
  { value: "brand_only", label: "Brands only", description: "Visible to signed-in brand/business accounts." },
  { value: "private", label: "Private", description: "Only you (and admins) can view your profile." },
];

function PrivacyTab({
  privacyVisibility,
  onChangeVisibility,
  onSave,
  saving,
  identityVerified,
  documentsVerified,
  socialVerified,
}: {
  privacyVisibility: IdentityPrivacyVisibility;
  onChangeVisibility: (v: IdentityPrivacyVisibility) => void;
  onSave: () => void;
  saving: boolean;
  identityVerified: boolean;
  documentsVerified: boolean;
  socialVerified: boolean;
}) {
  const [requesting, setRequesting] = useState<string | null>(null);

  async function requestVerification(requestType: "identity" | "documents" | "social") {
    setRequesting(requestType);
    try {
      const res = await fetch("/api/identity/verify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit request");
      toast.success("Verification request submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setRequesting(null);
    }
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="p-6">
        <p className="mb-1 text-[13px] font-semibold text-[#1C1B19]">Profile visibility</p>
        <p className="mb-4 text-[12.5px] text-[#8B8579]">Choose who can see your full Jimvio identity profile.</p>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const active = privacyVisibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChangeVisibility(opt.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  active ? "border-[#FF5A1F] bg-[#FFF6F1]" : "border-black/[0.06] hover:border-black/15",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-[#FF5A1F] bg-[#FF5A1F]" : "border-black/20",
                  )}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1C1B19]">{opt.label}</p>
                  <p className="text-[12px] text-[#8B8579]">{opt.description}</p>
                </div>
                {opt.value === "private" ? (
                  <EyeOff className="ml-auto h-4 w-4 shrink-0 text-[#B9B3A6]" />
                ) : (
                  <Eye className="ml-auto h-4 w-4 shrink-0 text-[#B9B3A6]" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <IdentityButton onClick={onSave} loading={saving}>
            <Save className="h-4 w-4" /> Save privacy settings
          </IdentityButton>
        </div>
      </IdentityCard>

      <IdentityCard className="p-6">
        <p className="mb-1 text-[13px] font-semibold text-[#1C1B19]">Verification</p>
        <p className="mb-4 text-[12.5px] text-[#8B8579]">
          Get a verified badge to build trust with brands and buyers.
        </p>
        <div className="space-y-2.5">
          <VerificationRow
            label="Identity verification"
            verified={identityVerified}
            onRequest={() => requestVerification("identity")}
            requesting={requesting === "identity"}
          />
          <VerificationRow
            label="Document verification"
            verified={documentsVerified}
            onRequest={() => requestVerification("documents")}
            requesting={requesting === "documents"}
          />
          <VerificationRow
            label="Social account verification"
            verified={socialVerified}
            onRequest={() => requestVerification("social")}
            requesting={requesting === "social"}
          />
        </div>
      </IdentityCard>
    </div>
  );
}

function VerificationRow({
  label,
  verified,
  onRequest,
  requesting,
}: {
  label: string;
  verified: boolean;
  onRequest: () => void;
  requesting: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] p-3.5">
      <div className="flex items-center gap-2">
        {verified ? <BadgeCheck className="h-4 w-4 text-[#FF5A1F]" /> : <Shield className="h-4 w-4 text-[#B9B3A6]" />}
        <span className="text-[13px] font-medium text-[#1C1B19]">{label}</span>
      </div>
      {verified ? (
        <IdentityPill tone="success">Verified</IdentityPill>
      ) : (
        <IdentityButton variant="outline" size="sm" onClick={onRequest} loading={requesting}>
          Request
        </IdentityButton>
      )}
    </div>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#7C766B]">{label}</span>
      {children}
    </label>
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
