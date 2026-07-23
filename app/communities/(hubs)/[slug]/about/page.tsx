"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BadgeCheck, Lock } from "lucide-react";
import { useWorkspaceOptional } from "@/components/community/workspace-context";
import { HubCard, HubLinkButton, HubSectionTitle } from "@/components/community/hub/hub-ui";

export default function CommunityAboutPage() {
  const workspace = useWorkspaceOptional();
  const router = useRouter();

  useEffect(() => {
    if (!workspace) {
      // Layout should redirect; this is a defensive fallback for hydration races.
      router.replace(".");
    }
  }, [workspace, router]);

  if (!workspace) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading…
      </div>
    );
  }

  const {
    communityName,
    slug,
    memberCount,
    tagline,
    isPrivate,
    overview,
    ownerName,
  } = workspace;

  const base = `/communities/${slug}`;
  const description =
    overview?.description ??
    tagline ??
    `${communityName} is a Jimvio community for creators and members to learn, connect, and grow together.`;
  const verified = overview?.isVerified ?? false;
  const members = overview?.memberCount ?? memberCount ?? 0;
  const category = overview?.category;
  const founderName = overview?.founder?.name ?? ownerName ?? "Founder";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[800px] px-3 py-8 sm:px-5 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          About
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {communityName}
          </h1>
          {verified && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-700">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Verified
            </span>
          )}
        </div>
        {tagline && (
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">{tagline}</p>
        )}

        <HubCard className="mt-6 !p-5">
          <HubSectionTitle title="Description" />
          <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        </HubCard>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            {(isPrivate || overview?.isPrivate) && <Lock className="h-3.5 w-3.5" aria-hidden />}
            {isPrivate || overview?.isPrivate ? "Private" : "Public"}
          </span>
          <span>{members.toLocaleString()} members</span>
          {category && <span>{category}</span>}
          <span>Founded by {founderName}</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <HubLinkButton href={base}>Back to Overview</HubLinkButton>
          <HubLinkButton href={`${base}/members`} variant="secondary">
            Members
          </HubLinkButton>
          <Link
            href={`${base}/chat`}
            className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold text-[#fd5000] hover:underline"
          >
            Open channels
          </Link>
        </div>
      </div>
    </div>
  );
}
