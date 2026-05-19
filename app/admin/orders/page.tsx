import React from "react";
import Link from "next/link";
import { getAdminDB } from "@/services/db";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ShoppingBag, Search, TrendingUp, Package, Truck,
  CircleDot, AlertTriangle, Download, Filter as FilterIcon,
} from "lucide-react";
import {
  StatusPill, ProviderLogo, relativeTime,
  FilterChip, PageHeader, EmptyState, RowArrow,
} from "@/components/ui/admin";

export const dynamic = "force-dynamic";

// ─── LOCAL range config (no external import) ──────────────────────────────────

const RANGES = {
  today: { label: "Today", start: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d as Date | null; } },
  "7d": { label: "7 days", start: () => new Date(Date.now() - 7 * 86400_000) as Date | null },
  "30d": { label: "30 days", start: () => new Date(Date.now() - 30 * 86400_000) as Date | null },
  mtd: { label: "This month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) as Date | null; } },
  qtd: { label: "This quarter", start: () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1) as Date | null; } },
  ytd: { label: "Year", start: () => new Date(new Date().getFullYear(), 0, 1) as Date | null },
  all: { label: "All time", start: () => null },
} as const;

type RangeKey = keyof typeof RANGES;

function resolveRange(input: string | undefined): RangeKey {
  if (input && Object.prototype.hasOwnProperty.call(RANGES, input)) {
    return input as RangeKey;
  }
  return "mtd";
}

// ─── LOCAL range picker (no external import) ──────────────────────────────────

function LocalRangePicker({ current }: { current: RangeKey }) {
  const items: RangeKey[] = ["today", "7d", "30d", "mtd", "qtd", "ytd"];
  return (
    <div className="inline-flex items-center rounded-lg ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {items.map((k) => (
        <Link
          key={k}
          href={`/admin/orders?range=${k}`}
          scroll={false}
          className={cn(
            "h-8 px-3 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap",
            current === k
              ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
          )}
        >
          {RANGES[k].label}
        </Link>
      ))}
    </div>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type PaymentStatusFilter =
  | "all" | "pending" | "processing" | "paid" | "failed" | "refunded";

type FulfillmentFilter =
  | "all" | "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

type SourceFilter = "all" | "vendor" | "shopify" | "cj" | "community";

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({
  label, value, sublabel, icon: Icon, tone = "default",
}: {
  label: string; value: string; sublabel?: string;
  icon: React.ElementType; tone?: "default" | "warn" | "danger" | "success";
}) {
  const ring = {
    default: "ring-[var(--color-border)]",
    warn: "ring-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10",
    danger: "ring-rose-500/30 bg-rose-50/40 dark:bg-rose-950/10",
    success: "ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10",
  }[tone];
  const iconTone = {
    default: "text-[var(--color-text-muted)]",
    warn: "text-amber-600", danger: "text-rose-600", success: "text-emerald-600",
  }[tone];
  return (
    <div className={cn("p-4 rounded-2xl bg-[var(--color-surface)] ring-1 transition-all", ring)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <Icon className={cn("h-3.5 w-3.5", iconTone)} />
      </div>
      <p className="text-xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight mt-1.5">
        {value}
      </p>
      {sublabel && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    payment?: PaymentStatusFilter;
    status?: FulfillmentFilter;
    source?: SourceFilter;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const range: RangeKey = resolveRange(params.range);
  const config = RANGES[range];

  // Defensive: cannot happen given resolveRange, but TS+runtime safe
  if (!config) {
    throw new Error(`Unexpected: range "${range}" has no config`);
  }

  const payment: PaymentStatusFilter = params.payment ?? "all";
  const status: FulfillmentFilter = params.status ?? "all";
  const source: SourceFilter = params.source ?? "all";
  const search = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 30;

  const admin = getAdminDB();
  const rangeStart = config.start();

  // ── Build query ────────────────────────────────────────────────────────
  let query = admin
    .from("orders")
    .select(
      `id, order_number, total_amount, subtotal, shipping_amount,
       currency, status, payment_status, integration_source,
       created_at, paid_at, buyer_id,
       profiles!orders_buyer_id_fkey(full_name, email),
       vendors(business_name, business_slug)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (rangeStart) query = query.gte("created_at", rangeStart.toISOString());
  if (payment !== "all") query = query.eq("payment_status", payment);
  if (status !== "all") query = query.eq("status", status);
  if (source !== "all") query = query.eq("integration_source", source);
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,id.eq.${search}`);
  }

  // ── KPIs ───────────────────────────────────────────────────────────────
  const startIso = rangeStart?.toISOString();
  let kpiQuery = admin.from("orders").select("total_amount, currency, payment_status, status");
  if (startIso) kpiQuery = kpiQuery.gte("created_at", startIso);

  const [{ data: orders, count }, { data: kpiOrders }] = await Promise.all([
    query,
    kpiQuery,
  ]);

  const list = (orders ?? []) as any[];
  const kpi = (kpiOrders ?? []) as any[];

  const paidCount = kpi.filter((o) => o.payment_status === "paid").length;
  const totalRevenue = kpi
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  const pendingPayment = kpi.filter((o) => o.payment_status === "pending").length;
  const awaitingShipment = kpi.filter(
    (o) => o.payment_status === "paid" && (o.status === "confirmed" || o.status === "processing")
  ).length;
  const inTransit = kpi.filter((o) => o.status === "shipped").length;
  const cancelled = kpi.filter((o) => o.status === "cancelled").length;
  const aov = paidCount > 0 ? totalRevenue / paidCount : 0;

  // ── Query-string helper ────────────────────────────────────────────────
  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    if (range !== "mtd") u.set("range", range);
    if (payment !== "all") u.set("payment", payment);
    if (status !== "all") u.set("status", status);
    if (source !== "all") u.set("source", source);
    if (search) u.set("q", search);
    Object.entries(over).forEach(([k, v]) => {
      if (v === "all" || v === "" || v === "mtd") u.delete(k);
      else u.set(k, v);
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Commerce"
        title="Orders"
        subtitle={
          count !== null
            ? `${config.label} · ${count?.toLocaleString() ?? 0} orders`
            : config.label
        }
        actions={
          <>
            <LocalRangePicker current={range} />
            <Link
              href={`/api/admin/orders/export${qs({})}`}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Link>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile label="Revenue" value={formatCurrency(totalRevenue)} sublabel="Paid orders" icon={TrendingUp} tone="success" />
        <Tile label="Avg order" value={formatCurrency(aov)} sublabel="Per paid order" icon={ShoppingBag} />
        <Tile label="Awaiting payment" value={pendingPayment.toLocaleString()} sublabel="Pending" icon={CircleDot} tone={pendingPayment > 10 ? "warn" : "default"} />
        <Tile label="To fulfill" value={awaitingShipment.toLocaleString()} sublabel="Paid · not shipped" icon={Package} tone={awaitingShipment > 0 ? "warn" : "default"} />
        <Tile label="In transit" value={inTransit.toLocaleString()} sublabel="Shipped" icon={Truck} />
        <Tile label="Cancelled" value={cancelled.toLocaleString()} sublabel="In period" icon={AlertTriangle} tone={cancelled > 5 ? "danger" : "default"} />
      </div>

      {/* Filter row */}
      <div className="space-y-3">
        <form action="/admin/orders" className="flex items-center gap-2">
          <input type="hidden" name="range" value={range} />
          <input type="hidden" name="payment" value={payment} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="source" value={source} />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Order number or ID…"
              className="w-full h-9 pl-9 pr-3 rounded-lg ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/70 outline-none focus:ring-orange-500/40"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg text-[12.5px] font-medium bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 mr-2">
            <FilterIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Payment</span>
          </div>
          {["all", "pending", "paid", "failed", "refunded"].map((s) => (
            <FilterChip
              key={s}
              label={s === "all" ? "All" : s}
              href={`/admin/orders${qs({ payment: s, page: "1" })}`}
              active={payment === s}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 mr-2">
            <FilterIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Fulfillment</span>
          </div>
          {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <FilterChip
              key={s}
              label={s === "all" ? "All" : s}
              href={`/admin/orders${qs({ status: s, page: "1" })}`}
              active={status === s}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 mr-2">
            <FilterIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Source</span>
          </div>
          {["all", "vendor", "shopify", "cj", "community"].map((s) => (
            <FilterChip
              key={s}
              label={s === "all" ? "All" : s}
              href={`/admin/orders${qs({ source: s, page: "1" })}`}
              active={source === s}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders match"
            message="Try widening the date range or clearing filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[var(--color-surface-secondary)]/50">
                  <tr>
                    <Th>Order</Th>
                    <Th>Buyer</Th>
                    <Th>Vendor</Th>
                    <Th>Source</Th>
                    <Th align="right">Total</Th>
                    <Th>Payment</Th>
                    <Th>Fulfillment</Th>
                    <Th>When</Th>
                    <Th>{""}</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o: any) => {
                    const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
                    const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
                    return (
                      <tr key={o.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                        <td className="px-3 py-3 pl-5">
                          <Link href={`/admin/orders/${o.id}`} className="font-mono text-[11px] text-[var(--color-text-primary)] hover:text-orange-500 transition-colors">
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="px-3 py-3 min-w-0">
                          <p className="text-[var(--color-text-primary)] truncate max-w-[180px]">{buyer?.full_name ?? "—"}</p>
                          <p className="text-[10.5px] text-[var(--color-text-muted)] truncate max-w-[180px]">{buyer?.email ?? ""}</p>
                        </td>
                        <td className="px-3 py-3 text-[var(--color-text-secondary)] truncate max-w-[150px]">
                          {vendor?.business_name ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] text-[var(--color-text-muted)] capitalize">
                            {o.integration_source ?? "vendor"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                            {Number(o.total_amount).toLocaleString()} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">{o.currency}</span>
                          </p>
                          {o.shipping_amount > 0 && (
                            <p className="text-[10.5px] text-[var(--color-text-muted)] tabular-nums">
                              + {Number(o.shipping_amount).toLocaleString()} ship
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3"><StatusPill status={o.payment_status} /></td>
                        <td className="px-3 py-3"><StatusPill status={o.status} /></td>
                        <td className="px-3 py-3 text-[var(--color-text-muted)] whitespace-nowrap" title={o.created_at}>
                          {relativeTime(o.created_at)}
                        </td>
                        <td className="px-3 py-3 pr-5 text-right">
                          <RowArrow href={`/admin/orders/${o.id}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
                <p className="text-[11.5px] text-[var(--color-text-muted)] tabular-nums">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 && (
                    <Link
                      href={`/admin/orders${qs({ page: String(page - 1) })}`}
                      className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/orders${qs({ page: String(page + 1) })}`}
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
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn(
      "font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3",
      align === "right" ? "text-right" : "text-left",
    )}>{children}</th>
  );
}