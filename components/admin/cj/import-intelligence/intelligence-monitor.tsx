"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CATALOG_TIER_STYLES } from "@/lib/cj/import-intelligence/quality-engine";
import type { CatalogTier } from "@/lib/cj/import-intelligence/types";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";

const STORAGE_KEY = "jimvio:cj-intelligence-monitor-collapsed";

interface MonitoringPayload {
  schema: {
    ready: boolean;
    missingTables: string[];
    migrationFile: string;
  };
  monitoring: {
    tierCounts: Record<CatalogTier, number>;
    rawTotal: number;
    queuePending: number;
    queueFailed: number;
    queueDeadLetter: number;
    avgHealthScore: number;
    lastSyncAt: string | null;
    lastEnrichmentAt: string | null;
  };
}

const COLLAPSED_TIERS: CatalogTier[] = ["ELITE", "PREMIUM", "STANDARD", "PENDING"];

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
}

export function IntelligenceMonitor({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const [data, setData] = useState<MonitoringPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cj/catalog/health");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Health load failed");
      setData({ schema: json.schema, monitoring: json.monitoring });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function handleBootstrap() {
    setBootstrapping(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cj/catalog/bootstrap", { method: "POST" });
      const json = await res.json();
      if (!json.success && !json.schemaReady) {
        throw new Error(json.syncError || json.error || "Bootstrap failed");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBootstrapping(false);
    }
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(next);
      return next;
    });
  }

  const m = data?.monitoring;
  const schema = data?.schema;
  const queueTotal =
    (m?.queuePending ?? 0) + (m?.queueFailed ?? 0) + (m?.queueDeadLetter ?? 0);

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-[#E5E7EB] px-2 text-[10px] font-medium text-[#374151] disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
      <button
        type="button"
        onClick={() => void handleBootstrap()}
        disabled={bootstrapping}
        className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#FF5A1F] px-2.5 text-[10px] font-semibold text-white disabled:opacity-60"
      >
        {bootstrapping ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        <span className="hidden sm:inline">Sync & Enrich</span>
        <span className="sm:hidden">Sync</span>
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-[12px] border border-[#E5E7EB] bg-white overflow-hidden",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11px] font-semibold text-[#111827] shrink-0">
            📊 Intelligence Monitor
          </p>
          {m && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] tabular-nums text-[#374151]">
              {COLLAPSED_TIERS.map((tier) => {
                const style = CATALOG_TIER_STYLES[tier];
                return (
                  <span key={tier} className="whitespace-nowrap">
                    {style.emoji} {style.label}:{" "}
                    <strong>{(m.tierCounts[tier] ?? 0).toLocaleString()}</strong>
                  </span>
                );
              })}
              <span className="whitespace-nowrap">
                🔄 Queue: <strong>{queueTotal.toLocaleString()}</strong>
              </span>
            </div>
          )}
          {loading && !m && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9CA3AF]" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {actionButtons}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-7 items-center gap-0.5 rounded-[8px] border border-[#E5E7EB] px-2 text-[10px] font-medium text-[#374151]"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                Show <ChevronDown className="h-3 w-3" />
              </>
            ) : (
              <>
                Hide <ChevronUp className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-[#F3F4F6] px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
            {schema && !schema.ready && (
              <div className="rounded-[8px] border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] text-red-800">
                <strong>Database not ready.</strong> Missing:{" "}
                {schema.missingTables.join(", ")}. Run{" "}
                <code className="font-mono">{schema.migrationFile}</code> in Supabase SQL
                Editor, then reload schema cache.
              </div>
            )}

            {error && (
              <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900">
                {error}
              </div>
            )}

            {m && (
              <>
                <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                  <Stat label="Raw catalog" value={m.rawTotal} />
                  <Stat label="Queue pending" value={m.queuePending} />
                  <Stat label="Failed jobs" value={m.queueFailed} />
                  <Stat label="Dead letter" value={m.queueDeadLetter} />
                  <Stat label="Avg health" value={`${m.avgHealthScore}`} />
                  <Stat
                    label="Last sync"
                    value={
                      m.lastSyncAt
                        ? new Date(m.lastSyncAt).toLocaleString()
                        : "—"
                    }
                  />
                  <Stat
                    label="Last enrichment"
                    value={
                      m.lastEnrichmentAt
                        ? new Date(m.lastEnrichmentAt).toLocaleString()
                        : "—"
                    }
                  />
                  <Stat
                    label="Hidden"
                    value={m.tierCounts.HIDDEN ?? 0}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[8px] bg-[#F9FAFB] px-2 py-1.5">
      <p className="text-[9px] text-[#9CA3AF]">{label}</p>
      <p className="truncate font-semibold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}
