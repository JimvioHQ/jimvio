"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  Camera,
  Eye,
  Globe2,
  ImagePlus,
  Link2,
  MapPin,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import { getInitials } from "@/lib/utils";
import type {
  IdentityAvailability,
  IdentityProfilePayload,
  IdentitySocialAccount,
} from "@/lib/identity/types";
import {
  bioLimitForValue,
  joinFullName,
  normalizeUsername,
  publicProfileUrl,
  resolveDisplayName,
  splitFullName,
  validateOptionalHttpUrl,
  validateUsername,
} from "@/lib/settings/profile";
import { evaluateCreatorProfileCompletion } from "@/lib/identity/creator-profile-completion";
import { useSettingsCenter } from "./settings-center-context";
import {
  SettingsButton,
  SettingsCard,
  SettingsField,
  SettingsPageHeader,
  SettingsStatus,
  settingsInputClass,
  settingsTextareaClass,
} from "./settings-ui";
import { LockedCountryField } from "@/components/geo/LockedCountryField";
import { CategoryPicker } from "@/components/identity/CategoryPicker";
import { CreatorProfileChecklist } from "@/components/identity/CreatorProfileChecklist";
import { SocialAccountsManager } from "@/components/identity/SocialAccountsManager";

const AVAILABILITY: { value: IdentityAvailability; label: string }[] = [
  { value: "open", label: "Open to work" },
  { value: "limited", label: "Limited availability" },
  { value: "booked", label: "Fully booked" },
  { value: "unavailable", label: "Not available" },
];

/**
 * The one place to edit a Jimvio profile. Everything here is what people see
 * on /u/username — in communities, UGC, the marketplace and everywhere else.
 */
export function SettingsProfileForm({
  initialPayload,
  email,
  origin,
}: {
  initialPayload: IdentityProfilePayload;
  email: string;
  origin: string;
}) {
  const { menuButton } = useSettingsCenter();
  const profile = initialPayload.profile;
  const split = splitFullName(profile.fullName ?? "");
  const [firstName, setFirstName] = useState(split.firstName);
  const [lastName, setLastName] = useState(split.lastName);
  const [displayName, setDisplayName] = useState(profile.fullName ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [categories, setCategories] = useState<string[]>((profile.industries ?? []).slice(0, 1));
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [coverImage, setCoverImage] = useState(profile.coverImage ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const country = profile.country ?? "";
  const [languages, setLanguages] = useState<string[]>(profile.languages ?? []);
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [availability, setAvailability] = useState<IdentityAvailability>(profile.availability ?? "open");
  const [availabilityNote, setAvailabilityNote] = useState(profile.availabilityNote ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [mediaKitUrl, setMediaKitUrl] = useState(profile.mediaKitUrl ?? "");
  const [accounts, setAccounts] = useState<IdentitySocialAccount[]>(initialPayload.social);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarUpload = useCloudinaryUpload("jimvio/avatars");
  const coverUpload = useCloudinaryUpload("jimvio/identity");
  const bioMax = useMemo(() => bioLimitForValue(profile.bio ?? ""), [profile.bio]);

  const composedName = joinFullName(firstName, lastName);
  const visibleName = displayName.trim() || composedName || "Your name";
  const handle = normalizeUsername(username) || profile.username || "";
  const previewUrl = publicProfileUrl(origin, handle);
  const socialCount = accounts.filter((a) => a.platform !== "website").length;

  const completion = evaluateCreatorProfileCompletion({
    fullName: displayName.trim() || composedName,
    username: handle,
    categories,
    headline,
    bio,
    country,
    socialCount,
  });

  async function persist(patch: Record<string, unknown>, success: string) {
    const res = await fetch("/api/identity/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not save");
    toast.success(success);
  }

  async function uploadImage(file: File, kind: "avatar" | "cover") {
    if (!file.type.startsWith("image/")) return toast.error("Choose a JPG, PNG, or WebP image.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Images must be 8 MB or smaller.");
    const result = await (kind === "avatar" ? avatarUpload : coverUpload).upload(file, "image");
    if (!("url" in result)) return toast.error(result.error);
    try {
      if (kind === "avatar") {
        setAvatarUrl(result.url);
        await persist({ avatarUrl: result.url }, "Profile photo updated");
      } else {
        setCoverImage(result.url);
        await persist({ coverImage: result.url }, "Cover updated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const nextErrors: Record<string, string> = {};
    const nextDisplay = resolveDisplayName({ displayName, firstName, lastName });
    if (!nextDisplay) nextErrors.displayName = "Enter a display name.";
    const usernameError = username.trim() ? validateUsername(username) : null;
    if (usernameError) nextErrors.username = usernameError;
    if (bio.length > bioMax) nextErrors.bio = `Bio must be ${bioMax} characters or fewer.`;
    const webErr = validateOptionalHttpUrl(website, "website");
    if (webErr) nextErrors.website = webErr;
    const kitErr = validateOptionalHttpUrl(mediaKitUrl, "media kit");
    if (kitErr) nextErrors.mediaKitUrl = kitErr;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Fix the highlighted fields, then try again.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: nextDisplay,
        headline: headline.trim(),
        bio: bio.trim(),
        industries: categories,
        city: city.trim(),
        languages,
        skills,
        availability,
        availabilityNote: availabilityNote.trim(),
        website: website.trim(),
        mediaKitUrl: mediaKitUrl.trim(),
      };
      const nextUsername = normalizeUsername(username);
      if (nextUsername && nextUsername !== (profile.username ?? "").toLowerCase()) payload.username = nextUsername;
      await persist(payload, "Profile saved");
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <SettingsPageHeader
        title="Profile"
        description="One profile for all of Jimvio. What you set here is what people see on your public page, in communities, UGC campaigns and the marketplace."
        menuButton={menuButton}
      />

      {/* Hero preview — matches the public profile */}
      <section className="mx-auto mb-5 max-w-3xl overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
        <div className="relative h-32 bg-[linear-gradient(135deg,#FFEDE2,#FFF7F0_45%,#F3F1EC)] sm:h-40">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
          ) : null}
          <input
            ref={coverRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f, "cover");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur hover:bg-black/65"
          >
            <ImagePlus className="h-3.5 w-3.5" /> {coverUpload.uploading ? `${coverUpload.progress}%` : "Change cover"}
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="-mt-10 flex items-end gap-4">
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[26px] border-4 border-white bg-[#FF5A1F] text-[24px] font-semibold text-white shadow-lg"
              aria-label="Change profile photo"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(visibleName || "U")
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadImage(f, "avatar");
                e.target.value = "";
              }}
            />
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[18px] font-semibold text-[#111827]">{visibleName}</p>
                {profile.identityVerified ? <BadgeCheck className="h-4 w-4 text-[#FF5A1F]" aria-label="Verified" /> : null}
              </div>
              <p className="truncate text-[13px] text-[#6B7280]">
                {handle ? `@${handle}` : "Add a username"} · {email || "—"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {categories[0] ? (
                  <span className="rounded-full bg-[#FFF1EA] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#D6480F]">
                    {categories[0]}
                  </span>
                ) : null}

              </div>
            </div>
          </div>
          {handle ? (
            <Link
              href={`/u/${handle}`}
              className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#111827] hover:border-[#9CA3AF] sm:self-auto"
            >
              <Eye className="h-4 w-4" /> View public profile
            </Link>
          ) : null}
        </div>
        {completion.complete ? null : (
          <div className="border-t border-[#F3F4F6] px-5 py-4 sm:px-6">
            <CreatorProfileChecklist completion={completion} saved={saved} />
          </div>
        )}
      </section>

      <div className="mx-auto max-w-3xl">
        <div className="space-y-5">
          <SettingsCard title="About you" description="Who you are and what you make." icon={<UserRound className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="First name" htmlFor="settings-first-name">
                  <input
                    id="settings-first-name"
                    className={settingsInputClass}
                    value={firstName}
                    maxLength={80}
                    autoComplete="given-name"
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (!displayName.trim() || displayName === composedName) setDisplayName(joinFullName(e.target.value, lastName));
                    }}
                  />
                </SettingsField>
                <SettingsField label="Last name" htmlFor="settings-last-name">
                  <input
                    id="settings-last-name"
                    className={settingsInputClass}
                    value={lastName}
                    maxLength={80}
                    autoComplete="family-name"
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (!displayName.trim() || displayName === composedName) setDisplayName(joinFullName(firstName, e.target.value));
                    }}
                  />
                </SettingsField>
              </div>
              <div id="field-fullName" className="scroll-mt-24">
                <SettingsField label="Display name *" htmlFor="settings-display-name" error={fieldErrors.displayName}>
                  <input
                    id="settings-display-name"
                    className={settingsInputClass}
                    value={displayName}
                    maxLength={120}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </SettingsField>
              </div>
              <div id="field-username" className="scroll-mt-24">
                <SettingsField label="Username *" htmlFor="settings-username" hint={previewUrl} error={fieldErrors.username}>
                  <input
                    id="settings-username"
                    className={settingsInputClass}
                    value={username}
                    maxLength={24}
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  />
                </SettingsField>
              </div>
              <div id="field-categories" className="scroll-mt-24">
                <SettingsField label="What you create *">
                  <CategoryPicker value={categories} onChange={setCategories} />
                </SettingsField>
              </div>
              <div id="field-headline" className="scroll-mt-24">
                <SettingsField label="Headline *" htmlFor="settings-headline" hint="One line under your name, e.g. “Afrobeats dancer from Kigali”.">
                  <input
                    id="settings-headline"
                    className={settingsInputClass}
                    value={headline}
                    maxLength={160}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </SettingsField>
              </div>
              <div id="field-bio" className="scroll-mt-24">
                <SettingsField label="Bio *" htmlFor="settings-bio" error={fieldErrors.bio}>
                  <textarea
                    id="settings-bio"
                    className={settingsTextareaClass}
                    value={bio}
                    maxLength={bioMax}
                    rows={5}
                    placeholder="Tell brands and the community about you, your content and your audience."
                    onChange={(e) => setBio(e.target.value)}
                  />
                  <p className="mt-1.5 text-right text-[12px] text-[#9CA3AF]">
                    {bio.length}/{bioMax}
                  </p>
                </SettingsField>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Location & languages" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="City" htmlFor="settings-city">
                <input id="settings-city" className={settingsInputClass} value={city} onChange={(e) => setCity(e.target.value)} />
              </SettingsField>
              <div id="field-country" className="scroll-mt-24">
                <SettingsField label="Country">
                  <LockedCountryField fallback={country || null} />
                </SettingsField>
              </div>
              <div className="sm:col-span-2">
                <SettingsField label="Languages you speak">
                  <TagInput values={languages} onChange={setLanguages} placeholder="English, Kinyarwanda… press Enter" />
                </SettingsField>
              </div>
            </div>
          </SettingsCard>

          <div id="field-social" className="scroll-mt-24">
            <SettingsCard
              title="Social accounts"
              description="Verified accounts show on your profile with their real followers and count for campaigns."
              icon={<Link2 className="h-4 w-4" />}
            >
              <SocialAccountsManager accounts={accounts} onChange={setAccounts} />
            </SettingsCard>
          </div>

          <SettingsCard title="Skills & work" description="Shown to brands looking for creators." icon={<Briefcase className="h-4 w-4" />}>
            <div className="space-y-4">
              <SettingsField label="Skills">
                <TagInput values={skills} onChange={setSkills} placeholder="Video editing, voice-over… press Enter" />
              </SettingsField>
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Availability" htmlFor="settings-availability">
                  <select
                    id="settings-availability"
                    className={settingsInputClass}
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as IdentityAvailability)}
                  >
                    {AVAILABILITY.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </SettingsField>
                <SettingsField label="Availability note" htmlFor="settings-availability-note">
                  <input
                    id="settings-availability-note"
                    className={settingsInputClass}
                    value={availabilityNote}
                    placeholder="Optional"
                    onChange={(e) => setAvailabilityNote(e.target.value)}
                  />
                </SettingsField>
                <SettingsField label="Website" htmlFor="settings-website" error={fieldErrors.website}>
                  <div className="relative">
                    <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id="settings-website"
                      className={`${settingsInputClass} pl-10`}
                      value={website}
                      placeholder="https://"
                      inputMode="url"
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </SettingsField>
                <SettingsField label="Media kit / rate card" htmlFor="settings-media-kit" error={fieldErrors.mediaKitUrl}>
                  <input
                    id="settings-media-kit"
                    className={settingsInputClass}
                    value={mediaKitUrl}
                    placeholder="https://"
                    inputMode="url"
                    onChange={(e) => setMediaKitUrl(e.target.value)}
                  />
                </SettingsField>
              </div>
            </div>
          </SettingsCard>

          {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}
          <div className="sticky bottom-3 z-10 flex justify-end">
            <SettingsButton type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Save profile
            </SettingsButton>
          </div>
        </div>

      </div>
    </form>
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
    const v = draft.trim().slice(0, 40);
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase()) && values.length < 20) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1.5 focus-within:border-[#FF5A1F]">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] text-[#374151]">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="text-[#9CA3AF] hover:text-[#111827]">
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
        className="min-w-[120px] flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-[#9CA3AF]"
      />
    </div>
  );
}
