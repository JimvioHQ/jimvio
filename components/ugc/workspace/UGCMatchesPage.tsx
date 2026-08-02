"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type MatchRow = {
  id: string;
  title: string;
  description?: string | null;
  campaign_type?: string;
  total_budget?: number;
  rate_per_1k_views?: number;
  score?: number;
  reasons?: string[];
  vendor?: { business_name?: string } | null;
};

export function UGCMatchesPage() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/ai/match", { cache: "no-store" });
      if (res.status === 403) {
        setError("Creator profile required for AI matches.");
        setRows([]);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setRows(json.data ?? json.matches ?? []);
    } catch {
      setError("Could not load campaign matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <UGCPageShell
      title="AI Matches"
      subtitle="Scored campaigns that fit your niche, platforms, and performance."
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <UGCPageEmpty
          title="No matches yet"
          description="Complete your creator profile and join a few campaigns so matching can learn your fit."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Browse campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                    {c.vendor?.business_name ?? "Brand"} · {c.campaign_type ?? "ugc"}
                  </p>
                  <Link
                    href={`/ugc/${c.id}`}
                    className="mt-1 block text-[15px] font-bold text-[#111827] hover:text-[#FF5A1F]"
                  >
                    {c.title}
                  </Link>
                  {c.description ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-[#6B7280]">{c.description}</p>
                  ) : null}
                  {c.reasons && c.reasons.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-[#FFE4D6] bg-[#FFF8F5] px-2 py-0.5 text-[10px] font-semibold text-[#FF5A1F]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Match</p>
                  <p className="text-2xl font-bold tabular-nums text-[#FF5A1F]">
                    {Math.round(c.score ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]">
                  <Link href={`/ugc/${c.id}`}>View campaign</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
