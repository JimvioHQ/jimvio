"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileStack, FolderOpen, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { isUgcCampaignNotification } from "@/lib/ugc/ugc-notification-filter";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  action_url?: string | null;
  is_read?: boolean | null;
  category?: string | null;
  type?: string | null;
  campaignTitle?: string | null;
};

type FilterId = "all" | "campaigns" | "creators" | "submissions" | "payments";

function classify(n: Notif): FilterId {
  const hay = `${n.title ?? ""} ${n.message ?? ""} ${n.action_url ?? ""} ${n.type ?? ""}`.toLowerCase();
  if (hay.includes("submission") || hay.includes("approved") || hay.includes("rejected") || hay.includes("revision")) {
    return "submissions";
  }
  if (hay.includes("payment") || hay.includes("payout") || hay.includes("fund") || hay.includes("escrow")) {
    return "payments";
  }
  if (hay.includes("creator") || hay.includes("applied") || hay.includes("invite") || hay.includes("joined") || hay.includes("application")) {
    return "creators";
  }
  return "campaigns";
}

function iconFor(kind: FilterId) {
  if (kind === "submissions") return FileStack;
  if (kind === "payments") return Wallet;
  if (kind === "creators") return Users;
  return FolderOpen;
}

export function UGCActivityPage() {
  const { workspaces, ugcFetch } = useUgcBrandWorkspace();
  const brandMode = workspaces.length > 0;
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (brandMode) {
        const res = await ugcFetch("/api/ugc/brand/dashboard", { cache: "no-store" });
        if (res.status === 401) {
          setError("sign_in");
          return;
        }
        if (!res.ok) throw new Error("load failed");
        const json = await res.json();
        const rows = ((json.activity ?? []) as Array<{
          id: string;
          title: string;
          message: string;
          campaignTitle: string | null;
          href: string | null;
          createdAt: string | null;
        }>).map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          action_url: row.href,
          created_at: row.createdAt,
          campaignTitle: row.campaignTitle,
        }));
        setItems(rows);
        return;
      }

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
      setItems(
        rows.filter((n) =>
          isUgcCampaignNotification({
            category: n.category,
            type: n.type,
            title: n.title,
            message: n.message,
            actionUrl: n.action_url,
          }),
        ),
      );
    } catch {
      setError("Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [brandMode, ugcFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load activity on mount
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((n) => classify(n) === filter);
  }, [items, filter]);

  const filters: Array<{ id: FilterId; label: string }> = [
    { id: "all", label: "All" },
    { id: "campaigns", label: "Campaigns" },
    { id: "creators", label: "Creators" },
    { id: "submissions", label: "Submissions" },
    { id: "payments", label: "Payments" },
  ];

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
      {!loading && !error ? (
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium",
                filter === f.id ? "bg-[#FFF4EF] text-[#FF5A1F]" : "text-[#6B7280] hover:bg-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <UGCPageEmpty
          title="No recent campaign activity"
          description="Campaign activity will appear here as creators and campaigns progress."
          illustration="bell"
        />
      ) : null}
      {!loading && !error && items.length > 0 && visible.length === 0 ? (
        <p className="text-[13px] text-[#6B7280]">No matching campaign activity.</p>
      ) : null}
      {!loading && !error && visible.length > 0 ? (
        <ul className="space-y-2">
          {visible.map((n) => {
            const kind = classify(n);
            const Icon = iconFor(kind);
            const inner = (
              <div className="flex gap-3 rounded-[14px] border border-[#EEF0F2] bg-white px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#111827]">{n.title || n.message || "Campaign update"}</p>
                  {n.message && n.title ? (
                    <p className="mt-1 text-[13px] text-[#64748B]">{n.message}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-[#94A3B8]">
                    {[n.campaignTitle, n.created_at ? new Date(n.created_at).toLocaleString() : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
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
