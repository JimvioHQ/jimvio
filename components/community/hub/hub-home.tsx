"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Compass,
  Plus,
  Radio,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  hubGreeting,
  type HubHomeActivity,
  type HubHomePayload,
} from "@/lib/community/hub-home-types";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function activityIcon(kind: HubHomeActivity["kind"]) {
  if (kind === "live") return Radio;
  if (kind === "mission") return Target;
  return Sparkles;
}

function CommunityTile({
  community,
}: {
  community: HubHomePayload["communities"][number];
}) {
  const href = community.last_path?.startsWith(`/communities/${community.slug}`)
    ? community.last_path
    : `/communities/${community.slug}`;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[148px] flex-col overflow-hidden rounded-2xl",
        "bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70",
        "transition duration-300 hover:-translate-y-0.5 hover:ring-[var(--color-accent)]/35",
        "hover:shadow-[0_22px_48px_-34px_rgba(0,0,0,0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      )}
    >
      <div className="relative h-16 overflow-hidden bg-[var(--color-surface-secondary)]">
        {community.cover_image ? (
          <Image
            src={community.cover_image}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(253,80,0,0.35),transparent_55%),linear-gradient(135deg,#18181b,#3f3f46)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
        {community.is_live ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
        ) : null}
      </div>

      <div className="relative -mt-6 flex flex-1 flex-col px-4 pb-4">
        <div className="mb-2 flex items-end gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2 ring-[var(--color-surface)]">
            {community.avatar_url ? (
              <Image
                src={community.avatar_url}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <CommunityLetterAvatar
                name={community.name}
                className="h-full w-full bg-gradient-to-br from-[var(--color-accent)] to-[#ff7a30] text-white"
                textClassName="text-sm"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {community.name}
            </p>
            <p className="truncate text-[12px] text-[var(--color-text-muted)]">
              {community.tagline || `${formatNumber(community.member_count)} members`}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-[var(--color-text-muted)]">
          <span>
            {community.last_visited_at
              ? `Visited ${relativeTime(community.last_visited_at)}`
              : community.role
                ? community.role.charAt(0).toUpperCase() + community.role.slice(1)
                : "Member"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)] opacity-0 transition group-hover:opacity-100">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * World-class communities hub home — real memberships + activity, zero mock dashboard.
 */
export function HubHome({ data }: { data: HubHomePayload }) {
  const loggedIn = Boolean(data.user);
  const greeting = hubGreeting(data.user?.full_name ?? null, data.user?.username ?? null);
  const primary = data.communities[0];
  const primaryHref = primary
    ? primary.last_path?.startsWith(`/communities/${primary.slug}`)
      ? primary.last_path
      : `/communities/${primary.slug}`
    : "/communities/explore";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg)]">
      <section className="relative overflow-hidden border-b border-[var(--color-border)]/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(253,80,0,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(24,24,27,0.06),transparent_50%)]" />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Communities
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-dm-sans)] text-[2rem] font-semibold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[2.6rem]">
                {loggedIn ? greeting : "Find your people"}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                {loggedIn
                  ? data.communities.length
                    ? "Pick up where you left off — live sessions, challenges, and conversations across your communities."
                    : "You’re in. Explore communities built for creators who learn, collaborate, and earn together."
                  : "Join communities for creators who learn together, ship together, and grow together."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 text-[14px] font-semibold text-white transition hover:opacity-90"
                >
                  {primary ? "Continue" : "Explore communities"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/communities/explore"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-surface)] px-5 text-[14px] font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] transition hover:bg-[var(--color-surface-secondary)]"
                >
                  <Compass className="h-4 w-4 text-[var(--color-accent)]" />
                  Discover
                </Link>
                {loggedIn ? (
                  <Link
                    href="/communities/create"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
                  >
                    <Plus className="h-4 w-4" />
                    Create
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="col-span-12 grid grid-cols-3 gap-3 lg:col-span-4 lg:self-end">
              {[
                {
                  label: "Communities",
                  value: formatNumber(data.communities.length),
                  icon: Users,
                },
                {
                  label: "Live now",
                  value: formatNumber(data.liveCount),
                  icon: Radio,
                },
                {
                  label: "Challenges",
                  value: formatNumber(data.missionCount),
                  icon: Target,
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-[var(--color-surface)]/80 p-4 ring-1 ring-[var(--color-border)]/60 backdrop-blur-sm"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
                    <p className="mt-3 text-[1.35rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1400px] space-y-14 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Your space
              </p>
              <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                My communities
              </h2>
            </div>
            <Link
              href="/communities/explore"
              className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Find more
            </Link>
          </div>

          {data.communities.length === 0 ? (
            <div className="overflow-hidden rounded-[1.5rem] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70">
              <div className="grid gap-0 lg:grid-cols-12">
                <div className="col-span-12 flex flex-col justify-center gap-4 p-8 sm:p-10 lg:col-span-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <Users className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-[1.35rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {loggedIn ? "No communities yet" : "Sign in to see your communities"}
                    </h3>
                    <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                      {loggedIn
                        ? "Discover a community that matches your craft — or create one and invite your people."
                        : "Your memberships, live sessions, and challenges will show up here."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={loggedIn ? "/communities/explore" : "/login?next=/communities"}
                      className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-accent)] px-5 text-[14px] font-semibold text-white"
                    >
                      {loggedIn ? "Explore communities" : "Sign in"}
                    </Link>
                    {loggedIn ? (
                      <Link
                        href="/communities/create"
                        className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-surface-secondary)] px-5 text-[14px] font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]"
                      >
                        Create community
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="col-span-12 hidden min-h-[220px] bg-[radial-gradient(ellipse_at_center,rgba(253,80,0,0.18),transparent_60%),linear-gradient(160deg,#0a0a0a,#27272a)] lg:col-span-5 lg:block" />
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.communities.map((community) => (
                <li key={community.id}>
                  <CommunityTile community={community} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Pulse
              </p>
              <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                What&apos;s happening
              </h2>
            </div>

            {data.activity.length === 0 ? (
              <div className="rounded-2xl bg-[var(--color-surface)] p-8 ring-1 ring-[var(--color-border)]/70">
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  Activity from your communities will appear here — posts, live sessions, and challenges.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.activity.map((item) => {
                  const Icon = activityIcon(item.kind);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="group flex min-h-[72px] items-start gap-3 rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]/60 transition hover:ring-[var(--color-accent)]/30"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            item.kind === "live"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">
                            {item.community_name}
                            {item.meta ? ` · ${item.meta}` : ""}
                            {" · "}
                            {relativeTime(item.at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="col-span-12 space-y-4 lg:col-span-5">
            <div className="mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Shortcuts
              </p>
              <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                Jump in
              </h2>
            </div>

            {[
              {
                href: "/communities/live",
                title: "Live studios",
                body: "Watch or host sessions across communities.",
                icon: Radio,
              },
              {
                href: "/communities/missions",
                title: "Challenges",
                body: "Missions and tasks waiting for you.",
                icon: Target,
              },
              {
                href: "/communities/events",
                title: "Events",
                body: "Upcoming deadlines and community moments.",
                icon: Calendar,
              },
              {
                href: "/communities/explore",
                title: "Discover",
                body: "Browse communities by craft and energy.",
                icon: Compass,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[88px] items-start gap-3 rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]/70 transition hover:-translate-y-0.5 hover:ring-[var(--color-accent)]/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">
                      {item.body}
                    </span>
                  </span>
                </Link>
              );
            })}
          </aside>
        </section>
      </div>
    </div>
  );
}
