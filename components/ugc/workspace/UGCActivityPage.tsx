"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type Notif = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  action_url?: string | null;
  is_read?: boolean | null;
  category?: string | null;
  type?: string | null;
};

export function UGCActivityPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications?limit=40&category=campaign_update", {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("sign_in");
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      const rows = (json.items ?? json.data ?? []) as Notif[];
      setItems(rows.filter((n) => {
        const hay = `${n.category ?? ""} ${n.type ?? ""} ${n.title ?? ""} ${n.message ?? ""} ${n.action_url ?? ""}`.toLowerCase();
        return hay.includes("campaign") || hay.includes("ugc") || hay.includes("submission") || n.category === "campaign_update";
      }));
    } catch {
      setError("Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load activity on mount
    void load();
  }, [load]);

  return (
    <UGCPageShell
      title="Activity"
      subtitle="Campaign notifications, approvals, and payout updates."
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error === "sign_in" ? (
        <UGCPageEmpty
          title="Sign in required"
          description="Log in to see UGC campaign notifications."
          illustration="lock"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/login?redirect=/ugc/activity">Sign in</Link>
            </Button>
          }
        />
      ) : null}
      {!loading && error && error !== "sign_in" ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && items.length === 0 ? (
        <UGCPageEmpty
          title="You're all caught up"
          description="Campaign approvals, revision requests, and payout updates will appear here."
          illustration="bell"
        />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((n) => {
            const inner = (
              <div className="rounded-[14px] border border-[#EEF0F2] bg-white px-4 py-3">
                <p className="text-[14px] font-semibold text-[#111827]">{n.title || n.message || "Campaign update"}</p>
                {n.message && n.title ? (
                  <p className="mt-1 text-[13px] text-[#64748B]">{n.message}</p>
                ) : null}
                {n.created_at ? (
                  <p className="mt-1 text-[11px] text-[#94A3B8]">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            );
            return (
              <li key={n.id}>
                {n.action_url ? <Link href={n.action_url}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      ) : null}
    </UGCPageShell>
  );
}
