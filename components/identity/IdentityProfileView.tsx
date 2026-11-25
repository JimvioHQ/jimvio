"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera, Lock, Share2 } from "lucide-react";
import type { IdentityProfilePayload } from "@/lib/identity/types";
import { formatNumber } from "@/lib/utils";
import {
  IDENTITY_V2_SECTIONS,
  PUBLIC_SOCIAL_ORDER,
  resolveIdentitySection,
  type IdentityV2SectionId,
} from "@/lib/identity/v2-sections";
import { PersonAvatar } from "@/components/feed/PersonAvatar";
import { PresenceAvatarFrame } from "@/components/presence/PresenceAvatarFrame";
import { IdentityCard } from "@/components/identity/identity-ui";
import { IdentityTabNav, type IdentityTab } from "@/components/identity/IdentityTabNav";
import { IdentitySocialLinks } from "@/components/identity/IdentitySocialLinks";
import { VerifiedBadge } from "@/components/identity/VerifiedBadge";
import { IdentityProfileActions } from "@/components/identity/IdentityProfileActions";
import { IdentityV2Sections } from "@/components/identity/IdentityV2Sections";
import { ShortProfessionalBio } from "@/components/identity/ShortProfessionalBio";

export function IdentityProfileView({ payload }: { payload: IdentityProfilePayload }) {
  const { profile, isOwner } = payload;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = resolveIdentitySection(searchParams.get("tab"));
  const scrolledRef = useRef<string | null>(null);

  const displayName = profile.fullName || profile.username || "Jimvio member";
  const jimvioFollowers = payload.jimvioFollowers ?? 0;
  const jimvioFollowing = payload.jimvioFollowing ?? 0;

  const publicSocial = useMemo(() => {
    const withUrl = payload.social.filter(
      (account) =>
        Boolean(account.url?.trim()) &&
        (account.isVerified || account.platform === "website"),
    );
    return [...withUrl].sort((a, b) => {
      const ai = PUBLIC_SOCIAL_ORDER.indexOf(a.platform as (typeof PUBLIC_SOCIAL_ORDER)[number]);
      const bi = PUBLIC_SOCIAL_ORDER.indexOf(b.platform as (typeof PUBLIC_SOCIAL_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [payload.social]);

  const tabs: IdentityTab[] = useMemo(() => {
    const experience = payload.resume.filter(
      (e) => e.entryType === "experience" || e.entryType === "industry",
    );
    const education = payload.resume.filter(
      (e) => e.entryType === "education" || e.entryType === "certification",
    );
    const businessEntries = payload.resume.filter(
      (e) => e.entryType === "brand" || e.entryType === "campaign",
    );
    const presence = payload.modulePresence;
    const visible = new Set<IdentityV2SectionId>(["overview"]);
    if (experience.length > 0) visible.add("experience");
    if (education.length > 0) visible.add("education");
    if (profile.skills.length > 0) visible.add("skills");
    if (payload.portfolio.length > 0) visible.add("portfolio");
    if (businessEntries.length > 0 || presence?.any) visible.add("business");
    if (
      isOwner ||
      payload.canBook ||
      profile.contactPreferences.in_app ||
      profile.contactPreferences.email ||
      profile.contactPreferences.booking
    ) {
      visible.add("services");
    }
    return IDENTITY_V2_SECTIONS.filter((section) => visible.has(section.id)).map((section) => ({
      id: section.id,
      label: section.label,
      href: `${pathname}?tab=${section.id}#${section.id}`,
    }));
  }, [pathname, payload, profile, isOwner]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (scrolledRef.current === activeSection) return;
    const el = document.getElementById(activeSection);
    if (!el) return;
    scrolledRef.current = activeSection;
    // Defer until sections paint.
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeSection]);

  async function shareProfile() {
    const url = typeof window !== "undefined" ? window.location.href : pathname;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      // User cancelled share — ignore.
    }
  }

  if (payload.restricted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Lock className="mx-auto mb-4 h-8 w-8 text-[#9CA3AF]" />
        <h1 className="text-[22px] font-semibold text-[#111827]">This profile is private</h1>
        <p className="mt-2 text-[13.5px] text-[#6B7280]">
          {displayName} has limited who can view their Jimvio identity profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      {/* Header */}
      <IdentityCard className="overflow-hidden border-[#E5E7EB] bg-white shadow-none">
        <div className="relative h-36 w-full sm:h-44">
          {profile.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(105deg,#FFE8DC_0%,#FFF5EF_42%,#FFFFFF_100%)]" />
          )}
          {isOwner && (
            <Link
              href="/settings/profile#identity-managers-cover"
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-[#374151] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Camera className="h-3.5 w-3.5" />
              Edit cover
            </Link>
          )}
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="-mt-12 shrink-0 sm:-mt-14">
                <PresenceAvatarFrame userId={profile.userId}>
                  <div className="rounded-2xl border-[3px] border-white bg-white p-1 shadow-[0_8px_24px_-12px_rgba(17,24,39,0.35)]">
                    <PersonAvatar
                      name={displayName}
                      url={profile.avatarUrl}
                      className="h-[88px] w-[88px] rounded-xl sm:h-[104px] sm:w-[104px]"
                    />
                  </div>
                </PresenceAvatarFrame>
              </div>

              <div className="min-w-0 pt-3 sm:pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-[22px] font-bold tracking-tight text-[#111827] sm:text-[26px]">
                    {displayName}
                  </h1>
                  <VerifiedBadge verified={Boolean(profile.identityVerified)} />
                </div>
                {profile.username ? (
                  <p className="mt-0.5 text-[13.5px] text-[#6B7280]">@{profile.username}</p>
                ) : null}

                <ShortProfessionalBio
                  lines={profile.shortBioLines}
                  bio={profile.bio}
                  headline={profile.headline}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:pt-4">
              {!isOwner ? (
                <IdentityProfileActions
                  userId={profile.userId}
                  username={profile.username}
                  onShare={() => void shareProfile()}
                  allowInAppContact={profile.contactPreferences.in_app !== false}
                />
              ) : (
                <>
                  <Link
                    href="/settings/profile"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]"
                  >
                    Edit profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void shareProfile()}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#e84e18]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </IdentityCard>

      {/* Followers / Following | Social icons */}
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5 text-[13.5px] text-[#374151]">
            <span>
              <span className="font-semibold text-[#111827]">{formatNumber(jimvioFollowers)}</span>{" "}
              {jimvioFollowers === 1 ? "Follower" : "Followers"}
            </span>
            <span>
              <span className="font-semibold text-[#111827]">{formatNumber(jimvioFollowing)}</span>{" "}
              Following
            </span>
          </div>

          {publicSocial.length > 0 ? (
            <IdentitySocialLinks accounts={publicSocial} compact branded className="gap-4" />
          ) : null}
        </div>
      </div>

      {/* Section nav */}
      <div className="mt-5">
        <IdentityTabNav
          tabs={tabs}
          activeTab={activeSection}
          basePath={pathname}
          onTabSelect={(id) => {
            const section = id as IdentityV2SectionId;
            router.replace(`${pathname}?tab=${section}#${section}`, { scroll: false });
          }}
        />
      </div>

      <IdentityV2Sections payload={payload} />

      {/* Compact trust footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[12px] text-[#9CA3AF]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#6B7280]">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FF5A1F] text-[10px] font-bold text-white">
            J
          </span>
          Powered by Jimvio
        </span>
        <span aria-hidden className="text-[#E5E7EB]">
          ·
        </span>
        <Link href="/privacy" className="font-medium text-[#6B7280] hover:text-[#111827] hover:underline">
          Privacy &amp; Trust
        </Link>
      </div>
    </div>
  );
}
