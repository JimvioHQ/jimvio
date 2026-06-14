import React from "react";
import Link from "next/link";
import { getAdminDB } from "@/services/db";
import { cn } from "@/lib/utils";
import { formatAdminMoney, formatAdminMoneyTotals, formatAdminWalletMoney } from "@/lib/admin/format-money";
import {
  TrendingUp, Clock, AlertTriangle, Wallet, Users, XCircle,
  CheckCircle2, ArrowUpRight, ExternalLink, ShoppingBag,
  CreditCard, Activity, ChevronDown,
} from "lucide-react";
import { ProviderLogo, RangePicker } from "@/components/ui/admin";
import { TabCountBadge } from "@/components/ui/tab-count-badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

// ─── Date helpers ─────────────────────────────────────────────────────────────

type RangeKey = "today" | "7d" | "30d" | "mtd" | "qtd" | "ytd";

const RANGES: Record<RangeKey, { label: string; start: () => Date }> = {
  today: { label: "Today", start: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; } },
  "7d": { label: "Last 7 days", start: () => new Date(Date.now() - 7 * 86400_000) },
  "30d": { label: "Last 30 days", start: () => new Date(Date.now() - 30 * 86400_000) },
  mtd: { label: "This month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); } },
  qtd: { label: "This quarter", start: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); } },
  ytd: { label: "Year to date", start: () => new Date(new Date().getFullYear(), 0, 1) },
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Atomic UI ────────────────────────────────────────────────────────────────

function StatusPill({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
    processing: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400",
    failed: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    refunded: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset tabular-nums capitalize",
      size === "md" ? "px-2.5 py-1 text-[11.5px]" : "px-2 py-0.5 text-[10.5px]",
      map[status] ?? map.pending,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}


function StatCard({
  label, value, sublabel, icon: Icon, tone = "default", href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ElementType;
  tone?: "default" | "warn" | "danger" | "success";
  href?: string;
}) {
  const ring = {
    default: "ring-[var(--color-border)]",
    warn: "ring-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10",
    danger: "ring-rose-500/30 bg-rose-50/40 dark:bg-rose-950/10",
    success: "ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10",
  }[tone];
  const iconCls = {
    default: "text-[var(--color-text-muted)]",
    warn: "text-amber-600",
    danger: "text-rose-600",
    success: "text-emerald-600",
  }[tone];

  const card = (
    <div className={cn(
      "group relative h-full p-5 rounded-2xl bg-[var(--color-surface)] ring-1 transition-all",
      "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]",
      ring,
    )}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <Icon className={cn("h-4 w-4 shrink-0", iconCls)} />
      </div>
      <p className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight mt-2">
        {value}
      </p>
      {sublabel && (
        <p className="text-[11.5px] text-[var(--color-text-muted)] mt-1">
          {sublabel}
        </p>
      )}
      {href && (
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Provider health card ─────────────────────────────────────────────────────

function ProviderHealthCard({
  provider, total, completed, failed,
}: { provider: string; total: number; completed: number; failed: number }) {
  const pending = total - completed - failed;
  const successRate = total > 0 ? (completed / total) * 100 : 0;
  const healthy = successRate >= 90 || total === 0;

  return (
    <div className="p-4 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={provider} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)] capitalize">{provider}</p>
          <p className="text-[10.5px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
            {total} transactions
          </p>
        </div>
        <p className={cn(
          "text-[15px] font-semibold tabular-nums",
          healthy ? "text-emerald-600" : "text-rose-600"
        )}>
          {total > 0 ? `${successRate.toFixed(0)}%` : "—"}
        </p>
      </div>
      {total > 0 && (
        <>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${(completed / total) * 100}%` }} />
            <div className="h-full bg-amber-500" style={{ width: `${(pending / total) * 100}%` }} />
            <div className="h-full bg-rose-500" style={{ width: `${(failed / total) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[10.5px] tabular-nums">
            <span className="text-emerald-600">{completed} ok</span>
            {pending > 0 && <span className="text-amber-600">{pending} pending</span>}
            {failed > 0 && <span className="text-rose-600">{failed} failed</span>}
          </div>
        </>
      )}
    </div>
  );
}


type TabKey = "transactions" | "orders" | "payouts" | "health";

function Tabs({
  range,
  current,
  counts,
  qs,
}: {
  range: RangeKey;
  current: TabKey;
  counts: Record<TabKey, number>;
  qs: (over?: Record<string, string>) => string;
}) {
  const items: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "transactions", label: "Transactions", icon: Activity },
    { key: "orders", label: "Orders", icon: ShoppingBag },
    { key: "payouts", label: "Payouts", icon: Wallet },
    { key: "health", label: "Provider health", icon: CreditCard },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto whitespace-nowrap no-scrollbar">
      {items.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        return (
          <Link
            key={key}
            href={`/admin/payments${qs({ tab: key === "transactions" ? "" : key, page: "" })}`}
            scroll={false}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 h-10 text-[13px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              active
                ? "text-[var(--color-text-primary)] border-orange-500"
                : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <TabCountBadge count={counts[key]} active={active} />
          </Link>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: RangeKey; tab?: TabKey; page?: string }>;
}) {
  const params = await searchParams;
  const range: RangeKey = params.range && RANGES[params.range] ? params.range : "mtd";
  const tab: TabKey = params.tab ?? "transactions";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = PAGE_SIZE;
  const startIso = RANGES[range].start().toISOString();

  const qs = (over: Record<string, string> = {}) => {
    const u = new URLSearchParams();
    if (range !== "mtd") u.set("range", range);
    if (tab !== "transactions") u.set("tab", tab);
    if (page > 1) u.set("page", String(page));
    Object.entries(over).forEach(([k, v]) => {
      if (!v || v === "all" || (k === "range" && v === "mtd") || (k === "tab" && v === "transactions") || (k === "page" && v === "1")) {
        u.delete(k);
      } else {
        u.set(k, v);
      }
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  const admin = getAdminDB();

  // ── Parallel fetch — only what each tab + KPIs need ────────────────────
  const [
    { data: kpiTx },
    { data: providerStats },
    { data: failedCredits, count: failedCreditsCount },
    { data: pendingPayoutsTotal },
    { data: commissionData },
    { data: txRows, count: txCount },
    { data: orderRows, count: orderCount },
    { data: payoutRows, count: payoutCount },
    { count: transactionsTabCount },
    { count: ordersTabCount },
    { count: payoutsTabCount },
  ] = await Promise.all([
    admin.from("transactions")
      .select("amount, amount_usd, currency, status, provider")
      .gte("created_at", startIso),

    admin.from("transactions")
      .select("provider, status")
      .gte("created_at", startIso),

    admin.from("failed_wallet_credits")
      .select("id, order_id, vendor_id, amount, currency, reason, created_at", { count: "exact" })
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(5),

    admin.from("payouts")
      .select("amount, currency")
      .in("status", ["pending", "processing"]),

    admin.from("affiliate_commissions")
      .select("commission_amount, status")
      .gte("created_at", startIso),

    tab === "transactions"
      ? admin.from("transactions")
        .select(
          `id, amount, currency, amount_usd, status, provider,
             provider_transaction_id, type, created_at, description,
             order_id,
             profiles!transactions_user_id_fkey(full_name, email),
             orders(order_number)`,
          { count: "exact" }
        )
        .gte("created_at", startIso)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      : Promise.resolve({ data: [] as any[], count: 0 }),

    tab === "orders"
      ? admin.from("orders")
        .select(
          `id, order_number, total_amount, currency, status, payment_status,
             integration_source, created_at, buyer_id,
             profiles!orders_buyer_id_fkey(full_name, email),
             vendors(business_name)`,
          { count: "exact" }
        )
        .gte("created_at", startIso)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      : Promise.resolve({ data: [] as any[], count: 0 }),

    tab === "payouts"
      ? admin.from("payouts")
        .select(
          `id, user_id, type, amount, fee, net_amount, currency, status,
             payout_method, processed_at, created_at,
             profiles(full_name, email)`,
          { count: "exact" }
        )
        .gte("created_at", startIso)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      : Promise.resolve({ data: [] as any[], count: 0 }),

    admin.from("transactions").select("id", { count: "exact", head: true }).gte("created_at", startIso),
    admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", startIso),
    admin.from("payouts").select("id", { count: "exact", head: true }).gte("created_at", startIso),
  ]);

  // ── KPIs ───────────────────────────────────────────────────────────────
  const txList = (kpiTx ?? []) as Array<{
    amount: number; amount_usd: number | null; currency: string;
    status: string; provider: string;
  }>;

  const usdValue = (t: { amount_usd: number | null; amount: number; currency: string }) =>
    t.amount_usd ?? (t.currency === "USD" ? Number(t.amount) : 0);

  const grossRevenueUsd = txList.filter((t) => t.status === "completed").reduce((s, t) => s + usdValue(t), 0);
  const pendingAmount = txList.filter((t) => t.status === "pending").reduce((s, t) => s + usdValue(t), 0);
  const failedCount = txList.filter((t) => t.status === "failed").length;
  const pendingPayoutRows = (pendingPayoutsTotal ?? []) as Array<{ amount: number; currency?: string | null }>;
  const payoutsPendingDisplay = formatAdminMoneyTotals(
    pendingPayoutRows.map((p) => ({ amount: p.amount, currency: p.currency })),
    "RWF"
  );
  const commissionsTotal = (commissionData ?? []).reduce((s, c) => s + Number(c.commission_amount as number ?? 0), 0);

  const providers = ["flutterwave", "pesapal", "paypal", "nowpayments", "pawapay", "afripay", "binance"] as const;
const providerHealth = providers
  .map((p) => {
    const rows = (providerStats ?? []).filter((r: any) => r.provider === p);
    const total = rows.length;
    const completed = rows.filter((r: any) => r.status === "completed").length;
    const failed = rows.filter((r: any) => r.status === "failed").length;
    const successRate = total > 0 ? completed / total : 0;
    return { provider: p, total, completed, failed, successRate };
  })
  .sort((a, b) => {
    if (a.total !== b.total && (a.total === 0 || b.total === 0)) {
      return b.total - a.total;
    }
    if (b.successRate !== a.successRate) {
      return b.successRate - a.successRate;
    }
    return b.total - a.total;
  });

  const activeTabCount =
    tab === "transactions" ? (txCount ?? 0)
    : tab === "orders" ? (orderCount ?? 0)
    : tab === "payouts" ? (payoutCount ?? 0)
    : 0;
  const totalPages = activeTabCount ? Math.ceil(activeTabCount / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
            Admin · Finance
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Payments
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {RANGES[range].label} · all transactions, orders, and payouts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RangePicker current={range} base="/admin/payments" />
          <button className="h-[38px] px-4 rounded-sm text-[12px] font-medium bg-[var(--color-surface)] ring-[0.5px] ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-all duration-150 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] whitespace-nowrap">
            Export
          </button>
        </div>
      </div>

      {/* Failed credits alert */}
      {(failedCreditsCount ?? 0) > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 ring-1 ring-rose-500/20">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">
              {failedCreditsCount} vendor {failedCreditsCount === 1 ? "credit" : "credits"} need attention
            </p>
            <p className="text-[12px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Payments succeeded but vendor wallets weren't credited. Manual review required.
            </p>
          </div>
          <Link
            href="/admin/payments/failed-credits"
            className="text-[12px] font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 shrink-0"
          >
            Review →
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Gross revenue" value={formatAdminMoney(grossRevenueUsd, "USD")} sublabel="Completed · USD" icon={TrendingUp} tone="success" />
        <StatCard label="Pending" value={formatAdminMoney(pendingAmount, "USD")} sublabel="Awaiting confirmation" icon={Clock} tone={pendingAmount > 1000 ? "warn" : "default"} />
        <StatCard label="Failed" value={failedCount.toLocaleString()} sublabel={RANGES[range].label.toLowerCase()} icon={XCircle} tone={failedCount > 5 ? "danger" : "default"} />
        <StatCard label="Payouts pending" value={payoutsPendingDisplay} sublabel="Vendors & affiliates" icon={Wallet} href={`/admin/payments${qs({ tab: "payouts", page: "" })}`} />
        <StatCard label="Commissions" value={formatAdminWalletMoney(commissionsTotal)} sublabel="Affiliate earnings" icon={Users} />
        <StatCard label="Stuck credits" value={(failedCreditsCount ?? 0).toLocaleString()} sublabel="Need manual review" icon={AlertTriangle} tone={(failedCreditsCount ?? 0) > 0 ? "danger" : "default"} href="/admin/payments/failed-credits" />
      </div>

      {/* Tabs */}
      <Tabs
        range={range}
        current={tab}
        qs={qs}
        counts={{
          transactions: transactionsTabCount ?? 0,
          orders: ordersTabCount ?? 0,
          payouts: payoutsTabCount ?? 0,
          health: providerHealth.length,
        }}
      />

      {/* Tab body */}
      {tab === "transactions" && (
        <TransactionsTable
          rows={txRows ?? []}
          count={txCount ?? 0}
          page={page}
          totalPages={totalPages}
          qs={qs}
        />
      )}
      {tab === "orders" && (
        <OrdersTable
          rows={orderRows ?? []}
          count={orderCount ?? 0}
          page={page}
          totalPages={totalPages}
          qs={qs}
        />
      )}
      {tab === "payouts" && (
        <PayoutsTable
          rows={payoutRows ?? []}
          count={payoutCount ?? 0}
          page={page}
          totalPages={totalPages}
          qs={qs}
        />
      )}
      {tab === "health" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providerHealth.map((p) => <ProviderHealthCard key={p.provider} {...p} />)}
          <Link
            href="/admin/payments/webhooks"
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-colors text-[12.5px] font-medium text-[var(--color-text-muted)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View webhook log
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Table shells ─────────────────────────────────────────────────────────────

function TableShell({
  title, count, total, href, empty, children, page, totalPages, pageSize, qs,
}: {
  title: string;
  count: number;
  total: number;
  href: string;
  empty: React.ReactNode;
  children: React.ReactNode;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  qs?: (over?: Record<string, string>) => string;
}) {
  const size = pageSize ?? PAGE_SIZE;
  const from = total === 0 ? 0 : ((page ?? 1) - 1) * size + 1;
  const to = Math.min((page ?? 1) * size, total);

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
            {total === 0
              ? "No results"
              : totalPages && totalPages > 1
                ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} · newest first`
                : `${count} of ${total.toLocaleString()} · newest first`}
          </p>
        </div>
        <Link
          href={href}
          className="text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
        >
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {count === 0 ? empty : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {totalPages && totalPages > 1 && page && qs && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
              <p className="text-[11.5px] text-[var(--color-text-muted)] tabular-nums">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={`/admin/payments${qs({ page: String(page - 1) })}`}
                    className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/payments${qs({ page: String(page + 1) })}`}
                    className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn(
      "font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3",
      align === "right" && "text-right",
      align === "left" && "text-left",
    )}>{children}</th>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <CheckCircle2 className="h-8 w-8 text-[var(--color-text-muted)]/30 mx-auto mb-3" />
      <p className="text-[13px] text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

// ─── Transactions table ───────────────────────────────────────────────────────

function TransactionsTable({
  rows,
  count,
  page,
  totalPages,
  qs,
}: {
  rows: any[];
  count: number;
  page: number;
  totalPages: number;
  qs: (over?: Record<string, string>) => string;
}) {
  return (
    <TableShell
      title="Transactions"
      count={rows.length}
      total={count}
      href="/admin/transactions"
      empty={<EmptyState message="No transactions in this period" />}
      page={page}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      qs={qs}
    >
      <table className="w-full text-[12.5px]">
        <thead className="bg-[var(--color-surface-secondary)]/50">
          <tr><Th>When</Th>
            <Th>Provider</Th>
            <Th>Buyer</Th>
            <Th>Order</Th>
            <Th align="right">Amount</Th><Th>Status</Th>
            <Th>{""}</Th></tr>
        </thead>
        <tbody>
          {rows.map((tx: any) => {
            const buyer = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
            const order = Array.isArray(tx.orders) ? tx.orders[0] : tx.orders;
            return (
              <tr key={tx.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap">{relativeTime(tx.created_at)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <ProviderLogo provider={tx.provider} />
                    <span className="text-[var(--color-text-secondary)] capitalize hidden sm:inline">{tx.provider}</span>
                  </div>
                </td>
                <td className="px-3 py-3 min-w-0">
                  <p className="text-[var(--color-text-primary)] truncate max-w-[200px]">{buyer?.full_name ?? "—"}</p>
                  <p className="text-[10.5px] text-[var(--color-text-muted)] truncate max-w-[200px]">{buyer?.email ?? ""}</p>
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-[var(--color-text-muted)]">{order?.order_number ?? "—"}</td>
                <td className="px-3 py-3 text-right">
                  <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatAdminMoney(tx.amount, tx.currency)}
                  </p>
                  {tx.amount_usd && tx.currency !== "USD" && (
                    <p className="text-[10.5px] text-[var(--color-text-muted)] tabular-nums">≈ ${Number(tx.amount_usd).toFixed(2)}</p>
                  )}
                </td>
                <td className="px-3 py-3"><StatusPill status={tx.status} /></td>
                <td className="px-3 py-3 pr-5 text-right">
                  <Link href={`/admin/transactions/${tx.id}`} className="text-[var(--color-text-muted)] hover:text-orange-500 transition-colors inline-block">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

// ─── Orders table ─────────────────────────────────────────────────────────────

function OrdersTable({
  rows,
  count,
  page,
  totalPages,
  qs,
}: {
  rows: any[];
  count: number;
  page: number;
  totalPages: number;
  qs: (over?: Record<string, string>) => string;
}) {
  return (
    <TableShell
      title="Orders"
      count={rows.length}
      total={count}
      href="/admin/orders"
      empty={<EmptyState message="No orders in this period" />}
      page={page}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      qs={qs}
    >
      <table className="w-full text-[12.5px]">
        <thead className="bg-[var(--color-surface-secondary)]/50">
          <tr><Th>When</Th><Th>Order</Th><Th>Buyer</Th><Th>Vendor</Th><Th align="right">Total</Th><Th>Payment</Th><Th>Status</Th><Th>{" "}</Th></tr>
        </thead>
        <tbody>
          {rows.map((o: any) => {
            const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
            const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
            return (
              <tr key={o.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap">{relativeTime(o.created_at)}</td>
                <td className="px-3 py-3 font-mono text-[11px] text-[var(--color-text-primary)]">{o.order_number}</td>
                <td className="px-3 py-3 min-w-0">
                  <p className="text-[var(--color-text-primary)] truncate max-w-[200px]">{buyer?.full_name ?? "—"}</p>
                  <p className="text-[10.5px] text-[var(--color-text-muted)] truncate max-w-[200px]">{buyer?.email ?? ""}</p>
                </td>
                <td className="px-3 py-3 text-[var(--color-text-secondary)] truncate max-w-[150px]">{vendor?.business_name ?? "—"}</td>
                <td className="px-3 py-3 text-right">
                  <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatAdminMoney(o.total_amount, o.currency)}
                  </p>
                </td>
                <td className="px-3 py-3"><StatusPill status={o.payment_status} /></td>
                <td className="px-3 py-3"><StatusPill status={o.status} /></td>
                <td className="px-3 py-3 pr-5 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-[var(--color-text-muted)] hover:text-orange-500 transition-colors inline-block">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

// ─── Payouts table ────────────────────────────────────────────────────────────

function PayoutsTable({
  rows,
  count,
  page,
  totalPages,
  qs,
}: {
  rows: any[];
  count: number;
  page: number;
  totalPages: number;
  qs: (over?: Record<string, string>) => string;
}) {
  return (
    <TableShell
      title="Payouts"
      count={rows.length}
      total={count}
      href="/admin/payouts"
      empty={<EmptyState message="No payouts in this period" />}
      page={page}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      qs={qs}
    >
      <table className="w-full text-[12.5px]">
        <thead className="bg-[var(--color-surface-secondary)]/50">
          <tr><Th>When</Th><Th>Recipient</Th><Th>Type</Th><Th>Method</Th><Th align="right">Net</Th><Th align="right">Fee</Th><Th>Status</Th><Th>{" "}</Th></tr>
        </thead>
        <tbody>
          {rows.map((p: any) => {
            const recipient = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            return (
              <tr key={p.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap">{relativeTime(p.created_at)}</td>
                <td className="px-3 py-3 min-w-0">
                  <p className="text-[var(--color-text-primary)] truncate max-w-[200px]">{recipient?.full_name ?? "—"}</p>
                  <p className="text-[10.5px] text-[var(--color-text-muted)] truncate max-w-[200px]">{recipient?.email ?? ""}</p>
                </td>
                <td className="px-3 py-3 text-[var(--color-text-secondary)] capitalize">{p.type}</td>
                <td className="px-3 py-3 text-[var(--color-text-secondary)] capitalize">{p.payout_method ?? "—"}</td>
                <td className="px-3 py-3 text-right">
                  <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatAdminMoney(p.net_amount ?? p.amount, p.currency)}
                  </p>
                </td>
                <td className="px-3 py-3 text-right text-[var(--color-text-muted)] tabular-nums">
                  {p.fee > 0 ? formatAdminMoney(p.fee, p.currency) : "—"}
                </td>
                <td className="px-3 py-3"><StatusPill status={p.status} /></td>
                <td className="px-3 py-3 pr-5 text-right">
                  <Link href={`/admin/payouts/${p.id}`} className="text-[var(--color-text-muted)] hover:text-orange-500 transition-colors inline-block">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}