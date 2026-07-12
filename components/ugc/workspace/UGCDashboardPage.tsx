"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type Stats = {
  summary?: {
    totalViews: number;
    ugcEarnings: number;
    approvalRate: number;
    activeProjects: number;
    pendingApplications: number;
    totalSubmissions: number;
    approvedCount: number;
  };
  needsProfile?: boolean;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

export function UGCDashboardPage() {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const res = await fetch("/api/ugc/creator/stats", { cache: "no-store" });
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch {
      setError("Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;

  return (
    <UGCPageShell
      title="Dashboard"
      subtitle="Your UGC workspace overview — projects, earnings, and next actions."
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
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-xl bg-[#FF5A1F]">
                <Link href="/ugc">Discover campaigns</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/c/profile">Set up profile</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      {!loading && !error && s ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active projects" value={String(s.activeProjects)} />
            <StatCard label="Pending applications" value={String(s.pendingApplications)} />
            <StatCard label="Total views" value={s.totalViews.toLocaleString()} />
            <StatCard label="UGC earnings" value={formatMoney(s.ugcEarnings, "USD")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Applications", href: "/ugc/applications" },
              { label: "Active projects", href: "/ugc/campaigns" },
              { label: "Submissions", href: "/ugc/submissions" },
              { label: "Analytics", href: "/ugc/analytics" },
              { label: "Earnings", href: "/ugc/earnings" },
              { label: "Clipping hub", href: "/ugc/clipping" },
              { label: "Templates", href: "/ugc/templates" },
              { label: "Brand deals", href: "/ugc/brand-deals" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[14px] border border-[#EEF0F2] bg-white px-4 py-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#FFE4D6] hover:bg-[#FFF8F5] hover:text-[#FF5A1F]"
              >
                {item.label} →
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
