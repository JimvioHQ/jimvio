"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  LayoutGrid,
  Loader2,
  Lock,
  MessageCircle,
  Sparkles,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDisplayMoney, formatNumber } from "@/lib/utils";

type ProfileRef = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
} | null;

export type CommunityDetailPayload = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  is_free: boolean | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  lifetime_price: number | string | null;
  currency: string | null;
  member_count: number | null;
  space_count: number | null;
  profiles?: ProfileRef;
};

type MembershipPayload = {
  status: string;
  created_at: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
  plan_type: string | null;
} | null;

type SpaceRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  access_type: string;
  room_count: number | null;
  hasAccess?: boolean;
};

type PlanKey = "monthly" | "yearly" | "lifetime";

const ICON_MAP: Record<string, LucideIcon> = {
  message: MessageCircle,
  chat: MessageCircle,
  course: BookOpen,
  learn: BookOpen,
  video: Video,
  sparkles: Sparkles,
};

function spaceIcon(icon?: string | null): LucideIcon {
  if (!icon) return LayoutGrid;
  const k = icon.toLowerCase();
  return ICON_MAP[k] ?? LayoutGrid;
}

function accessLabel(access: string): string {
  const a = access.toLowerCase();
  if (a === "free") return "Free";
  if (a === "paid") return "Paid";
  if (a === "premium") return "Premium";
  return access;
}

function isActiveMembership(m: MembershipPayload): boolean {
  if (!m || m.status !== "active") return false;
  if (m.expires_at && new Date(m.expires_at) < new Date()) return false;
  return true;
}

function memberSince(m: MembershipPayload): string | null {
  if (!m) return null;
  const raw = m.subscribed_at || m.created_at;
  if (!raw) return null;
  try {
    return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(raw));
  } catch {
    return null;
  }
}

export function CommunityDetailView({
  community,
  membership,
  isLoggedIn,
}: {
  community: CommunityDetailPayload;
  membership: MembershipPayload;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [payment, setPayment] = useState<"pesapal" | "nowpayments">("pesapal");
  const [joining, setJoining] = useState(false);
  /** Server props can be stale right after join; hydrate from POST /join response. */
  const [localMembership, setLocalMembership] = useState<MembershipPayload>(membership);

  useEffect(() => {
    setLocalMembership(membership);
  }, [community.id]);

  useEffect(() => {
    if (membership) {
      setLocalMembership(membership);
    }
  }, [membership]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${community.id}`)
      .then((r) => r.json())
      .then((d: { spaces?: SpaceRow[] }) => {
        if (!cancelled) setSpaces(d.spaces ?? []);
      })
      .catch(() => {
        if (!cancelled) setSpaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const isMember = isActiveMembership(localMembership);
  const since = memberSince(localMembership);
  const memberCount = community.member_count ?? 0;

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = community.currency || "USD";

  const yearlySavePct = useMemo(() => {
    if (!monthly || !yearly || monthly <= 0 || yearly <= 0) return null;
    const annualIfMonthly = monthly * 12;
    const pct = Math.round(((annualIfMonthly - yearly) / annualIfMonthly) * 100);
    return pct > 0 ? pct : null;
  }, [monthly, yearly]);

  const priceForPlan = (p: PlanKey) => {
    if (p === "monthly") return monthly;
    if (p === "yearly") return yearly;
    return lifetime;
  };

  const loginNext = `/login?next=${encodeURIComponent(`/communities/${community.slug}`)}`;

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push(loginNext);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${community.slug}/join`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        membership?: {
          status?: string;
          created_at?: string | null;
          subscribed_at?: string | null;
          expires_at?: string | null;
          plan_type?: string | null;
        };
      };
      if (!res.ok) throw new Error(data.error || "Could not join");
      if (data.membership) {
        setLocalMembership({
          status: String(data.membership.status ?? "active"),
          created_at: data.membership.created_at ?? null,
          subscribed_at: data.membership.subscribed_at ?? null,
          expires_at: data.membership.expires_at ?? null,
          plan_type: data.membership.plan_type ?? null,
        });
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  }

  const about =
    community.long_description?.trim() ||
    community.description?.trim() ||
    "This community is a space to connect, learn, and grow together.";

  const spaceList = spaces ?? [];
  const statsSpaces =
    typeof community.space_count === "number" ? community.space_count : spaceList.length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="relative w-full">
        <div className="relative h-[220px] sm:h-[300px] w-full bg-[var(--color-surface-secondary)]">
          {community.cover_image ? (
            <Image
              src={community.cover_image}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-light)] via-[var(--color-surface-secondary)] to-[var(--color-bg)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/90 via-transparent to-black/10" />
        </div>

        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10 pb-8 text-center">
          <div className="flex justify-center">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl border-4 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] overflow-hidden shadow-lg">
              {community.avatar_url ? (
                <Image
                  src={community.avatar_url}
                  alt=""
                  width={112}
                  height={112}
                  className="object-cover h-full w-full"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-black text-[var(--color-accent)]">
                  {community.name?.[0] ?? "?"}
                </div>
              )}
            </div>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tight">
            {community.name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--color-text-muted)] max-w-2xl mx-auto">
            {community.tagline || " "}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Users className="h-4 w-4 text-[var(--color-accent)]" />
              {formatNumber(community.member_count ?? 0)} Members
            </span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span>{statsSpaces === 0 ? "No spaces yet" : `${statsSpaces} spaces`}</span>
            {community.category && (
              <>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                  {community.category}
                </span>
              </>
            )}
          </div>

          {isMember && (
            <p className="mt-3 text-xs font-bold text-[var(--color-success)]">
              {since ? `Member since ${since}` : "You're a member — welcome."}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            {isMember ? (
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-8"
              >
                <Link href={`/communities/${community.slug}/workspace`}>Go to Community</Link>
              </Button>
            ) : community.is_free ? (
              <Button
                type="button"
                size="lg"
                disabled={joining}
                onClick={handleJoin}
                className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-8"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Joining…
                  </>
                ) : isLoggedIn ? (
                  "Join free"
                ) : (
                  "Sign in to join"
                )}
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-8"
              >
                <Link href={isLoggedIn ? `/communities/${community.slug}/subscribe?plan=monthly` : loginNext}>
                  Subscribe
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section id="community-about">
              <h2 className="text-lg font-black text-[var(--color-text-primary)] mb-3">About</h2>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                {about}
              </p>
              {community.tags && community.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {community.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section id="community-spaces">
              <h2 className="text-lg font-black text-[var(--color-text-primary)] mb-4">What&apos;s inside</h2>
              {spaces === null ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse"
                    >
                      <div className="h-4 bg-[var(--color-surface-secondary)] rounded w-1/3 mb-2" />
                      <div className="h-3 bg-[var(--color-surface-secondary)] rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : spaceList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-4 py-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {isMember ? (
                    <>
                      <span className="font-bold text-[var(--color-text-primary)]">Nothing here yet.</span> The host hasn&apos;t
                      added spaces. Open the{" "}
                      <Link href={`/communities/${community.slug}/workspace`} className="font-bold text-[var(--color-accent)] hover:underline">
                        community workspace
                      </Link>{" "}
                      — rooms and content will show here once they&apos;re set up.
                    </>
                  ) : (
                    <>
                      Spaces and rooms will be listed here once the community host adds them. Join to get access when
                      they go live.
                    </>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {spaceList.map((s) => {
                    const Icon = spaceIcon(s.icon);
                    const locked =
                      !s.hasAccess && (s.access_type === "paid" || s.access_type === "premium");
                    return (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex gap-3"
                      >
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-black text-[var(--color-text-primary)] leading-tight">{s.name}</h3>
                            {locked && <Lock className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] mt-0.5" />}
                          </div>
                          <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mt-1">
                            {s.description || " "}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                              {accessLabel(s.access_type)}
                            </span>
                            <span className="text-[var(--color-text-muted)]">
                              {s.room_count ?? 0} rooms
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Pricing
              </h3>
              {community.is_free ? (
                <>
                  <p className="text-xl font-black text-[var(--color-text-primary)]">Free Community</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">No subscription required.</p>
                  {isMember ? (
                    <Button
                      asChild
                      className="w-full mt-5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
                    >
                      <Link href={`/communities/${community.slug}/workspace`}>Open community workspace</Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full mt-5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
                      disabled={joining}
                      onClick={handleJoin}
                    >
                      {joining ? "Joining…" : isLoggedIn ? "Join free" : "Sign in to join"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex rounded-xl border border-[var(--color-border)] p-0.5 bg-[var(--color-surface-secondary)]">
                    {(
                      [
                        ["monthly", "Monthly"] as const,
                        ["yearly", "Yearly"] as const,
                        ["lifetime", "Lifetime"] as const,
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPlan(key)}
                        className={cn(
                          "flex-1 py-2 text-xs font-black rounded-lg transition-colors",
                          plan === key
                            ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-black text-[var(--color-text-primary)] tabular-nums">
                      {formatDisplayMoney(priceForPlan(plan), currency)}
                      {plan === "monthly" && (
                        <span className="text-base font-bold text-[var(--color-text-muted)]">/mo</span>
                      )}
                      {plan === "yearly" && (
                        <span className="text-base font-bold text-[var(--color-text-muted)]">/yr</span>
                      )}
                    </p>
                    {plan === "yearly" && yearlySavePct != null && (
                      <p className="text-xs font-bold text-[var(--color-success)] mt-1">
                        Save {yearlySavePct}% vs monthly
                      </p>
                    )}
                    {plan === "lifetime" && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">One-time payment</p>
                    )}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    {[
                      "Access to all spaces",
                      "Chat with members",
                      "Courses and learning",
                      "Daily tasks and challenges",
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check className="h-4 w-4 shrink-0 text-[var(--color-success)] mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mt-5 mb-2">
                    Payment method
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayment("pesapal")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors",
                        payment === "pesapal"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      PesaPal
                      <span className="block text-[10px] font-semibold text-[var(--color-text-muted)] mt-0.5">
                        MTN, Airtel, Card
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayment("nowpayments")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors",
                        payment === "nowpayments"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      Crypto
                      <span className="block text-[10px] font-semibold text-[var(--color-text-muted)] mt-0.5">
                        USDT, BTC, ETH
                      </span>
                    </button>
                  </div>
                  <Button
                    asChild
                    className="w-full mt-5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
                  >
                    <Link
                      href={
                        isLoggedIn
                          ? `/communities/${community.slug}/subscribe?plan=${plan}&provider=${payment}`
                          : loginNext
                      }
                    >
                      Subscribe Now
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Members
              </h3>
              {memberCount === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {isMember
                    ? "You're the first member — invite others from the workspace."
                    : "No members yet. Be the first to join."}
                </p>
              ) : (
                <>
                  <div className="flex -space-x-2 justify-center sm:justify-start">
                    {Array.from({ length: Math.min(5, memberCount) }).map((_, i) => (
                      <div
                        key={i}
                        className="h-10 w-10 rounded-full border-2 border-[var(--color-surface)] bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-3 text-center sm:text-left font-semibold">
                    {memberCount === 1
                      ? "1 member in this community"
                      : `${memberCount.toLocaleString()} members`}
                    {memberCount > 5 ? (
                      <span className="block mt-1 text-[var(--color-text-primary)]">
                        + {memberCount - 5} more
                      </span>
                    ) : null}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
