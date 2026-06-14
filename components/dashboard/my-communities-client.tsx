"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Loader2,
  RotateCcw,
  Plus,
  Globe,
  Crown,
  Sparkles,
  Lock,
  ArrowUpRight,
  BarChart3,
  Settings2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";

type DashboardCommunity = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  member_count: number;
  post_count: number;
  is_free: boolean;
  is_private: boolean;
  monthly_price: number | null;
  currency: string | null;
  role: string;
  plan_type: string | null;
  isOwner: boolean;
  subscribed_at: string | null;
};

type ViewFilter = "all" | "joined" | "owned";
type PlanFilter = "all" | "free" | "paid";

const VIEW_FILTERS: { key: ViewFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "joined", label: "Joined" },
  { key: "owned", label: "Owned" },
];

const PLAN_FILTERS: { key: PlanFilter; label: string }[] = [
  { key: "all", label: "All plans" },
  { key: "free", label: "Free" },
  { key: "paid", label: "Paid" },
];

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: React.ElementType;
  tone: "orange" | "emerald" | "sky" | "violet";
  value: number | string;
  label: string;
}) {
  const tones = {
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] transition-all">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tones[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-widest font-medium mt-0.5 text-[var(--color-text-muted)]">
          {label}
        </p>
      </div>
    </div>
  );
}

function roleLabel(role: string, isOwner: boolean) {
  if (isOwner || role === "owner") return "Owner";
  if (role === "moderator" || role === "admin") return "Moderator";
  return "Member";
}

function roleBadgeClass(role: string, isOwner: boolean) {
  if (isOwner || role === "owner") {
    return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
  }
  if (role === "moderator" || role === "admin") {
    return "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400";
  }
  return "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]";
}

function CommunityDashboardCard({ community }: { community: DashboardCommunity }) {
  const { formatMoney } = useCurrency();
  const initial = community.name[0]?.toUpperCase() ?? "C";
  const workspaceHref = `/c/community/${community.slug}`;
  const publicHref = `/communities/${community.slug}`;

  return (
    <article className="group flex flex-col rounded-2xl overflow-hidden bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative h-28 bg-[var(--color-surface-secondary)] overflow-hidden">
        {community.cover_image ? (
          <Image
            src={community.cover_image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-black text-[var(--color-accent)]/10 select-none">{initial}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              roleBadgeClass(community.role, community.isOwner)
            )}
          >
            {roleLabel(community.role, community.isOwner)}
          </span>
          {community.is_private && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/50 text-white border border-white/10">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-0 flex flex-col flex-1">
        <div className="relative -mt-5 mb-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-[var(--color-surface)] shadow-md bg-[var(--color-surface-secondary)]">
            {community.avatar_url ? (
              <Image
                src={community.avatar_url}
                alt=""
                width={44}
                height={44}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-accent)] font-bold text-lg">
                {initial}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
            {community.name}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {community.tagline || "Your community workspace on Jimvio."}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          {community.category && (
            <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] font-medium uppercase tracking-wide text-[10px]">
              {community.category}
            </span>
          )}
          <span>{formatNumber(community.member_count)} members</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-text-muted)]" />
          <span>{formatNumber(community.post_count)} posts</span>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
          {community.is_free ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
          ) : community.monthly_price ? (
            <span className="text-[13px] font-bold tabular-nums text-[var(--color-text-primary)]">
              {formatMoney(community.monthly_price, community.currency)}
              <span className="text-[11px] font-normal text-[var(--color-text-muted)]">/mo</span>
            </span>
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">Paid access</span>
          )}

          <Link
            href={workspaceHref}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            Open
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={workspaceHref}
            className="inline-flex items-center justify-center h-9 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Workspace
          </Link>
          {community.isOwner ? (
            <Link
              href={`/creator/${community.id}/dashboard`}
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-semibold bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)] transition-all"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Manage
            </Link>
          ) : (
            <Link
              href={publicHref}
              className="inline-flex items-center justify-center h-9 rounded-xl text-[12px] font-semibold bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)] transition-all"
            >
              Public page
            </Link>
          )}
        </div>

        {community.isOwner && (
          <Link
            href="/dashboard/community/analytics"
            className="mt-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            View analytics
          </Link>
        )}
      </div>
    </article>
  );
}

export function MyCommunitiesClient() {
  const router = useRouter();
  const [communities, setCommunities] = useState<DashboardCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login?next=/dashboard/communities");
      return;
    }

    const [membershipsRes, ownedRes] = await Promise.all([
      supabase
        .from("community_memberships")
        .select(
          `id, role, plan_type, status, subscribed_at,
           communities!inner (
             id, name, slug, tagline, category, avatar_url, cover_image,
             member_count, post_count, is_free, is_private, monthly_price,
             currency, is_active, owner_id
           )`
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("communities.is_active", true)
        .order("subscribed_at", { ascending: false }),
      supabase
        .from("communities")
        .select(
          "id, name, slug, tagline, category, avatar_url, cover_image, member_count, post_count, is_free, is_private, monthly_price, currency, is_active, owner_id, created_at"
        )
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    const byId = new Map<string, DashboardCommunity>();

    for (const row of membershipsRes.data ?? []) {
      const c = Array.isArray(row.communities) ? row.communities[0] : row.communities;
      if (!c?.id || !c.slug) continue;
      byId.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline ?? null,
        category: c.category ?? null,
        avatar_url: c.avatar_url ?? null,
        cover_image: c.cover_image ?? null,
        member_count: c.member_count ?? 0,
        post_count: c.post_count ?? 0,
        is_free: Boolean(c.is_free),
        is_private: Boolean(c.is_private),
        monthly_price: c.monthly_price ?? null,
        currency: c.currency ?? null,
        role: row.role ?? "member",
        plan_type: row.plan_type ?? null,
        isOwner: c.owner_id === user.id || row.role === "owner",
        subscribed_at: row.subscribed_at ?? null,
      });
    }

    for (const c of ownedRes.data ?? []) {
      if (!c.id || !c.slug) continue;
      const existing = byId.get(c.id);
      if (existing) {
        existing.isOwner = true;
        existing.role = existing.role === "owner" ? "owner" : existing.role;
        continue;
      }
      byId.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline ?? null,
        category: c.category ?? null,
        avatar_url: c.avatar_url ?? null,
        cover_image: c.cover_image ?? null,
        member_count: c.member_count ?? 0,
        post_count: c.post_count ?? 0,
        is_free: Boolean(c.is_free),
        is_private: Boolean(c.is_private),
        monthly_price: c.monthly_price ?? null,
        currency: c.currency ?? null,
        role: "owner",
        plan_type: null,
        isOwner: true,
        subscribed_at: c.created_at ?? null,
      });
    }

    setCommunities([...byId.values()]);
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    load(true);
  }, [load]);

  const stats = useMemo(() => {
    const owned = communities.filter((c) => c.isOwner).length;
    const joined = communities.filter((c) => !c.isOwner).length;
    const free = communities.filter((c) => c.is_free).length;
    const paid = communities.filter((c) => !c.is_free).length;
    return { total: communities.length, joined, owned, free, paid };
  }, [communities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return communities.filter((c) => {
      if (viewFilter === "joined" && c.isOwner) return false;
      if (viewFilter === "owned" && !c.isOwner) return false;
      if (planFilter === "free" && !c.is_free) return false;
      if (planFilter === "paid" && c.is_free) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [communities, search, viewFilter, planFilter]);

  const joinedCount = stats.joined;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
        <p className="text-sm font-medium">Loading your communities…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--color-accent-light)]">
                <Users className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Communities
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              My Communities
              <span className="ml-2.5 text-lg font-normal text-[var(--color-text-muted)] tabular-nums">
                ({communities.length})
              </span>
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)] max-w-xl">
              Communities you&apos;ve joined and ones you own — open the workspace, manage settings, or discover more.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => load()}
              disabled={refreshing}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm transition-all bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              title="Refresh"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            </button>
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] text-[var(--color-text-primary)]"
            >
              <Globe className="h-4 w-4" />
              Explore
            </Link>
            <Link
              href="/communities/create"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shrink-0"
              style={{ boxShadow: "0 0 20px rgba(253,80,0,0.2)" }}
            >
              <Plus className="h-4 w-4" />
              Create community
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} tone="orange" value={communities.length} label="Total" />
          <StatCard icon={Sparkles} tone="emerald" value={joinedCount} label="Joined" />
          <StatCard icon={Crown} tone="violet" value={stats.owned} label="Owned" />
          <StatCard icon={Lock} tone="sky" value={stats.paid} label="Paid access" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Input
              value={search}
              icon={<Search className="w-3.5 h-3.5" />}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug, or category…"
              className={cn(
                "w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-medium outline-none transition-all duration-150",
                "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]",
                "placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)]">
              {VIEW_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setViewFilter(f.key)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-[12px] font-semibold transition-all",
                    viewFilter === f.key
                      ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PLAN_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setPlanFilter(f.key)}
                  className={cn(
                    "h-8 px-3 rounded-full text-[12px] font-medium transition-all ring-1",
                    planFilter === f.key
                      ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] ring-[var(--color-accent)]/25"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-1">
              {communities.length === 0 ? "No communities yet" : "No matches"}
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)] max-w-sm mx-auto mb-5">
              {communities.length === 0
                ? "Join a community to connect with creators, or start your own hub."
                : "Try a different search or filter to find what you're looking for."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/communities"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)] transition-all"
              >
                <Globe className="w-4 h-4" />
                Explore communities
              </Link>
              <Link
                href="/communities/create"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all"
              >
                <Plus className="w-4 h-4" />
                Create community
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((community) => (
              <CommunityDashboardCard key={community.id} community={community} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
