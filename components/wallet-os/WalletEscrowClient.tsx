"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Lock, RefreshCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  WalletStat,
  cn,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

type EscrowEventType = "locked" | "released" | "refunded" | "disputed";

interface EscrowEvent {
  id: string;
  type: EscrowEventType | string;
  amount: number;
  currency?: string;
  title?: string;
  reference?: string | null;
  status: string;
  createdAt: string;
}

interface WalletEscrowResponse {
  currency?: string;
  summary?: { locked?: number; released?: number; refunded?: number; disputed?: number };
  events?: EscrowEvent[];
}

const EVENT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  locked: { label: "Funds locked", icon: Lock, color: "#2560B0" },
  released: { label: "Funds released", icon: CheckCircle2, color: "#1C8A44" },
  refunded: { label: "Refunded", icon: RefreshCcw, color: "#9A6B00" },
  disputed: { label: "Disputed", icon: AlertTriangle, color: "#C23A2F" },
};

export function WalletEscrowClient() {
  const { status, data, error, retry } = useWalletFetch<WalletEscrowResponse>("/api/wallet/os/escrow");
  const currency = data?.currency || "USD";
  const summary = data?.summary || {};
  const events = data?.events ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Escrow"
        description="A timeline of funds locked, released, refunded, or in dispute — across Marketplace and UGC campaigns."
        action={
          <Link href="/ugc/campaign-center/escrow">
            <WalletButton variant="outline" size="md">
              Brand escrow console
              <ArrowUpRight className="h-4 w-4" />
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WalletStat label="Locked" value={formatCurrency(summary.locked ?? 0, currency)} icon={<Lock className="h-3.5 w-3.5" />} />
        <WalletStat label="Released" value={formatCurrency(summary.released ?? 0, currency)} tone="success" />
        <WalletStat label="Refunded" value={formatCurrency(summary.refunded ?? 0, currency)} tone="warning" />
        <WalletStat label="Disputed" value={formatCurrency(summary.disputed ?? 0, currency)} />
      </div>

      {status === "loading" && <WalletLoading label="Loading escrow timeline…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The escrow endpoint isn't available yet."} onRetry={retry} />
      )}
      {(status === "empty" || (status === "ready" && events.length === 0)) && (
        <WalletEmptyState
          icon={<Lock className="h-6 w-6" />}
          title="No escrow activity yet"
          description="Funds held for Marketplace orders and UGC campaigns will show up here as they move through escrow."
        />
      )}

      {status === "ready" && events.length > 0 && (
        <WalletCard className="p-5 sm:p-6">
          <ol className="relative space-y-5 border-l border-black/[0.08] pl-6">
            {events.map((ev) => {
              const meta = EVENT_META[ev.type] ?? { label: ev.type, icon: Lock, color: "#9A9388" };
              const Icon = meta.icon;
              return (
                <li key={ev.id} className="relative">
                  <span
                    className="absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                    style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#121113]">{ev.title || meta.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#9B968D]">
                        {new Date(ev.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {ev.reference ? ` · ${ev.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <WalletPill tone={statusTone(ev.status)}>{ev.status}</WalletPill>
                      <span className={cn("text-[13px] font-semibold", ev.type === "released" ? "text-[#1C8A44]" : "text-[#121113]")}>
                        {formatCurrency(ev.amount, ev.currency || currency)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </WalletCard>
      )}
    </div>
  );
}
