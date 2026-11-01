"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Clock,
  Globe,
  Languages,
  Lock,
  MapPin,
  Pencil,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { formatNumber } from "@/lib/utils";
import { PersonAvatar } from "@/components/feed/PersonAvatar";
import { PresenceAvatarFrame } from "@/components/presence/PresenceAvatarFrame";
import { IdentityButton, IdentityCard, IdentityPill } from "@/components/identity/identity-ui";
import { IdentityTabNav, type IdentityTab } from "@/components/identity/IdentityTabNav";
import { IdentityOverviewPanel } from "@/components/identity/IdentityOverviewPanel";
import { IdentityModulePanel, type IdentitySurface } from "@/components/identity/IdentityModulePanel";
import { IdentityAnalyticsPanel } from "@/components/identity/IdentityAnalyticsPanel";
import { IdentityMediaKitPanel } from "@/components/identity/IdentityMediaKitPanel";
import { IdentityReviewsPanel } from "@/components/identity/IdentityReviewsPanel";
import { IdentityPortfolio } from "@/components/identity/IdentityPortfolio";
import { IdentityAchievements } from "@/components/identity/IdentityAchievements";
import { IdentityAiPanel } from "@/components/identity/IdentityAiPanel";
import { IdentitySocialLinks } from "@/components/identity/IdentitySocialLinks";
import { IdentityBookingForm } from "@/components/identity/IdentityBookingForm";
import { VerifiedBadge } from "@/components/identity/VerifiedBadge";
import { IdentityProfileActions } from "@/components/identity/IdentityProfileActions";

const AVAILABILITY_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  open: { label: "Open to work", tone: "success" },
  limited: { label: "Limited availability", tone: "warning" },
  booked: { label: "Fully booked", tone: "danger" },
  unavailable: { label: "Not available", tone: "neutral" },
};

const DEFAULT_TAB = "overview";

const MODULE_SURFACES: IdentitySurface[] = ["ugc", "affiliate", "marketplace", "community"];

export function IdentityProfileView({ payload }: { payload: IdentityProfilePayload }) {
  const { profile, isOwner, levelProgress } = payload;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || DEFAULT_TAB;

  const displayName = profile.fullName || profile.username || "Jimvio member";
  const availability = AVAILABILITY_META[profile.availability] ?? AVAILABILITY_META.open;

  // Only accounts the person proved are theirs are shown and counted.
  const verifiedSocial = useMemo(
    () => payload.social.filter((s) => s.isVerified || s.platform === "website"),
    [payload.social],
  );
  const socialFollowers = useMemo(
    () => verifiedSocial.filter((s) => s.isVerified).reduce((sum, s) => sum + s.followers, 0),
    [verifiedSocial],
  );
  const category = profile.industries?.[0] ?? null;
  const countryName = useMemo(() => {
    if (!profile.country) return null;
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(profile.country.toUpperCase()) ?? profile.country;
    } catch {
      return profile.country;
    }
  }, [profile.country]);
  /** Jimvio user→user followers (includes showcase display floor). Not community members. */
  const jimvioFollowers = payload.jimvioFollowers ?? 0;
  const jimvioFollowing = payload.jimvioFollowing ?? 0;
  const totalReach = socialFollowers + jimvioFollowers;

  const tabs: IdentityTab[] = useMemo(() => {
    const list: IdentityTab[] = [
      { id: "overview", label: "Overview" },
      { id: "portfolio", label: "Portfolio" },
      { id: "ugc", label: "UGC" },
      { id: "affiliate", label: "Affiliate" },
      { id: "marketplace", label: "Marketplace" },
      { id: "community", label: "Community" },
      { id: "analytics", label: "Analytics" },
      { id: "achievements", label: "Achievements" },
      { id: "media-kit", label: "Media Kit" },
      { id: "resume", label: "Resume" },
      { id: "reviews", label: "Reviews" },
      { id: "bookings", label: "Bookings", href: isOwner ? "/identity/bookings" : undefined },
    ];
    if (isOwner) list.push({ id: "settings", label: "Settings", href: "/settings/profile" });
    return list;
  }, [isOwner]);

  if (payload.restricted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Lock className="mx-auto mb-4 h-8 w-8 text-[#B9B3A6]" />
        <h1 className="font-[var(--font-identity-serif)] text-[22px] font-medium text-[#161512]">
          This profile is private
        </h1>
        <p className="mt-2 text-[13.5px] text-[#8B8579]">
          {displayName} has limited who can view their Jimvio identity profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* ── Hero: one composition ── */}
      <IdentityCard className="overflow-hidden">
        <div className="relative h-40 w-full sm:h-56">
          {profile.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#FFEDE2,#FFF7F0_45%,#F3F1EC)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

          {isOwner && (
            <Link
              href="/settings/profile"
              className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-semibold text-[#1C1B19] backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Pencil className="h-3 w-3" /> Edit profile
            </Link>
          )}
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
              <PresenceAvatarFrame userId={profile.userId}>
              <PersonAvatar
                name={displayName}
                url={profile.avatarUrl}
                className="h-24 w-24 rounded-[26px] border-4 border-white shadow-lg sm:h-28 sm:w-28"
              />
              </PresenceAvatarFrame>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="font-[var(--font-identity-serif)] text-[22px] font-medium tracking-tight text-[#161512] sm:text-[26px]">
                    {displayName}
                  </h1>
                  <VerifiedBadge verified={Boolean(profile.identityVerified)} />
                </div>
                {profile.username && <p className="text-[13px] text-[#9A9388]">@{profile.username}</p>}
              </div>
            </div>

            {!isOwner && (
              <IdentityProfileActions
                userId={profile.userId}
                username={profile.username}
              />
            )}
            {verifiedSocial.length > 0 && (
              <div className="flex items-center gap-2 pb-1">
                <IdentitySocialLinks accounts={verifiedSocial} compact />
              </div>
            )}
          </div>

          {profile.headline && (
            <p className="mt-4 font-[var(--font-identity-serif)] text-[16px] italic leading-relaxed text-[#4A453D] sm:text-[17px]">
              “{profile.headline}”
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category ? (
              <Link href={`/users/browse?niche=${encodeURIComponent(category)}`}>
                <IdentityPill tone="accent" icon={<Briefcase className="h-3 w-3" />}>
                  {category}
                </IdentityPill>
              </Link>
            ) : null}
            {countryName ? (
              <IdentityPill tone="neutral" icon={<MapPin className="h-3 w-3" />}>
                {[profile.city, countryName].filter(Boolean).join(", ")}
              </IdentityPill>
            ) : null}
            <IdentityPill tone="accent">{levelProgress.levelLabel} Creator</IdentityPill>
            <IdentityPill tone={availability.tone}>{availability.label}</IdentityPill>
            {profile.languages.length > 0 && (
              <IdentityPill tone="neutral" icon={<Languages className="h-3 w-3" />}>
                {profile.languages.slice(0, 3).join(", ")}
              </IdentityPill>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer">
                <IdentityPill tone="neutral" icon={<Globe className="h-3 w-3" />}>
                  Website
                </IdentityPill>
              </a>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-[#59544B]">{profile.bio}</p>
          )}

          {profile.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.skills.slice(0, 10).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-black/[0.06] bg-black/[0.02] px-2.5 py-1 text-[11.5px] text-[#59544B]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* ── Mini scores + meta strip ── */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-black/[0.06] pt-4">
            {profile.overallRank && (
              <MetaChip icon={Trophy}>
                Rank <span className="font-semibold text-[#1C1B19]">#{profile.overallRank}</span>
              </MetaChip>
            )}
            <MetaChip icon={Users}>
              <span className="font-semibold text-[#1C1B19]">{formatNumber(jimvioFollowers)}</span>{" "}
              {jimvioFollowers === 1 ? "follower" : "followers"}
            </MetaChip>
            <MetaChip icon={Users}>
              <span className="font-semibold text-[#1C1B19]">{formatNumber(jimvioFollowing)}</span>{" "}
              following
            </MetaChip>
            {socialFollowers > 0 && (
              <MetaChip icon={Globe}>
                <span className="font-semibold text-[#1C1B19]">{formatNumber(totalReach)}</span> total reach
              </MetaChip>
            )}
            {profile.responseTimeHours != null && (
              <MetaChip icon={Clock}>
                Responds in <span className="font-semibold text-[#1C1B19]">{Math.round(profile.responseTimeHours)}h</span>
              </MetaChip>
            )}
          </div>
        </div>
      </IdentityCard>

      {/* ── Tabbed body ── */}
      <div className="mt-6">
        <IdentityTabNav tabs={tabs} activeTab={activeTab} basePath={pathname} />

        <div className="pt-6">
          {activeTab === "overview" && <IdentityOverviewPanel payload={payload} />}

          {activeTab === "portfolio" && (
            <IdentityPortfolio
              items={payload.portfolio}
              emptyAction={
                isOwner ? (
                  <Link
                    href="/settings/profile"
                    className="inline-flex h-8 items-center justify-center rounded-full border border-black/10 bg-white px-3.5 text-[12.5px] font-semibold text-[#1C1B19] transition-colors hover:border-black/20 hover:bg-black/[0.02]"
                  >
                    Add your first piece
                  </Link>
                ) : undefined
              }
            />
          )}

          {MODULE_SURFACES.includes(activeTab as IdentitySurface) && (
            <IdentityModulePanel surface={activeTab as IdentitySurface} username={profile.username} />
          )}

          {activeTab === "analytics" && (
            <div className="space-y-5">
              <IdentityAnalyticsPanel username={profile.username} />
              <IdentityAiPanel insights={payload.aiInsights} isOwner={isOwner} />
            </div>
          )}

          {activeTab === "achievements" && (
            <IdentityAchievements badges={payload.badges} milestones={payload.milestones} />
          )}

          {activeTab === "media-kit" && profile.username && (
            <IdentityMediaKitPanel username={profile.username} displayName={displayName} />
          )}

          {activeTab === "resume" && <ResumeSection payload={payload} />}

          {activeTab === "reviews" && (
            <IdentityReviewsPanel payload={payload} subjectUserId={profile.userId} displayName={displayName} />
          )}

          {activeTab === "bookings" && (
            <BookingsTab payload={payload} displayName={displayName} />
          )}
        </div>
      </div>
    </div>
  );
}

function MetaChip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-[#7C766B]">
      <Icon className="h-3.5 w-3.5 text-[#B9B3A6]" />
      {children}
    </span>
  );
}

function BookingsTab({ payload, displayName }: { payload: IdentityProfilePayload; displayName: string }) {
  const { isOwner, canBook, profile } = payload;

  if (isOwner) {
    return (
      <IdentityCard className="flex flex-col items-center gap-3 p-10 text-center">
        <Briefcase className="h-6 w-6 text-[#B9B3A6]" />
        <p className="text-[14px] font-semibold text-[#1C1B19]">Manage your booking inbox</p>
        <p className="max-w-sm text-[12.5px] text-[#8B8579]">
          Review, accept and decline requests from brands from your dedicated booking inbox.
        </p>
        <Link href="/identity/bookings">
          <IdentityButton size="sm">Open booking inbox</IdentityButton>
        </Link>
      </IdentityCard>
    );
  }

  if (!canBook) {
    return (
      <IdentityCard className="flex flex-col items-center gap-2 p-10 text-center">
        <Briefcase className="h-6 w-6 text-[#B9B3A6]" />
        <p className="text-[14px] font-semibold text-[#1C1B19]">
          {profile.availability === "unavailable" ? `${displayName} isn't taking bookings right now` : "Sign in to request a booking"}
        </p>
        <p className="max-w-sm text-[12.5px] text-[#8B8579]">
          {profile.availability === "unavailable"
            ? "Check back later, or explore their portfolio in the meantime."
            : `Create a free Jimvio account to send ${displayName} a booking request.`}
        </p>
      </IdentityCard>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <IdentityBookingFormInline creatorId={profile.userId} creatorName={displayName} />
    </div>
  );
}

function IdentityBookingFormInline({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  return (
    <IdentityCard className="p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Book a slot</p>
      <IdentityBookingForm creatorId={creatorId} creatorName={creatorName} onClose={() => {}} inline />
    </IdentityCard>
  );
}

function ResumeSection({ payload }: { payload: IdentityProfilePayload }) {
  if (payload.resume.length === 0) {
    return (
      <IdentityCard className="flex flex-col items-center gap-2 p-10 text-center">
        <Briefcase className="h-6 w-6 text-[#B9B3A6]" />
        <p className="text-[14px] font-semibold text-[#1C1B19]">No resume entries yet</p>
        <p className="max-w-sm text-[12.5px] text-[#8B8579]">
          Experience, education and certifications will appear here.
        </p>
      </IdentityCard>
    );
  }
  return (
    <div className="space-y-3">
      {payload.resume.map((entry) => (
        <IdentityCard key={entry.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-[#1C1B19]">{entry.title}</p>
              {entry.organization && <p className="text-[12.5px] text-[#7C766B]">{entry.organization}</p>}
              <span className="mt-1 inline-block rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium capitalize text-[#7C766B]">
                {entry.entryType}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-[#9A9388]">
              <Calendar className="h-3 w-3" />
              {entry.startedOn ? new Date(entry.startedOn).getFullYear() : ""}
              {entry.isCurrent ? " – Present" : entry.endedOn ? ` – ${new Date(entry.endedOn).getFullYear()}` : ""}
            </span>
          </div>
          {entry.description && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#59544B]">{entry.description}</p>
          )}
        </IdentityCard>
      ))}
    </div>
  );
}
