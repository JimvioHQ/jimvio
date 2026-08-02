"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  Gift,
  Lock,
  Megaphone,
  Package,
  Receipt,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Users2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  cn,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

type LedgerCategory =
  | "marketplace"
  | "ugc"
  | "affiliate"
  | "community"
  | "orders"
  | "escrow"
  | "rewards"
  | "refunds"
  | "fees";

interface LedgerEntry {
  id: string;
  date: string;
  category: LedgerCategory | string;
  description?: string;
  reference?: string | null;
  amount: number;
  currency?: string;
  direction?: "credit" | "debit";
  status: string;
}

interface WalletLedgerResponse {
  currency?: string;
  transactions?: LedgerEntry[];
}

const CATEGORY_META: Record<LedgerCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  marketplace: { label: "Marketplace", icon: ShoppingBag, color: "#2D7DD2" },
  ugc: { label: "UGC", icon: Megaphone, color: "#FF5A1F" },
  affiliate: { label: "Affiliate", icon: Users2, color: "#8A6DF0" },
  community: { label: "Community", icon: Sparkles, color: "#D6A400" },
  orders: { label: "Orders", icon: Package, color: "#1C8A44" },
  escrow: { label: "Escrow", icon: Lock, color: "#2560B0" },
  rewards: { label: "Rewards", icon: Gift, color: "#C2570D" },
  refunds: { label: "Refunds", icon: RefreshCcw, color: "#9A6B00" },
  fees: { label: "Fees", icon: Receipt, color: "#736C60" },
};

const FILTERS: Array<{ id: "all" | LedgerCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "marketplace", label: "Marketplace" },
  { id: "ugc", label: "UGC" },
  { id: "affiliate", label: "Affiliate" },
  { id: "community", label: "Community" },
  { id: "orders", label: "Orders" },
  { id: "escrow", label: "Escrow" },
  { id: "rewards", label: "Rewards" },
  { id: "refunds", label: "Refunds" },
  { id: "fees", label: "Fees" },
];

function categoryMeta(category: string) {
  return CATEGORY_META[category as LedgerCategory] ?? { label: category || "Other", icon: Receipt, color: "#9A9388" };
}

async function downloadExport(format: "csv" | "pdf") {
  try {
    const res = await fetch(`/api/wallet/os/export?format=${format}`, { cache: "no-store" });
    if (!res.ok) throw new Error("export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jimvio-wallet-transactions.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(`/api/wallet/os/export?format=${format}`, "_blank");
  }
}

export function WalletLedgerClient() {
  const { status, data, error, retry } = useWalletFetch<WalletLedgerResponse>("/api/wallet/os/ledger");
  const [activeFilter, setActiveFilter] = useState<"all" | LedgerCategory>("all");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const currency = data?.currency || "USD";
  const transactions = data?.transactions ?? [];

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeFilter !== "all" && tx.category !== activeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${tx.description ?? ""} ${tx.reference ?? ""} ${tx.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, activeFilter, query]);

  async function handleExport(format: "csv" | "pdf") {
    setExporting(format);
    await downloadExport(format);
    setExporting(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Transactions"
        description="A professional ledger of every credit, debit and fee across Marketplace, UGC, Affiliate and Community."
        action={
          <div className="flex flex-wrap gap-2">
            <WalletButton variant="outline" size="md" loading={exporting === "csv"} onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4" />
              Export CSV
            </WalletButton>
            <WalletButton variant="outline" size="md" loading={exporting === "pdf"} onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4" />
              Export PDF
            </WalletButton>
          </div>
        }
        className="mb-6"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                activeFilter === f.id ? "bg-[#121113] text-white" : "bg-white text-[#726D64] border border-black/[0.06] hover:border-black/15",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B9B3A6]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions…"
            className="h-9 w-full rounded-full border border-black/[0.08] bg-white pl-9 pr-3 text-[13px] text-[#121113] placeholder:text-[#B9B3A6] outline-none focus:border-[#FF5A1F]/50"
          />
        </div>
      </div>

      {status === "loading" && <WalletLoading label="Loading ledger…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The ledger endpoint isn't available yet."} onRetry={retry} />
      )}
      {(status === "empty" || (status === "ready" && filtered.length === 0)) && (
        <WalletEmptyState
          title={transactions.length === 0 ? "No transactions yet" : "No matches"}
          description={
            transactions.length === 0
              ? "Your Marketplace, UGC, Affiliate and Community activity will appear here."
              : "Try a different filter or search term."
          }
        />
      )}

      {status === "ready" && filtered.length > 0 && (
        <WalletCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {["Transaction", "Date", "Amount", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9B968D] sm:px-5",
                        i === 2 && "text-right",
                        i === 3 && "text-center",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {filtered.map((tx) => {
                  const meta = categoryMeta(tx.category);
                  const Icon = meta.icon;
                  const isCredit = tx.direction ? tx.direction === "credit" : tx.amount >= 0;
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-black/[0.015]">
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[#121113]">
                              {tx.description || meta.label}
                            </p>
                            {tx.reference && (
                              <p className="truncate text-[10.5px] text-[#9B968D]">{tx.reference}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[12.5px] text-[#726D64] sm:px-5">
                        {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] font-semibold sm:px-5">
                        <span className={isCredit ? "text-[#1C8A44]" : "text-[#121113]"}>
                          {isCredit ? "+" : "-"}
                          {formatCurrency(Math.abs(tx.amount), tx.currency || currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center sm:px-5">
                        <WalletPill tone={statusTone(tx.status)}>{tx.status}</WalletPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.015] px-4 py-3 sm:px-5">
            <span className="text-[11.5px] text-[#9B968D]">
              Showing {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </WalletCard>
      )}
    </div>
  );
}
