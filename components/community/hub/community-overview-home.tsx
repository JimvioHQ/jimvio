"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Eye,
  FileText,
  Megaphone,
  Scale,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { CommunityOverviewStats } from "@/services/community/hub-data";

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function InfoCard({
  icon: Icon,
  iconClass,
  title,
  body,
  chips,
}: {
  icon: typeof FileText;
  iconClass: string;
  title: string;
  body: string;
  chips?: string[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 sm:p-6">
      <div className="flex gap-3.5 sm:gap-4">
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold tracking-tight text-gray-900 sm:text-[16px]">
            {title}
          </h3>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-gray-600 sm:text-[14px]">
            {body}
          </p>
          {chips && chips.length > 0 ? (
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {chips.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700 ring-1 ring-gray-100"
                >
                  <Check
                    className="h-3 w-3 text-[var(--color-accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmptySoft({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-gray-50/80 px-5 py-7 text-center text-[13px] text-gray-500 ring-1 ring-gray-100">
      {message}
    </div>
  );
}

/**
 * Community Overview body — Description / Mission / Vision first,
 * then optional Rules / Resources / Announcements.
 */
export function CommunityOverviewHome({
  communityName,
  base,
  overview,
}: {
  slug: string;
  communityName: string;
  base: string;
  overview: CommunityOverviewStats | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  canManage: boolean;
  onCreateSpace?: () => void;
}) {
  const announcements = (overview?.featuredPosts ?? []).slice(0, 3);
  const description = overview?.description?.trim() || null;
  const mission = overview?.missionVision?.mission?.trim() || null;
  const vision = overview?.missionVision?.vision?.trim() || null;
  const rules = (overview?.rules ?? []).map((r) => r.trim()).filter(Boolean);
  const tags = (overview?.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const resourcesChips = [
    ...tags.slice(0, 4),
    ...(overview?.trustedBadges ?? [])
      .filter((b) => b.tone === "learning" || b.tone === "secure")
      .map((b) => b.label)
      .slice(0, 3),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5 animate-in fade-in duration-300">
      {/* Main overview content starts at Description */}
      <div className="space-y-4">
        <InfoCard
          icon={FileText}
          iconClass="bg-orange-50 text-[var(--color-accent)]"
          title="Description"
          body={
            description ||
            `A place for people who care about ${communityName} — learning, sharing, and building together.`
          }
          chips={tags.slice(0, 4)}
        />

        <InfoCard
          icon={Target}
          iconClass="bg-emerald-50 text-emerald-600"
          title="Mission"
          body={
            mission ||
            overview?.tagline?.trim() ||
            `Help members of ${communityName} learn faster and collaborate with clarity.`
          }
        />

        <InfoCard
          icon={Eye}
          iconClass="bg-sky-50 text-sky-600"
          title="Vision"
          body={
            vision ||
            (overview?.category
              ? `Become the go-to home for ${overview.category.toLowerCase()} creators who want to learn, contribute, and grow together.`
              : `Build a trusted ecosystem where members of ${communityName} turn knowledge into impact.`)
          }
        />

        {rules.length > 0 ? (
          <InfoCard
            icon={Scale}
            iconClass="bg-violet-50 text-violet-600"
            title="Rules"
            body={rules[0]!}
            chips={rules.slice(1, 5)}
          />
        ) : null}

        {resourcesChips.length > 0 ? (
          <InfoCard
            icon={BookOpen}
            iconClass="bg-amber-50 text-amber-700"
            title="Resources"
            body="Topics and resources members explore in this community."
            chips={resourcesChips}
          />
        ) : null}
      </div>

      {/* Announcements */}
      <section className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Megaphone className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-[15px] font-semibold tracking-tight text-gray-900 sm:text-[16px]">
              Announcements
            </h2>
          </div>
          <Link
            href={`${base}/feed`}
            className="text-[12.5px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded-sm"
          >
            View all →
          </Link>
        </div>

        {announcements.length === 0 ? (
          <EmptySoft message="Share the first resource." />
        ) : (
          <ul className="grid grid-cols-12 gap-3">
            {announcements.map((post) => (
              <li
                key={post.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              >
                <Link
                  href={post.href}
                  className="flex h-full gap-3 rounded-xl bg-gray-50/70 p-3.5 ring-1 ring-gray-100 transition duration-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
                    <Megaphone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13.5px] font-semibold text-gray-900">
                      {post.title?.trim() || post.body.slice(0, 72)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                      {post.body}
                    </span>
                    <span className="mt-1.5 block text-[11px] text-gray-400">
                      {post.author.name}
                      <span className="mx-1">·</span>
                      {relativeTime(post.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Kept for potential future section titles without unused-import churn. */
export function OverviewSectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight text-gray-900 sm:text-[16px]">
        {title}
      </h2>
      {action}
    </div>
  );
}
