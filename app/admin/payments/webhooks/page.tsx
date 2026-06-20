import React from "react";
import Link from "next/link";
import { getAdminDB } from "@/services/db";
import { cn, relativeTime } from "@/lib/utils";
import {
  Webhook, CheckCircle2, XCircle, Filter, RotateCcw,
} from "lucide-react";
import {
  StatusPill, ProviderLogo,
  PageHeader, EmptyState, FilterSegmentBar,
} from "@/components/ui/admin";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "received" | "processing" | "completed" | "failed";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  received: "Received",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const PROVIDER_LABELS: Record<string, string> = {
  all: "All",
  flutterwave: "Flutterwave",
  pesapal: "PesaPal",
  paypal: "PayPal",
  nowpayments: "NOWPayments",
  pawapay: "PawaPay",
};

export default async function WebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
    provider?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const provider = params.provider ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 50;

  const admin = getAdminDB();

  let query = admin
    .from("webhook_events")
    .select(
      "id, provider, idempotency_key, status, error, order_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status !== "all") query = query.eq("status", status);
  if (provider !== "all") query = query.eq("provider", provider);

  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ data: events, count }, { data: statsData }, { data: statusRows }] = await Promise.all([
    query,
    admin.from("webhook_events").select("status, provider").gte("created_at", dayAgo),
    admin.from("webhook_events").select("status"),
  ]);

  const list = (events ?? []) as any[];
  const stats = (statsData ?? []) as any[];
  const allStatuses = (statusRows ?? []) as Array<{ status: string }>;

  const statusCounts: Record<StatusFilter, number> = {
    all: allStatuses.length,
    received: allStatuses.filter((e) => e.status === "received").length,
    processing: allStatuses.filter((e) => e.status === "processing").length,
    completed: allStatuses.filter((e) => e.status === "completed").length,
    failed: allStatuses.filter((e) => e.status === "failed").length,
  };

  const total24h = stats.length;
  const success24h = stats.filter((e) => e.status === "completed").length;
  const failed24h = stats.filter((e) => e.status === "failed").length;
  const successRate = total24h > 0 ? (success24h / total24h) * 100 : 0;

  const providers = ["all", "flutterwave", "pesapal", "paypal", "nowpayments", "pawapay"];
  const statuses: StatusFilter[] = ["all", "received", "processing", "completed", "failed"];

  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    if (status !== "all") u.set("status", status);
    if (provider !== "all") u.set("provider", provider);
    if (page > 1) u.set("page", String(page));
    Object.entries(over).forEach(([k, v]) => {
      if (v === "all" || v === "" || (k === "page" && v === "1")) u.delete(k);
      else u.set(k, v);
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  const totalPages = count ? Math.ceil(count / pageSize) : 0;
  const hasActiveFilters = status !== "all" || provider !== "all";
  const showingFrom = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, count ?? 0);

  const statusSegments = statuses.map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
    href: `/admin/payments/webhooks${qs({ status: s, page: "1" })}`,
    count: statusCounts[s],
  }));

  const providerSegments = providers.map((p) => ({
    value: p,
    label: PROVIDER_LABELS[p] ?? p,
    href: `/admin/payments/webhooks${qs({ provider: p, page: "1" })}`,
    icon: p !== "all" ? <ProviderLogo provider={p} size="sm" /> : undefined,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        ← Back to payments
      </Link>

      <PageHeader
        eyebrow="Admin · Payments"
        title="Webhook events"
        subtitle={`${count?.toLocaleString() ?? 0} events match your filters · ${successRate.toFixed(0)}% success rate (24h)`}
        border={false}
      />

      {/* Stats + success rate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="24h events" value={total24h.toLocaleString()} icon={Webhook} />
        <StatTile
          label="Successful"
          value={success24h.toLocaleString()}
          icon={CheckCircle2}
          tone="success"
          sublabel={`${successRate.toFixed(0)}% of last 24h`}
          progress={successRate}
        />
        <StatTile
          label="Failed"
          value={failed24h.toLocaleString()}
          icon={XCircle}
          tone={failed24h > 0 ? "danger" : "default"}
          sublabel={failed24h > 0 ? "Needs review" : "No failures in 24h"}
        />
      </div>

      {/* Filters — connected square segments */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Filter events</p>
          </div>
          {hasActiveFilters && (
            <Link
              href="/admin/payments/webhooks"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </Link>
          )}
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
          <div className="space-y-2.5 min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Status
            </p>
            <FilterSegmentBar
              items={statusSegments}
              activeValue={status}
              aria-label="Filter by status"
              className="w-full sm:w-auto"
            />
          </div>

          <div className="space-y-2.5 min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Provider
            </p>
            <FilterSegmentBar
              items={providerSegments}
              activeValue={provider}
              aria-label="Filter by provider"
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-4 py-2.5 sm:px-5">
            <span className="text-[11px] text-[var(--color-text-muted)]">Showing:</span>
            {status !== "all" && <StatusPill status={status} size="md" />}
            {provider !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--color-surface)] px-2 py-1 ring-1 ring-[var(--color-border)]">
                <ProviderLogo provider={provider} size="sm" />
                <span className="text-[11px] font-medium capitalize text-[var(--color-text-primary)]">
                  {PROVIDER_LABELS[provider] ?? provider}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Event log</h2>
            <p className="text-[11.5px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
              {count === 0
                ? "No results"
                : totalPages > 1
                  ? `${showingFrom.toLocaleString()}–${showingTo.toLocaleString()} of ${count.toLocaleString()}`
                  : `${count.toLocaleString()} event${count === 1 ? "" : "s"}`}
              {" · "}newest first
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<Webhook className="w-6 h-6 text-[var(--color-text-muted)]" />}
            title="No webhook events"
            message={
              hasActiveFilters
                ? "Nothing matches these filters. Try clearing them or pick a different status."
                : "Events will appear here as providers call back."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[var(--color-surface-secondary)]/50">
                  <tr>
                    <Th>When</Th>
                    <Th>Provider</Th>
                    <Th>Idempotency key</Th>
                    <Th>Status</Th>
                    <Th>Order</Th>
                    <Th>Error</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e: any) => (
                    <tr
                      key={e.id}
                      className={cn(
                        "border-t border-[var(--color-border)]/60 transition-colors",
                        e.status === "failed"
                          ? "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                          : "hover:bg-[var(--color-surface-secondary)]/40",
                      )}
                    >
                      <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap" title={e.created_at}>
                        {relativeTime(e.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProviderLogo provider={e.provider} size="sm" />
                          <span className="text-[var(--color-text-secondary)] capitalize hidden sm:inline">
                            {PROVIDER_LABELS[e.provider] ?? e.provider}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-3 py-3 font-mono text-[11px] text-[var(--color-text-muted)] truncate max-w-[280px]"
                        title={e.idempotency_key}
                      >
                        {e.idempotency_key ?? e.id.slice(0, 18)}
                      </td>
                      <td className="px-3 py-3"><StatusPill status={e.status} /></td>
                      <td className="px-3 py-3">
                        {e.order_id ? (
                          <Link
                            href={`/admin/orders/${e.order_id}`}
                            className="font-mono text-[11px] text-orange-500 hover:underline"
                          >
                            {e.order_id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 pr-5 text-[11px] text-rose-600 truncate max-w-[220px]" title={e.error ?? ""}>
                        {e.error ?? "—"}
                      </td>
                    </tr>
                  ))}
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
                      href={`/admin/payments/webhooks${qs({ page: String(page - 1) })}`}
                      className="h-8 px-3 rounded-sm text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/payments/webhooks${qs({ page: String(page + 1) })}`}
                      className="h-8 px-3 rounded-sm text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
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

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  sublabel,
  progress,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "danger";
  sublabel?: string;
  progress?: number;
}) {
  const iconTone = {
    default: "text-[var(--color-text-muted)]",
    success: "text-emerald-600",
    danger: "text-rose-600",
  }[tone];

  return (
    <div className="p-4 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{label}</p>
        <Icon className={cn("h-3.5 w-3.5", iconTone)} />
      </div>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)] mt-1.5">{value}</p>
      {sublabel && (
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1 rounded-sm bg-[var(--color-surface-secondary)] overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3 text-left">
      {children}
    </th>
  );
}
