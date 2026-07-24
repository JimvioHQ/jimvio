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
  Layers,
  Hash,
  Activity,
  HeartPulse,
  BarChart3,
  Settings2,
  ExternalLink,
  Share2,
  Archive,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { ownerConsoleHref } from "@/lib/community/owner-console";
import { toast } from "sonner";

type HubCommunity = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  member_count: number;
  group_count: number;
  channel_count: number;
  revenue: number | null;
  currency: string | null;
  last_activity_at: string | null;
  health_score: number | null;
  role: string;
  isOwner: boolean;
  is_private: boolean;
  is_free: boolean;
  monthly_price: number | null;
};

type ViewFilter = "all" | "owned" | "staff";

const VIEW_FILTERS: { key: ViewFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "staff", label: "Staff" },
];

function healthLabel(score: number | null) {
  if (score == null) return "—";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs attention";
}

function healthTone(score: number | null) {
  if (score == null) return "text-[var(--color-text-muted)]";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-sky-600 dark:text-sky-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function relativeActivity(iso: string | null) {
  if (!iso) return "No activity yet";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function CommunityHubCard({
  community,
  onArchive,
}: {
  community: HubCommunity;
  onArchive: (id: string) => void;
}) {
  const { formatMoney } = useCurrency();
  const initial = community.name[0]?.toUpperCase() ?? "C";
  const manageHref = ownerConsoleHref(community.slug);
  const viewHref = `/communities/${community.slug}`;
  const analyticsHref = ownerConsoleHref(community.slug, "analytics");
  const settingsHref = ownerConsoleHref(community.slug, "settings");

  async function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${viewHref}`
        : viewHref;
    try {
      if (navigator.share) {
        await navigator.share({ title: community.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      } catch {
        toast.error("Could not share");
      }
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] transition-all duration-200 hover:-translate-y-0.5 hover:ring-[var(--color-border-strong)]">
      <div className="relative h-28 overflow-hidden bg-[var(--color-surface-secondary)]">
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
            <span className="select-none text-6xl font-black text-[var(--color-accent)]/10">
              {initial}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              community.isOwner
                ? "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
            )}
          >
            {community.isOwner ? "Owner" : community.role}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-0">
        <div className="relative -mt-5 mb-3">
          <div className="h-11 w-11 overflow-hidden rounded-xl bg-[var(--color-surface-secondary)] shadow-md ring-2 ring-[var(--color-surface)]">
            {community.avatar_url ? (
              <Image
                src={community.avatar_url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--color-accent)]">
                {initial}
              </div>
            )}
          </div>
        </div>

        <h2 className="truncate text-[15px] font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-accent)]">
          {community.name}
        </h2>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          {community.tagline || "Community Owner Console"}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {formatNumber(community.member_count)} members
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {formatNumber(community.group_count)} groups
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            {formatNumber(community.channel_count)} channels
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            {community.revenue != null
              ? formatMoney(community.revenue, community.currency)
              : community.is_free
                ? "Free"
                : community.monthly_price
                  ? `${formatMoney(community.monthly_price, community.currency)}/mo`
                  : "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {relativeActivity(community.last_activity_at)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              healthTone(community.health_score)
            )}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            {community.health_score != null
              ? `${community.health_score} · ${healthLabel(community.health_score)}`
              : "Health —"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={manageHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent)] text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage
          </Link>
          <Link
            href={viewHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-surface-secondary)] text-[12px] font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] transition-all hover:ring-[var(--color-border-strong)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Community
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <Link
            href={analyticsHref}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <Link
            href={settingsHref}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {community.isOwner && (
            <button
              type="button"
              onClick={() => onArchive(community.id)}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-rose-600"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function MyCommunitiesClient() {
  const router = useRouter();
  const [communities, setCommunities] = useState<HubCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/dashboard/communities");
        return;
      }

      const [ownedRes, staffRes] = await Promise.all([
        supabase
          .from("communities")
          .select(
            "id, name, slug, tagline, category, avatar_url, cover_image, member_count, is_free, is_private, monthly_price, currency, is_active, owner_id, updated_at, created_at"
          )
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .order("updated_at", { ascending: false }),
        supabase
          .from("community_memberships")
          .select(
            `role, status,
             communities!inner (
               id, name, slug, tagline, category, avatar_url, cover_image,
               member_count, is_free, is_private, monthly_price, currency,
               is_active, owner_id, updated_at, created_at
             )`
          )
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("role", ["owner", "admin", "moderator"])
          .eq("communities.is_active", true),
      ]);

      const byId = new Map<string, HubCommunity>();

      const upsert = (
        c: Record<string, unknown>,
        role: string,
        isOwner: boolean
      ) => {
        if (!c?.id || !c.slug) return;
        const id = String(c.id);
        const existing = byId.get(id);
        if (existing) {
          if (isOwner) {
            existing.isOwner = true;
            existing.role = "owner";
          }
          return;
        }
        byId.set(id, {
          id,
          slug: String(c.slug),
          name: String(c.name),
          tagline: (c.tagline as string | null) ?? null,
          category: (c.category as string | null) ?? null,
          avatar_url: (c.avatar_url as string | null) ?? null,
          cover_image: (c.cover_image as string | null) ?? null,
          member_count: Number(c.member_count ?? 0),
          group_count: 0,
          channel_count: 0,
          revenue: null,
          currency: (c.currency as string | null) ?? null,
          last_activity_at:
            (c.updated_at as string | null) ??
            (c.created_at as string | null) ??
            null,
          health_score: null,
          role,
          isOwner,
          is_private: Boolean(c.is_private),
          is_free: Boolean(c.is_free),
          monthly_price: (c.monthly_price as number | null) ?? null,
        });
      };

      for (const c of ownedRes.data ?? []) {
        upsert(c as Record<string, unknown>, "owner", true);
      }

      for (const row of staffRes.data ?? []) {
        const c = Array.isArray(row.communities)
          ? row.communities[0]
          : row.communities;
        if (!c) continue;
        const isOwner =
          (c as { owner_id?: string }).owner_id === user.id ||
          row.role === "owner";
        upsert(c as Record<string, unknown>, String(row.role ?? "admin"), isOwner);
      }

      const list = [...byId.values()];
      const ids = list.map((c) => c.id);

      if (ids.length > 0) {
        const [spacesRes, roomsRes] = await Promise.all([
          supabase.from("spaces").select("community_id").in("community_id", ids),
          supabase.from("rooms").select("community_id").in("community_id", ids),
        ]);

        if (!spacesRes.error) {
          const groupCounts = new Map<string, number>();
          for (const row of spacesRes.data ?? []) {
            const cid = String(row.community_id);
            groupCounts.set(cid, (groupCounts.get(cid) ?? 0) + 1);
          }
          for (const c of list) {
            c.group_count = groupCounts.get(c.id) ?? 0;
          }
        }
        if (!roomsRes.error) {
          const channelCounts = new Map<string, number>();
          for (const row of roomsRes.data ?? []) {
            const cid = String(row.community_id);
            channelCounts.set(cid, (channelCounts.get(cid) ?? 0) + 1);
          }
          for (const c of list) {
            c.channel_count = channelCounts.get(c.id) ?? 0;
          }
        }

        for (const c of list) {
          const structure = Math.min(40, c.group_count * 8 + c.channel_count * 4);
          const members = Math.min(
            40,
            Math.floor(Math.log10(c.member_count + 1) * 20)
          );
          const activity = c.last_activity_at
            ? Math.max(
                0,
                20 -
                  Math.min(
                    20,
                    Math.floor(
                      (Date.now() - new Date(c.last_activity_at).getTime()) /
                        86_400_000
                    )
                  )
              )
            : 0;
          c.health_score = Math.min(100, structure + members + activity);
        }
      }

      setCommunities(list);
      setLoading(false);
      setRefreshing(false);
    },
    [router]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const stats = useMemo(() => {
    const owned = communities.filter((c) => c.isOwner).length;
    const staff = communities.filter((c) => !c.isOwner).length;
    return {
      total: communities.length,
      owned,
      staff,
      members: communities.reduce((n, c) => n + c.member_count, 0),
    };
  }, [communities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return communities.filter((c) => {
      if (viewFilter === "owned" && !c.isOwner) return false;
      if (viewFilter === "staff" && c.isOwner) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [communities, search, viewFilter]);

  async function onArchive(id: string) {
    if (
      !window.confirm(
        "Archive this community? It will be hidden from discovery. You can restore it later from settings."
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("communities")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error(error.message || "Could not archive");
      return;
    }
    toast.success("Community archived");
    void load();
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
        <p className="text-sm font-medium">Loading Community Hub…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-24">
      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-accent-light)]">
                <Crown className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                Community Hub
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Communities
              <span className="ml-2.5 text-lg font-normal tabular-nums text-[var(--color-text-muted)]">
                ({communities.length})
              </span>
            </h1>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--color-text-muted)]">
              Communities you own or can manage. Open the Owner Console to run
              groups, channels, members, and settings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] transition-all hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)] disabled:opacity-50"
              title="Refresh"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>
            <Link
              href="/communities"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] transition-all hover:ring-[var(--color-border-strong)]"
            >
              <Globe className="h-4 w-4" />
              Explore
            </Link>
            <Link
              href="/communities/create"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)]"
              style={{ boxShadow: "0 0 20px rgba(253,80,0,0.2)" }}
            >
              <Plus className="h-4 w-4" />
              Create community
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Manageable", value: stats.total, icon: Crown },
            { label: "Owned", value: stats.owned, icon: Settings2 },
            { label: "Staff access", value: stats.staff, icon: Users },
            { label: "Members", value: formatNumber(stats.members), icon: Activity },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Input
            value={search}
            icon={<Search className="h-3.5 w-3.5" />}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or category…"
            className={cn(
              "h-10 w-full rounded-xl border pl-9 pr-4 text-sm font-medium outline-none transition-all duration-150",
              "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
            )}
          />
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-[var(--color-surface-secondary)] p-1 ring-1 ring-[var(--color-border)]">
            {VIEW_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setViewFilter(f.key)}
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px] font-semibold transition-all",
                  viewFilter === f.key
                    ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)]">
              <Crown className="h-6 w-6 text-[var(--color-text-muted)]" />
            </div>
            <h2 className="mb-1 text-base font-bold text-[var(--color-text-primary)]">
              {communities.length === 0
                ? "No communities to manage"
                : "No matches"}
            </h2>
            <p className="mx-auto mb-5 max-w-sm text-[13px] text-[var(--color-text-muted)]">
              {communities.length === 0
                ? "Create a community to open the Owner Console, or ask an owner to grant staff access."
                : "Try a different search or filter."}
            </p>
            <Link
              href="/communities/create"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            >
              <Plus className="h-4 w-4" />
              Create community
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {filtered.map((community) => (
              <CommunityHubCard
                key={community.id}
                community={community}
                onArchive={onArchive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
