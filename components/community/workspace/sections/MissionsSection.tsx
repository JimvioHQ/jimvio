// components/workspace/sections/MissionsSection.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Target, Plus, Flame, Clock, Users, ChevronRight } from "lucide-react";
import type { WorkspaceCommunity, WorkspaceRole, WorkspaceView } from "@/types/workspace";

interface Mission {
  id: string;
  title: string;
  campaign_type: string;
  fixed_rate: number;
  rate_per_1k_views: number;
  payment_model: string;
  submission_count: number;
  total_budget: number;
  ends_at: string | null;
  ugc_campaign_media: { url: string; type: string }[] | null;
}

interface Props {
  community: WorkspaceCommunity;
  currentUserId: string;
  role: WorkspaceRole;
  view: WorkspaceView;
  isAdmin: boolean;
  isOwner: boolean;
}

export function MissionsSection({ community, currentUserId, role, view, isAdmin, isOwner }: Props) {
  const supabase = createClient();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ending" | "new">("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("ugc_campaigns")
        .select(`
          id, title, campaign_type, fixed_rate, rate_per_1k_views, payment_model,
          submission_count, total_budget, ends_at,
          ugc_campaign_media(url, type)
        `)
        .eq("status", "active")
        .order("submission_count", { ascending: false })
        .limit(12);
      if (!cancelled) {
        setMissions((data ?? []) as unknown as Mission[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [supabase]);

  const filtered = missions.filter((m) => {
    if (filter === "ending" && m.ends_at) {
      const days = (new Date(m.ends_at).getTime() - Date.now()) / 86_400_000;
      return days <= 7 && days > 0;
    }
    if (filter === "new") return m.submission_count < 5;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {(["all", "ending", "new"] as const).map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                filter === f
                  ? "bg-[#fd5000] text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {f === "all" ? "All open" : f === "ending" ? "Ending soon" : "Just launched"}
            </button>
          ))}
        </div>

        {isAdmin && view === "admin" && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-3 py-2 rounded-lg"
            style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            New mission
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <MissionsSkeleton />
      ) : filtered.length === 0 ? (
        <MissionsEmpty filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((m) => <MissionCard key={m.id} mission={m} />)}
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const cover = mission.ugc_campaign_media?.find((x) => x.type === "image")?.url ?? null;
  const isPerViews = mission.payment_model === "per_views";
  const earn = isPerViews
    ? `$${mission.rate_per_1k_views}/1k views`
    : `$${mission.fixed_rate}`;
  const days = mission.ends_at
    ? Math.ceil((new Date(mission.ends_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const isEndingSoon = days !== null && days <= 3 && days > 0;
  const isHot = mission.submission_count >= 20;

  return (
    <Link
      href={`/ugc/${mission.id}`}
      className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-[#fd5000]/30 transition-all"
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] bg-surface-secondary overflow-hidden">
        {cover ? (
          <img src={cover} alt={mission.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${mission.title.charCodeAt(0) % 360},65%,30%), hsl(${mission.title.charCodeAt(0) % 360},65%,50%))` }}>
            <Target className="w-8 h-8 text-white/50" />
          </div>
        )}
        {isHot && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-[#fd5000] text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
            <Flame className="w-2.5 h-2.5" />
            HOT
          </div>
        )}
        {isEndingSoon && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />
            {days}D LEFT
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="text-[13px] font-bold text-text-primary truncate group-hover:text-[#fd5000] transition-colors">
            {mission.title}
          </h3>
          <span className="text-[12px] font-bold text-[#fd5000] whitespace-nowrap">{earn}</span>
        </div>
        <p className="text-[11px] text-text-muted mb-3 capitalize">
          {mission.campaign_type.replace(/_/g, " ")}
        </p>
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {mission.submission_count} joined
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-[#fd5000] opacity-0 group-hover:opacity-100 transition-opacity">
            View
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MissionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-surface-secondary" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-3/4 rounded bg-surface-secondary" />
            <div className="h-2 w-1/3 rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionsEmpty({ filter }: { filter: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
        <Target className="w-6 h-6 text-[#fd5000]" />
      </div>
      <h3 className="text-[15px] font-bold text-text-primary mb-1">
        {filter === "ending" ? "Nothing closing this week" : filter === "new" ? "No fresh missions yet" : "No active missions"}
      </h3>
      <p className="text-[12px] text-text-muted max-w-sm">
        Brands launch new ones regularly. Check back soon, or browse all open missions across the platform.
      </p>
    </div>
  );
}