"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { UGCCampaign } from "@/types/ugc";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

export function UGCBrandDealsPage() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/campaigns?type=promotion&limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch {
      setError("Could not load brand deals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.vendor?.business_name?.toLowerCase().includes(q) ||
        c.promotion_target?.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  return (
    <UGCPageShell
      title="Brand Deals"
      subtitle="Direct brand offers, promotions, and partnership opportunities."
    >
      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <UGCPageEmpty
          title="No brand deals available"
          description="New partnership offers will appear here when brands launch promotion campaigns."
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc">Discover all campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                {c.vendor?.business_name ?? "Brand"}
              </p>
              <h2 className="text-[15px] font-bold text-[#111827]">{c.title}</h2>
              {c.promotion_target ? (
                <p className="mt-1 text-[12px] text-[#6B7280]">Target: {c.promotion_target}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                  <Link href={`/ugc/${c.id}`}>View offer</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href={`/ugc/${c.id}/join`}>Accept deal</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
