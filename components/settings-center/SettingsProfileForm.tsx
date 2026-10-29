"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Globe, Instagram, Link2, Save, UserRound, Youtube } from "lucide-react";
import { toast } from "sonner";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import { getInitials } from "@/lib/utils";
import type { IdentityProfilePayload, IdentitySocialAccount } from "@/lib/identity/types";
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

type SocialDraft = {
  website: string;
  instagram: string;
  youtube: string;
  x: string;
};

function socialUrl(accounts: IdentitySocialAccount[], platform: string, fallback = ""): string {
  return accounts.find((account) => account.platform === platform)?.url ?? fallback;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.74L5.2 22H1.94l8.02-9.16L1.5 2h6.75l4.66 6.18L18.244 2Zm-1.16 18h1.81L7.01 3.91H5.07L17.084 20Z"
      />
    </svg>
  );
}

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
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const country = profile.country ?? "";
  const [social, setSocial] = useState<SocialDraft>({
    website: profile.website || socialUrl(initialPayload.social, "website"),
    instagram: socialUrl(initialPayload.social, "instagram"),
    youtube: socialUrl(initialPayload.social, "youtube"),
    x: socialUrl(initialPayload.social, "x"),
  });
  const [accounts, setAccounts] = useState(initialPayload.social);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useCloudinaryUpload("jimvio/avatars");
  const bioMax = useMemo(() => bioLimitForValue(profile.bio ?? ""), [profile.bio]);

  const composedName = joinFullName(firstName, lastName);
  const visibleName = displayName.trim() || composedName || "Your name";
  const previewUrl = publicProfileUrl(origin, username || profile.username);

  async function persistAvatar(nextUrl: string) {
    setPhotoSaving(true);
    try {
      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: nextUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save photo");
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save photo");
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handlePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Images must be 8 MB or smaller.");
      return;
    }
    const result = await upload.upload(file, "image");
    if (!("url" in result)) {
      toast.error(result.error);
      return;
    }
    setAvatarUrl(result.url);
    await persistAvatar(result.url);
  }

  async function upsertSocial(platform: keyof SocialDraft | "website", url: string) {
    const existing = accounts.find((account) => account.platform === platform);
    const trimmed = url.trim();
    if (!trimmed && existing) {
      const res = await fetch(`/api/identity/social?id=${existing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not remove ${platform} link`);
      setAccounts((current) => current.filter((account) => account.id !== existing.id));
      return;
    }
    if (!trimmed) return;
    const res = await fetch("/api/identity/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, url: trimmed }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Could not save ${platform} link`);
    if (json.account) {
      setAccounts((current) => [
        json.account,
        ...current.filter((account) => account.platform !== platform && account.id !== json.account.id),
      ]);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const nextErrors: Record<string, string> = {};
    const nextDisplay = resolveDisplayName({ displayName, firstName, lastName });
    if (!nextDisplay) nextErrors.displayName = "Enter a display name.";
    const usernameError = username.trim() ? validateUsername(username) : null;
    if (usernameError) nextErrors.username = usernameError;
    if (bio.length > bioMax) nextErrors.bio = `Bio must be ${bioMax} characters or fewer.`;
    const urlErrors = {
      website: validateOptionalHttpUrl(social.website, "website"),
      instagram: validateOptionalHttpUrl(social.instagram, "Instagram"),
      youtube: validateOptionalHttpUrl(social.youtube, "YouTube"),
      x: validateOptionalHttpUrl(social.x, "X"),
    };
    for (const [key, message] of Object.entries(urlErrors)) {
      if (message) nextErrors[key] = message;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Fix the highlighted fields, then try again.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: nextDisplay,
        bio: bio.trim(),
        website: social.website.trim(),
        headline: headline.trim(),
        city: city.trim(),
        avatarUrl,
      };
      const nextUsername = normalizeUsername(username);
      if (nextUsername && nextUsername !== (profile.username ?? "").toLowerCase()) {
        payload.username = nextUsername;
      }

      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save profile");

      await Promise.all([
        upsertSocial("website", social.website),
        upsertSocial("instagram", social.instagram),
        upsertSocial("youtube", social.youtube),
        upsertSocial("x", social.x),
      ]);

      toast.success("Profile saved");
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
        description="Manage your public professional identity and how you appear on Jimvio."
        menuButton={menuButton}
      />

      <SettingsCard className="mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#FF5A1F] text-[20px] font-semibold text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(visibleName || "U")
              )}
              <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#111827] text-white">
                <Camera className="h-3 w-3" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[#111827]">{visibleName}</p>
              <p className="truncate text-[13px] text-[#6B7280]">
                {username ? `@${normalizeUsername(username)}` : "Add a username"}
              </p>
              <p className="truncate text-[13px] text-[#6B7280]">{email || "—"}</p>
            </div>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handlePhoto(file);
                event.target.value = "";
              }}
            />
            <SettingsButton
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={upload.uploading || photoSaving}
            >
              <Camera className="h-4 w-4" />
              Change photo
            </SettingsButton>
          </div>
        </div>
      </SettingsCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SettingsCard
          title="Basic information"
          description="Update your basic profile information."
          icon={<UserRound className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="First name" htmlFor="settings-first-name">
                <input
                  id="settings-first-name"
                  className={settingsInputClass}
                  value={firstName}
                  onChange={(event) => {
                    const next = event.target.value;
                    setFirstName(next);
                    if (!displayName.trim() || displayName === composedName) {
                      setDisplayName(joinFullName(next, lastName));
                    }
                  }}
                  maxLength={80}
                  autoComplete="given-name"
                />
              </SettingsField>
              <SettingsField label="Last name" htmlFor="settings-last-name">
                <input
                  id="settings-last-name"
                  className={settingsInputClass}
                  value={lastName}
                  onChange={(event) => {
                    const next = event.target.value;
                    setLastName(next);
                    if (!displayName.trim() || displayName === composedName) {
                      setDisplayName(joinFullName(firstName, next));
                    }
                  }}
                  maxLength={80}
                  autoComplete="family-name"
                />
              </SettingsField>
            </div>

            <SettingsField
              label="Display name"
              htmlFor="settings-display-name"
              error={fieldErrors.displayName}
            >
              <input
                id="settings-display-name"
                className={settingsInputClass}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
              />
            </SettingsField>

            <SettingsField
              label="Username"
              htmlFor="settings-username"
              hint={previewUrl}
              error={fieldErrors.username}
            >
              <input
                id="settings-username"
                className={settingsInputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={24}
                autoComplete="username"
              />
            </SettingsField>

            <SettingsField label="Headline" htmlFor="settings-headline" hint="Used on your public creator profile and campaign applications.">
              <input
                id="settings-headline"
                className={settingsInputClass}
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={160}
                placeholder="e.g. Beauty and lifestyle creator"
              />
            </SettingsField>

            <SettingsField label="Bio" htmlFor="settings-bio" error={fieldErrors.bio}>
              <textarea
                id="settings-bio"
                className={settingsTextareaClass}
                value={bio}
                maxLength={bioMax}
                rows={4}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell the Jimvio community about yourself..."
              />
              <p className="mt-1.5 text-right text-[12px] text-[#9CA3AF]">
                {bio.length}/{bioMax}
              </p>
            </SettingsField>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="City" htmlFor="settings-city">
                <input
                  id="settings-city"
                  className={settingsInputClass}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </SettingsField>
              <SettingsField label="Country" htmlFor="settings-country">
                <LockedCountryField fallback={country || null} />
              </SettingsField>
            </div>

            {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}

            <SettingsButton type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Save changes
            </SettingsButton>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Social links"
          description="Add your social media links to grow your audience."
          icon={<Link2 className="h-4 w-4" />}
        >
          <div className="space-y-3">
            <SocialField
              id="settings-website"
              icon={<Globe className="h-4 w-4" />}
              value={social.website}
              error={fieldErrors.website}
              placeholder="https://yourwebsite.com"
              onChange={(website) => setSocial((current) => ({ ...current, website }))}
            />
            <SocialField
              id="settings-instagram"
              icon={<Instagram className="h-4 w-4" />}
              value={social.instagram}
              error={fieldErrors.instagram}
              placeholder="https://instagram.com/username"
              onChange={(instagram) => setSocial((current) => ({ ...current, instagram }))}
            />
            <SocialField
              id="settings-youtube"
              icon={<Youtube className="h-4 w-4" />}
              value={social.youtube}
              error={fieldErrors.youtube}
              placeholder="https://youtube.com/@username"
              onChange={(youtube) => setSocial((current) => ({ ...current, youtube }))}
            />
            <SocialField
              id="settings-x"
              icon={<XIcon className="h-4 w-4" />}
              value={social.x}
              error={fieldErrors.x}
              placeholder="https://x.com/username"
              onChange={(x) => setSocial((current) => ({ ...current, x }))}
            />
          </div>
        </SettingsCard>
      </div>
    </form>
  );
}

function SocialField({
  id,
  icon,
  value,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#6B7280]">
          {icon}
        </span>
        <input
          id={id}
          className={`${settingsInputClass} pl-10`}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          inputMode="url"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] text-[#B42318]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
