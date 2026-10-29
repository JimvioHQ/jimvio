"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  DollarSign,
  Eye,
  FileVideo,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";
import { UGCNotificationCenter, type UGCNotifItem } from "./UGCNotificationCenter";

type Stats = {
  summary?: {
    totalViews: number;
    ugcEarnings: number;
    availableBalance?: number;
    pendingBalance?: number;
    approvalRate: number;
    activeProjects: number;
    pendingApplications: number;
    totalSubmissions: number;
    approvedCount: number;
    rpm?: number;
  };
  topCampaigns?: { id: string; title: string; views: number; earnings: number }[];
  recentSubmissions?: {
    id: string;
    status: string;
    platform: string;
    created_at: string;
    campaign?: { id: string; title: string } | null;
  }[];
  needsProfile?: boolean;
};

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
  hint?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_18px_rgba(17,24,39,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF4EF] text-[#FF5A1F]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-[#111827]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}

export function UGCDashboardPage() {
  const { formatMoney } = useCurrency();
  const pathname = usePathname();
  const [data, setData] = useState<Stats | null>(null);
  const [notifs, setNotifs] = useState<UGCNotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const [statsRes, notifRes] = await Promise.all([
        fetch("/api/ugc/creator/stats", { cache: "no-store" }),
        fetch("/api/notifications?limit=8", { cache: "no-store" }),
      ]);
      if (statsRes.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!statsRes.ok) throw new Error("load failed");
      setData(await statsRes.json());
      if (notifRes.ok) {
        const nJson = await notifRes.json();
        setNotifs((nJson.items ?? nJson.data ?? []) as UGCNotifItem[]);
      }
    } catch {
      setError("Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const s = data?.summary;

  const quickActions = useMemo(
    () => [
      { label: "Discover campaigns", href: "/ugc", icon: Sparkles },
      { label: "My applications", href: "/ugc/applications", icon: FileVideo },
      { label: "Active projects", href: "/ugc/campaigns", icon: Clapperboard },
      { label: "Submissions", href: "/ugc/submissions", icon: FileVideo },
      { label: "Analytics", href: "/ugc/analytics", icon: TrendingUp },
      { label: "Earnings", href: "/ugc/earnings", icon: DollarSign },
    ],
    [],
  );

  return (
    <UGCPageShell
      titleKey="dashboard"
      subtitleKey="dashboardSubtitle"
      actions={
        <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
          <Link href="/ugc">Discover campaigns</Link>
        </Button>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && unauthorized ? (
        <UGCPageEmpty
          title="Sign in required"
          description="Log in to view your creator dashboard."
          illustration="lock"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/login?redirect=/ugc/dashboard">Sign in</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && !unauthorized && (data?.needsProfile || !s) ? (
        <UGCPageEmpty
          title="Welcome to UGC & Clipping"
          description="Complete your profile and join your first campaign to see stats here."
          illustration="campaigns"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-xl bg-[#FF5A1F]">
                <Link href="/ugc">Discover campaigns</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/settings/profile">Set up profile</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      {!loading && !error && s ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Today's earnings"
              value={formatMoney(s.availableBalance ?? s.ugcEarnings, "USD")}
              icon={DollarSign}
              hint="Available balance"
            />
            <StatCard
              label="Pending earnings"
              value={formatMoney(s.pendingBalance ?? 0, "USD")}
              icon={TrendingUp}
              hint="Awaiting clearance"
            />
            <StatCard
              label="Completed campaigns"
              value={String(s.approvedCount)}
              icon={CheckCircle2}
              hint={`${s.activeProjects} active`}
            />
            <StatCard
              label="Views"
              value={s.totalViews.toLocaleString()}
              icon={Eye}
              hint={`RPM ${formatMoney(s.rpm ?? 0, "USD")}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="RPM"
              value={formatMoney(s.rpm ?? 0, "USD")}
              icon={TrendingUp}
            />
            <StatCard
              label="Approval rate"
              value={`${s.approvalRate}%`}
              icon={CheckCircle2}
            />
            <StatCard
              label="Pending applications"
              value={String(s.pendingApplications)}
              icon={FileVideo}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <UGCNotificationCenter items={notifs.slice(0, 6)} />

            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_18px_rgba(17,24,39,0.04)]">
              <h2 className="text-[14px] font-bold text-[#111827]">Recent campaigns</h2>
              <div className="mt-3 space-y-2">
                {(data.topCampaigns ?? []).length === 0 ? (
                  <p className="rounded-xl bg-[#FAFAFA] px-3 py-6 text-center text-[12px] text-[#6B7280]">
                    Join a campaign to see recent performance here.
                  </p>
                ) : (
                  (data.topCampaigns ?? []).slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/ugc/${c.id}/`}
                      className="flex items-center justify-between rounded-xl bg-[#FAFAFA] px-3 py-2.5 hover:bg-[#FFF4EF]"
                    >
                      <span className="truncate text-[13px] font-medium">{c.title}</span>
                      <span className="shrink-0 text-[12px] font-bold text-[#FF5A1F]">
                        {formatMoney(c.earnings, "USD")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-[14px] font-bold text-[#111827]">Quick actions</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-[14px] border border-[#EEF0F2] bg-white px-4 py-3 text-[13px] font-semibold text-[#374151] transition hover:border-[#FFE4D6] hover:bg-[#FFF8F5] hover:text-[#FF5A1F]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#FF5A1F]" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-40 transition group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
