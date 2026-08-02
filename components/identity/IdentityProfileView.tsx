"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  Globe,
  Languages,
  Lock,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { getInitials } from "@/lib/utils";
import {
  IdentityButton,
  IdentityCard,
  IdentityPill,
  cn,
} from "@/components/identity/identity-ui";
import { IdentityScores } from "@/components/identity/IdentityScores";
import { computeIdentityStats, IdentityStatsGrid } from "@/components/identity/IdentityStatsGrid";
import { IdentityPortfolio } from "@/components/identity/IdentityPortfolio";
import { IdentityAchievements } from "@/components/identity/IdentityAchievements";
import { IdentityAiPanel } from "@/components/identity/IdentityAiPanel";
import { IdentitySocialLinks } from "@/components/identity/IdentitySocialLinks";
import { IdentityBookingForm } from "@/components/identity/IdentityBookingForm";

const AVAILABILITY_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  open: { label: "Open to work", tone: "success" },
  limited: { label: "Limited availability", tone: "warning" },
  booked: { label: "Fully booked", tone: "danger" },
  unavailable: { label: "Not available", tone: "neutral" },
};

export function IdentityProfileView({ payload }: { payload: IdentityProfilePayload }) {
  const { profile, isOwner, canBook, levelProgress } = payload;
  const [bookingOpen, setBookingOpen] = useState(false);

  const displayName = profile.fullName || profile.username || "Jimvio member";
  const availability = AVAILABILITY_META[profile.availability] ?? AVAILABILITY_META.open;

  const stats = useMemo(
    () =>
      computeIdentityStats({
        totalFollowers: payload.social.reduce((sum, s) => sum + s.followers, 0),
        avgEngagementRate:
          payload.social.length > 0
            ? payload.social.reduce((sum, s) => sum + s.engagementRate, 0) / payload.social.length
            : 0,
        portfolioCount: payload.portfolio.length,
        joinedAt: profile.joinedAt,
      }),
    [payload.social, payload.portfolio.length, profile.joinedAt],
  );

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
              href="/identity/edit"
              className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-semibold text-[#1C1B19] backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Pencil className="h-3 w-3" /> Edit profile
            </Link>
          )}
        </div>

        <div className="relative px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[26px] border-4 border-white bg-[#FF5A1F] shadow-lg sm:h-28 sm:w-28">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-white">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="font-[var(--font-identity-serif)] text-[22px] font-medium tracking-tight text-[#161512] sm:text-[26px]">
                    {displayName}
                  </h1>
                  {(profile.isVerified || profile.identityVerified) && (
                    <BadgeCheck className="h-5 w-5 text-[#FF5A1F]" aria-label="Verified" />
                  )}
                </div>
                {profile.username && <p className="text-[13px] text-[#9A9388]">@{profile.username}</p>}
              </div>
            </div>

            {!isOwner && (
              <div className="flex items-center gap-2 pb-1">
                <IdentitySocialLinks accounts={payload.social} compact />
                {canBook && (
                  <IdentityButton onClick={() => setBookingOpen(true)}>Book {profile.fullName?.split(" ")[0] || "them"}</IdentityButton>
                )}
              </div>
            )}
          </div>

          {profile.headline && (
            <p className="mt-4 font-[var(--font-identity-serif)] text-[16px] italic leading-relaxed text-[#4A453D] sm:text-[17px]">
              “{profile.headline}”
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <IdentityPill tone="accent">{levelProgress.levelLabel} Creator</IdentityPill>
            <IdentityPill tone={availability.tone}>{availability.label}</IdentityPill>
            {(profile.city || profile.country) && (
              <IdentityPill tone="neutral" icon={<MapPin className="h-3 w-3" />}>
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </IdentityPill>
            )}
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
        </div>
      </IdentityCard>

      {/* ── Stats ── */}
      <IdentityStatsGrid stats={stats} className="mt-5" />

      {/* ── Body ── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <IdentityPortfolio
            items={payload.portfolio}
            emptyAction={
              isOwner ? (
                <Link
                  href="/identity/edit"
                  className="inline-flex h-8 items-center justify-center rounded-full border border-black/10 bg-white px-3.5 text-[12.5px] font-semibold text-[#1C1B19] transition-colors hover:border-black/20 hover:bg-black/[0.02]"
                >
                  Add your first piece
                </Link>
              ) : undefined
            }
          />
          <IdentityAchievements badges={payload.badges} milestones={payload.milestones} />
          <ResumeSection payload={payload} />
        </div>

        <div className="space-y-5">
          <IdentityScores
            trustScore={profile.trustScore}
            aiScore={profile.aiScore}
            reputationScore={profile.reputationScore}
            levelProgress={levelProgress}
            overallRank={profile.overallRank}
          />
          {payload.social.length > 0 && (
            <IdentityCard className="p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Channels</p>
              <IdentitySocialLinks accounts={payload.social} />
            </IdentityCard>
          )}
          <IdentityAiPanel insights={payload.aiInsights} isOwner={isOwner} />
          {payload.testimonials.length > 0 && (
            <IdentityCard className="p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
                What brands say
              </p>
              <div className="space-y-4">
                {payload.testimonials.slice(0, 3).map((t) => (
                  <div key={t.id}>
                    <p className="font-[var(--font-identity-serif)] text-[13.5px] italic leading-relaxed text-[#3E3A34]">
                      “{t.quote}”
                    </p>
                    <p className="mt-1.5 text-[11.5px] font-medium text-[#59544B]">
                      {t.authorName}
                      {t.authorCompany && <span className="text-[#B9B3A6]"> · {t.authorCompany}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </IdentityCard>
          )}
        </div>
      </div>

      {bookingOpen && (
        <IdentityBookingForm
          creatorId={profile.userId}
          creatorName={displayName}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
}

function ResumeSection({ payload }: { payload: IdentityProfilePayload }) {
  if (payload.resume.length === 0) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-[#FF5A1F]" />
        <h2 className="font-[var(--font-identity-serif)] text-[20px] font-medium tracking-tight text-[#161512]">
          Experience
        </h2>
      </div>
      <div className="space-y-3">
        {payload.resume.map((entry) => (
          <IdentityCard key={entry.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-semibold text-[#1C1B19]">{entry.title}</p>
                {entry.organization && <p className="text-[12.5px] text-[#7C766B]">{entry.organization}</p>}
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
    </div>
  );
}
