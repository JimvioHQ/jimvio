"use client";

import { AccessPricingCard } from "./AccessPricingCard";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import {
  COMMUNITY_CATEGORIES,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  VISIBILITY_MODES,
  type OwnerCommunitySettings,
  type SettingsSectionId,
  type UpdateOwnerSettingsInput,
} from "@/lib/community/owner-console/settings";

type SaveFn = (
  patch: Omit<UpdateOwnerSettingsInput, "communityId">
) => Promise<unknown>;

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <header>
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-[12px] font-semibold text-[var(--color-text-primary)]">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-[13px] ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="font-semibold text-[var(--color-text-primary)]">
        {label}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition-transform before:content-[''] checked:bg-[#FF5A1F] checked:before:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 disabled:cursor-not-allowed"
      />
    </label>
  );
}

export function SettingsSectionForm({
  section,
  settings,
  canManage,
  canSecurity,
  isOwner,
  saving,
  onSave,
  onDanger,
  onExport,
}: {
  section: SettingsSectionId;
  settings: OwnerCommunitySettings;
  canManage: boolean;
  canSecurity: boolean;
  isOwner: boolean;
  saving: boolean;
  onSave: SaveFn;
  onDanger: (action: string, confirmSlug?: string) => Promise<unknown>;
  onExport: () => void;
}) {
  const readOnly = !canManage;
  const securityReadOnly = !canSecurity && !canManage;

  const [name, setName] = useState(settings.name);
  const [slug, setSlug] = useState(settings.slug);
  const [tagline, setTagline] = useState(settings.tagline ?? "");
  const [description, setDescription] = useState(settings.description ?? "");
  const [longDescription, setLongDescription] = useState(
    settings.longDescription ?? ""
  );
  const [category, setCategory] = useState(settings.category ?? "Other");
  const [language, setLanguage] = useState(settings.language ?? "en");
  const [timezone, setTimezone] = useState(settings.timezone ?? "UTC");
  const [region, setRegion] = useState(settings.region ?? "");
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl ?? "");
  const [coverImage, setCoverImage] = useState(settings.coverImage ?? "");
  const [bannerUrl, setBannerUrl] = useState(
    settings.bannerUrl ?? settings.config.branding.bannerUrl ?? ""
  );
  const [accentColor, setAccentColor] = useState(
    settings.accentColor ?? settings.config.branding.accentColor
  );
  const [theme, setTheme] = useState(settings.config.branding.theme);
  const [icon, setIcon] = useState(settings.config.branding.icon ?? "");
  const [visibility, setVisibility] = useState(settings.visibilityMode);
  const [approvalRequired, setApprovalRequired] = useState(
    settings.config.privacy.approvalRequired
  );
  const [ageRestriction, setAgeRestriction] = useState(
    settings.config.privacy.ageRestriction?.toString() ?? ""
  );
  const [searchVisible, setSearchVisible] = useState(
    settings.config.discovery.searchVisible
  );
  const [featured, setFeatured] = useState(settings.isFeatured);
  const [tags, setTags] = useState(settings.tags.join(", "));
  const [seoTitle, setSeoTitle] = useState(
    settings.config.discovery.seoTitle ?? ""
  );
  const [seoDescription, setSeoDescription] = useState(
    settings.config.discovery.seoDescription ?? ""
  );
  const [welcomeTitle, setWelcomeTitle] = useState(
    settings.config.onboarding.welcomeTitle ?? ""
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    settings.config.onboarding.welcomeMessage ?? ""
  );
  const [rules, setRules] = useState(settings.config.onboarding.rules ?? "");
  const [notif, setNotif] = useState(settings.config.notifications);
  const [live, setLive] = useState(settings.config.live);
  const [commerce, setCommerce] = useState(settings.config.commerce);
  const [ai, setAi] = useState(settings.config.ai);
  const [integrations, setIntegrations] = useState(
    settings.config.integrations
  );
  const [security, setSecurity] = useState(settings.config.security);
  const [groupDefaults, setGroupDefaults] = useState(
    settings.config.groupDefaults
  );
  const [channelDefaults, setChannelDefaults] = useState(
    settings.config.channelDefaults
  );
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [currency, setCurrency] = useState(settings.currency ?? "USD");
  const [isFree, setIsFree] = useState(settings.isFree);
  const [domains, setDomains] = useState(
    settings.config.security.allowedDomains.join(", ")
  );

  useEffect(() => {
    setName(settings.name);
    setSlug(settings.slug);
    setTagline(settings.tagline ?? "");
    setDescription(settings.description ?? "");
    setLongDescription(settings.longDescription ?? "");
    setCategory(settings.category ?? "Other");
    setLanguage(settings.language ?? "en");
    setTimezone(settings.timezone ?? "UTC");
    setRegion(settings.region ?? "");
    setAvatarUrl(settings.avatarUrl ?? "");
    setCoverImage(settings.coverImage ?? "");
    setBannerUrl(settings.bannerUrl ?? settings.config.branding.bannerUrl ?? "");
    setAccentColor(settings.accentColor ?? settings.config.branding.accentColor);
    setTheme(settings.config.branding.theme);
    setIcon(settings.config.branding.icon ?? "");
    setVisibility(settings.visibilityMode);
    setApprovalRequired(settings.config.privacy.approvalRequired);
    setAgeRestriction(
      settings.config.privacy.ageRestriction?.toString() ?? ""
    );
    setSearchVisible(settings.config.discovery.searchVisible);
    setFeatured(settings.isFeatured);
    setTags(settings.tags.join(", "));
    setSeoTitle(settings.config.discovery.seoTitle ?? "");
    setSeoDescription(settings.config.discovery.seoDescription ?? "");
    setWelcomeTitle(settings.config.onboarding.welcomeTitle ?? "");
    setWelcomeMessage(settings.config.onboarding.welcomeMessage ?? "");
    setRules(settings.config.onboarding.rules ?? "");
    setNotif(settings.config.notifications);
    setLive(settings.config.live);
    setCommerce(settings.config.commerce);
    setAi(settings.config.ai);
    setIntegrations(settings.config.integrations);
    setSecurity(settings.config.security);
    setGroupDefaults(settings.config.groupDefaults);
    setChannelDefaults(settings.config.channelDefaults);
    setCurrency(settings.currency ?? "USD");
    setIsFree(settings.isFree);
    setDomains(settings.config.security.allowedDomains.join(", "));
  }, [settings]);

  if (section === "general") {
    return (
      <SectionCard title="General" description="Core community identity and locale.">
        {settings.editorialOrigin === "editorial" && (
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Jimvio editorial community. Members see this as public Jimvio
            programming, not as a demo or seed label.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Community name">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Slug">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={readOnly}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={readOnly}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={readOnly}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <Input value={region} onChange={(e) => setRegion(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Tagline">
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={readOnly} />
          </Field>
        </div>
        <Field label="Short description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            rows={3}
          />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "general",
                name,
                slug,
                tagline: tagline || null,
                description: description || null,
                category,
                language,
                timezone,
                region: region || null,
              })
            }
          >
            Save general
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "branding") {
    return (
      <SectionCard title="Branding" description="Visual identity for your community.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold">Logo</p>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[11px] text-[var(--color-text-muted)]">
                No logo
              </div>
            )}
            {!readOnly && (
              <CloudinaryUploadButton
                folder="jimvio/community-avatars"
                buttonText="Upload logo"
                onUploadSuccess={(url) => setAvatarUrl(url)}
              />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold">Cover</p>
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="" className="h-20 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[11px] text-[var(--color-text-muted)]">
                No cover
              </div>
            )}
            {!readOnly && (
              <CloudinaryUploadButton
                folder="jimvio/community-covers"
                buttonText="Upload cover"
                onUploadSuccess={(url) => setCoverImage(url)}
              />
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Banner URL">
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Community icon">
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} disabled={readOnly} maxLength={4} />
          </Field>
          <Field label="Accent color">
            <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} disabled={readOnly} className="h-10 p-1" />
          </Field>
          <Field label="Theme">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              disabled={readOnly}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "branding",
                avatarUrl: avatarUrl || null,
                coverImage: coverImage || null,
                bannerUrl: bannerUrl || null,
                accentColor,
                config: {
                  branding: {
                    accentColor,
                    theme,
                    icon: icon || null,
                    bannerUrl: bannerUrl || null,
                  },
                },
              })
            }
          >
            Save branding
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "info") {
    return (
      <SectionCard title="Community Info" description="Public profile and long-form copy.">
        <Field label="Long description">
          <Textarea
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            disabled={readOnly}
            rows={8}
          />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "info",
                longDescription: longDescription || null,
                description: description || null,
                tagline: tagline || null,
              })
            }
          >
            Save info
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "privacy") {
    return (
      <SectionCard title="Privacy" description="Who can find and join this community.">
        <Field label="Visibility">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            disabled={readOnly}
            className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            {VISIBILITY_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
        <Toggle
          label="Approval required"
          checked={approvalRequired}
          onChange={setApprovalRequired}
          disabled={readOnly}
        />
        <Field label="Age restriction (optional)">
          <Input
            value={ageRestriction}
            onChange={(e) => setAgeRestriction(e.target.value)}
            disabled={readOnly}
            inputMode="numeric"
            placeholder="e.g. 18"
          />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "privacy",
                visibilityMode: visibility,
                config: {
                  privacy: {
                    visibility,
                    approvalRequired,
                    ageRestriction: ageRestriction
                      ? Number(ageRestriction)
                      : null,
                  },
                },
              })
            }
          >
            Save privacy
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "discovery") {
    return (
      <SectionCard title="Discovery" description="Search visibility, SEO, and social preview.">
        <Toggle label="Search visibility" checked={searchVisible} onChange={setSearchVisible} disabled={readOnly} />
        <Toggle label="Featured community" checked={featured} onChange={setFeatured} disabled={readOnly} />
        <Field label="Tags (comma-separated)">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="SEO title">
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="SEO description">
          <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} disabled={readOnly} rows={3} />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "discovery",
                isFeatured: featured,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                config: {
                  discovery: {
                    searchVisible,
                    featured,
                    tags: tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                    seoTitle: seoTitle || null,
                    seoDescription: seoDescription || null,
                  },
                },
              })
            }
          >
            Save discovery
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "onboarding") {
    return (
      <SectionCard title="Onboarding" description="Welcome experience for new members.">
        <Field label="Welcome screen title">
          <Input value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} disabled={readOnly} />
        </Field>
        <Field label="Welcome message">
          <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} disabled={readOnly} rows={3} />
        </Field>
        <Field label="Community rules">
          <Textarea value={rules} onChange={(e) => setRules(e.target.value)} disabled={readOnly} rows={5} />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "onboarding",
                config: {
                  onboarding: {
                    welcomeTitle: welcomeTitle || null,
                    welcomeMessage: welcomeMessage || null,
                    rules: rules || null,
                  },
                },
              })
            }
          >
            Save onboarding
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "groups") {
    return (
      <SectionCard title="Spaces Defaults" description="Starter Spaces and default permissions.">
        <Field label="Default Space template key">
          <Input
            value={groupDefaults.templateKey ?? ""}
            onChange={(e) =>
              setGroupDefaults((g) => ({ ...g, templateKey: e.target.value || null }))
            }
            disabled={readOnly}
            placeholder="e.g. beginners"
          />
        </Field>
        <Toggle
          label="Auto-create starter Spaces"
          checked={groupDefaults.autoCreateStarter}
          onChange={(v) => setGroupDefaults((g) => ({ ...g, autoCreateStarter: v }))}
          disabled={readOnly}
        />
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({ section: "groups", config: { groupDefaults } })
            }
          >
            Save Space defaults
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "channels") {
    return (
      <SectionCard title="Rooms Defaults" description="Default room templates and behaviors.">
        <Field label="Default room template">
          <Input
            value={channelDefaults.templateKey ?? ""}
            onChange={(e) =>
              setChannelDefaults((c) => ({
                ...c,
                templateKey: e.target.value || null,
              }))
            }
            disabled={readOnly}
          />
        </Field>
        <Field label="Default tabs (comma-separated)">
          <Input
            value={channelDefaults.defaultTabs.join(", ")}
            onChange={(e) =>
              setChannelDefaults((c) => ({
                ...c,
                defaultTabs: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
            disabled={readOnly}
          />
        </Field>
        <Field label="Slow mode defaults (seconds)">
          <Input
            value={String(channelDefaults.slowModeSeconds)}
            onChange={(e) =>
              setChannelDefaults((c) => ({
                ...c,
                slowModeSeconds: Number(e.target.value) || 0,
              }))
            }
            disabled={readOnly}
            inputMode="numeric"
          />
        </Field>
        <Toggle
          label="Threads enabled by default"
          checked={channelDefaults.threadsEnabled}
          onChange={(v) =>
            setChannelDefaults((c) => ({ ...c, threadsEnabled: v }))
          }
          disabled={readOnly}
        />
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({ section: "channels", config: { channelDefaults } })
            }
          >
            Save room defaults
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "notifications") {
    return (
      <SectionCard title="Notifications" description="Default notification channels for the community.">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["email", "Email"],
              ["push", "Push"],
              ["mentions", "Mentions"],
              ["announcements", "Announcements"],
              ["events", "Events"],
              ["commerce", "Commerce"],
            ] as const
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              checked={notif[key]}
              onChange={(v) => setNotif((n) => ({ ...n, [key]: v }))}
              disabled={readOnly}
            />
          ))}
        </div>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({ section: "notifications", config: { notifications: notif } })
            }
          >
            Save notifications
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "live") {
    return (
      <SectionCard title="Live" description="Default live session behavior.">
        <Toggle label="Recording defaults on" checked={live.recordingDefault} onChange={(v) => setLive((l) => ({ ...l, recordingDefault: v }))} disabled={readOnly} />
        <Toggle label="Waiting room" checked={live.waitingRoom} onChange={(v) => setLive((l) => ({ ...l, waitingRoom: v }))} disabled={readOnly} />
        <Toggle label="Screen share defaults on" checked={live.screenShareDefault} onChange={(v) => setLive((l) => ({ ...l, screenShareDefault: v }))} disabled={readOnly} />
        {!readOnly && (
          <Button type="button" disabled={saving} onClick={() => void onSave({ section: "live", config: { live } })}>
            Save live settings
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "commerce") {
    return (
      <div className="space-y-5">
      <AccessPricingCard
        initial={settings.accessPricing}
        readOnly={readOnly}
        saving={saving}
        onSave={(accessPricing) => onSave({ section: "commerce", accessPricing })}
      />
      <SectionCard title="Commerce" description="Storefront, memberships, and monetization.">
        <Toggle label="Community store" checked={commerce.storeEnabled} onChange={(v) => setCommerce((c) => ({ ...c, storeEnabled: v }))} disabled={readOnly} />
        <Toggle label="Affiliate" checked={commerce.affiliateEnabled} onChange={(v) => setCommerce((c) => ({ ...c, affiliateEnabled: v }))} disabled={readOnly} />
        <Toggle label="Donations" checked={commerce.donationsEnabled} onChange={(v) => setCommerce((c) => ({ ...c, donationsEnabled: v }))} disabled={readOnly} />
        <Toggle label="Memberships" checked={commerce.membershipsEnabled} onChange={(v) => setCommerce((c) => ({ ...c, membershipsEnabled: v }))} disabled={readOnly} />
        <Toggle label="Tax (future-ready)" checked={commerce.taxReady} onChange={(v) => setCommerce((c) => ({ ...c, taxReady: v }))} disabled={readOnly} />
        <Field label="Currency">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} disabled={readOnly} maxLength={3} />
        </Field>
        {!readOnly && (
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              void onSave({
                section: "commerce",
                currency,
                config: {
                  commerce: { ...commerce, currency },
                },
              })
            }
          >
            Save commerce
          </Button>
        )}
      </SectionCard>
      </div>
    );
  }

  if (section === "ai") {
    return (
      <SectionCard title="AI" description="Intelligence features for this community.">
        <Toggle label="AI summaries" checked={ai.summaries} onChange={(v) => setAi((a) => ({ ...a, summaries: v }))} disabled={readOnly} />
        <Toggle label="Knowledge suggestions" checked={ai.knowledgeSuggestions} onChange={(v) => setAi((a) => ({ ...a, knowledgeSuggestions: v }))} disabled={readOnly} />
        <Toggle label="Moderation assistance" checked={ai.moderationAssistance} onChange={(v) => setAi((a) => ({ ...a, moderationAssistance: v }))} disabled={readOnly} />
        <Toggle label="Recommendations" checked={ai.recommendations} onChange={(v) => setAi((a) => ({ ...a, recommendations: v }))} disabled={readOnly} />
        <Toggle label="Automation" checked={ai.automation} onChange={(v) => setAi((a) => ({ ...a, automation: v }))} disabled={readOnly} />
        {!readOnly && (
          <Button type="button" disabled={saving} onClick={() => void onSave({ section: "ai", config: { ai } })}>
            Save AI settings
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "integrations") {
    return (
      <SectionCard title="Integrations" description="Future-ready API, webhooks, apps, and SSO.">
        <Toggle label="API" checked={integrations.apiEnabled} onChange={(v) => setIntegrations((i) => ({ ...i, apiEnabled: v }))} disabled={readOnly} />
        <Toggle label="Webhooks" checked={integrations.webhooksEnabled} onChange={(v) => setIntegrations((i) => ({ ...i, webhooksEnabled: v }))} disabled={readOnly} />
        <Toggle label="External apps" checked={integrations.externalAppsEnabled} onChange={(v) => setIntegrations((i) => ({ ...i, externalAppsEnabled: v }))} disabled={readOnly} />
        <Toggle label="SSO placeholder" checked={integrations.ssoPlaceholder} onChange={(v) => setIntegrations((i) => ({ ...i, ssoPlaceholder: v }))} disabled={readOnly} />
        {!readOnly && (
          <Button type="button" disabled={saving} onClick={() => void onSave({ section: "integrations", config: { integrations } })}>
            Save integrations
          </Button>
        )}
      </SectionCard>
    );
  }

  if (section === "security") {
    return (
      <SectionCard title="Security" description="Access policies and safeguards.">
        <Toggle
          label="Require 2FA for staff"
          checked={security.require2fa}
          onChange={(v) => setSecurity((s) => ({ ...s, require2fa: v }))}
          disabled={securityReadOnly}
        />
        <Toggle
          label="Session controls"
          checked={security.sessionControls}
          onChange={(v) => setSecurity((s) => ({ ...s, sessionControls: v }))}
          disabled={securityReadOnly}
        />
        <Field label="Allowed domains (comma-separated)">
          <Input
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            disabled={securityReadOnly}
            placeholder="example.com, partner.org"
          />
        </Field>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Trusted admins are managed via Roles & Members. Session and domain
          policies are stored for enforcement phases.
        </p>
        <div className="flex flex-wrap gap-2">
          {!securityReadOnly && (
            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                void onSave({
                  section: "security",
                  config: {
                    security: {
                      ...security,
                      allowedDomains: domains
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean),
                    },
                  },
                })
              }
            >
              Save security
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onExport}>
            Export community data
          </Button>
        </div>
      </SectionCard>
    );
  }

  // danger
  return (
    <SectionCard title="Danger Zone" description="Irreversible or high-impact actions.">
      {!settings.isActive || settings.archivedAt ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[13px]">
          This community is archived.
          {isOwner && (
            <Button
              type="button"
              className="mt-3"
              disabled={saving}
              onClick={() => void onDanger("restore")}
            >
              Restore community
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Archive community
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Hide from discovery while preserving data.
            </p>
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={saving}
                onClick={() => void onDanger("archive")}
              >
                Archive
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Transfer ownership
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Future-ready — not enabled yet.
            </p>
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={saving}
                onClick={() => void onDanger("transfer")}
              >
                Transfer (coming soon)
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
            <p className="text-sm font-semibold text-rose-700">Delete community</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Soft-delete and retire the slug. Type{" "}
              <code className="font-mono">{settings.slug}</code> to confirm.
            </p>
            {isOwner && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={settings.slug}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving || deleteConfirm !== settings.slug}
                  onClick={() => void onDanger("delete", deleteConfirm)}
                >
                  Delete community
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {!isOwner && (
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Only the community owner can use Danger Zone actions.
        </p>
      )}
    </SectionCard>
  );
}
