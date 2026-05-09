import React from "react";
import Link from "next/link";
import { getAdminVendors } from "@/services/db";
import {
  Search, Store, ArrowUpRight, ShieldCheck, Clock,
  ShieldOff, ShieldAlert, TrendingUp, DollarSign,
  Users, Star, Download,
} from "lucide-react";
import { VendorRow } from "@/components/admin/vendors/vendor-data";
import { SortSelect } from "@/components/admin/vendors/sort-select";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { q, status, sort } = await searchParams;
  const { vendors, total } = await getAdminVendors(q, 200);

  const statusFilter = status ?? "all";
  const sortKey = sort ?? "created_at";

  const filtered = (
    statusFilter === "all"
      ? vendors
      : vendors.filter((v: any) => v.verification_status === statusFilter)
  ).sort((a: any, b: any) => {
    switch (sortKey) {
      case "revenue": return b.total_revenue - a.total_revenue;
      case "sales": return b.total_sales - a.total_sales;
      case "rating": return b.rating - a.rating;
      case "followers": return b.follower_count - a.follower_count;
      case "products": return b.products_count - a.products_count;
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const counts = {
    all: vendors.length,
    pending: vendors.filter((v: any) => v.verification_status === "pending").length,
    verified: vendors.filter((v: any) => v.verification_status === "verified").length,
    rejected: vendors.filter((v: any) => v.verification_status === "rejected").length,
    suspended: vendors.filter((v: any) => v.verification_status === "suspended").length,
  };

  const totalRevenue = vendors.reduce((s: number, v: any) => s + Number(v.total_revenue ?? 0), 0);
  const totalSales = vendors.reduce((s: number, v: any) => s + Number(v.total_sales ?? 0), 0);
  const featuredCount = vendors.filter((v: any) => v.is_featured).length;
  const avgRating = vendors.length
    ? vendors.reduce((s: number, v: any) => s + Number(v.rating ?? 0), 0) / vendors.length
    : 0;

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em",
            margin: 0, color: "var(--color-text-primary)",
          }}>
            Vendors
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "3px 0 0" }}>
            {total} store{total !== 1 ? "s" : ""} registered
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Export stub — wire up your own CSV export */}
          <button
            style={{
              height: 34, padding: "0 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: "0.5px solid var(--color-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text-secondary)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <Download size={12} /> Export
          </button>

          <Link
            href="/admin/verifications?tab=vendors"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 34, padding: "0 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: "var(--color-accent)", color: "#fff",
              textDecoration: "none", letterSpacing: "-0.01em",
            }}
          >
            Review queue
            {counts.pending > 0 && (
              <span style={{
                background: "rgba(255,255,255,0.25)", borderRadius: 4,
                padding: "0 5px", fontSize: 11, fontWeight: 700,
              }}>
                {counts.pending}
              </span>
            )}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Overview metric cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <MetricCard icon={<Store size={14} />} label="Total vendors" value={fmt(counts.all)} sub={`${counts.verified} verified`} color="default" />
        <MetricCard icon={<DollarSign size={14} />} label="Total revenue" value={`${fmt(totalRevenue)} RWF`} sub="across all vendors" color="success" />
        <MetricCard icon={<TrendingUp size={14} />} label="Total sales" value={fmt(totalSales)} sub="completed orders" color="info" />
        <MetricCard icon={<Star size={14} />} label="Avg rating" value={avgRating.toFixed(2)} sub={`${featuredCount} featured`} color="warning" />
        <MetricCard icon={<Clock size={14} />} label="Pending review" value={String(counts.pending)} sub="awaiting verification" color="pending" />
      </div>

      {/* ── Search + status filter + sort ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <form method="get" action="/admin/vendors" style={{ display: "flex", gap: 8, flex: 1, minWidth: 240, maxWidth: 440 }}>
            {status && <input type="hidden" name="status" value={status} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={13}
                style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-muted)", pointerEvents: "none",
                }}
              />
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search by name or email…"
                style={{
                  width: "100%", height: 34, paddingLeft: 30, paddingRight: 12, fontSize: 13,
                  borderRadius: 7, border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface)", color: "var(--color-text-primary)",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                height: 34, padding: "0 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text-secondary)", cursor: "pointer",
              }}
            >
              Search
            </button>
            {q && (
              <Link
                href={`/admin/vendors${status ? `?status=${status}` : ""}`}
                style={{
                  height: 34, padding: "0 12px", borderRadius: 7, fontSize: 12,
                  border: "0.5px solid var(--color-border)", background: "transparent",
                  color: "var(--color-text-muted)", textDecoration: "none",
                  display: "inline-flex", alignItems: "center",
                }}
              >
                Clear
              </Link>
            )}
          </form>

          {/* Sort selector — client component (onChange needs interactivity) */}
          <SortSelect current={sortKey} q={q} status={status} />
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(["all", "verified", "pending", "rejected", "suspended"] as const).map((s) => {
            const active = statusFilter === s;
            const label = s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1);
            return (
              <Link
                key={s}
                href={`/admin/vendors?status=${s}${q ? `&q=${q}` : ""}${sort ? `&sort=${sort}` : ""}`}
                style={{
                  height: 28, padding: "0 11px", borderRadius: 5, fontSize: 12, fontWeight: 500,
                  display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                  border: `0.5px solid ${active ? "var(--color-text-primary)" : "var(--color-border)"}`,
                  background: active ? "var(--color-text-primary)" : "transparent",
                  color: active ? "var(--color-bg)" : "var(--color-text-secondary)",
                }}
              >
                {label}
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: "center",
                  padding: "0 4px", borderRadius: 3,
                  background: active ? "rgba(255,255,255,0.15)" : "var(--color-surface-secondary)",
                  color: active ? "inherit" : "var(--color-text-muted)",
                }}>
                  {counts[s]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Results label ── */}
      {(q || statusFilter !== "all") && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
          Showing <strong style={{ color: "var(--color-text-primary)" }}>{filtered.length}</strong> result{filtered.length !== 1 ? "s" : ""}
          {q && <> for <strong style={{ color: "var(--color-text-primary)" }}>"{q}"</strong></>}
        </p>
      )}

      {/* ── Table ── */}
      <div style={{
        border: "0.5px solid var(--color-border)", borderRadius: 10, overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2.4fr 1.3fr 80px 90px 90px 90px 100px 104px",
          gap: 8, padding: "8px 16px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
          color: "var(--color-text-muted)",
          background: "var(--color-surface-secondary)",
          borderBottom: "0.5px solid var(--color-border)",
        }}>
          <span>Store</span>
          <span>Owner</span>
          <span>Products</span>
          <span>Revenue</span>
          <span>Sales</span>
          <span>Rating</span>
          <span>Status</span>
          <span>Joined</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: "44px 24px", textAlign: "center",
            color: "var(--color-text-muted)", fontSize: 13,
          }}>
            {q ? `No vendors matching "${q}"` : "No vendors in this category."}
          </div>
        ) : (
          filtered.map((v: any, i: number) => (
            <VendorRow key={v.id} v={v} last={i === filtered.length - 1} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
          Showing {filtered.length} of {total} vendor{total !== 1 ? "s" : ""}.{" "}
          Approve or reject from the{" "}
          <Link
            href="/admin/verifications?tab=vendors"
            style={{ color: "var(--color-accent)", textDecoration: "none" }}
          >
            verification queue
          </Link>.
        </p>
      )}
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "default" | "success" | "info" | "warning" | "pending";
}) {
  const palette = {
    default: { bg: "var(--color-surface-secondary)", fg: "var(--color-text-primary)", border: "var(--color-border)", icon: "var(--color-text-muted)" },
    success: { bg: "rgba(48,164,108,0.06)", fg: "#30a46c", border: "rgba(48,164,108,0.15)", icon: "#30a46c" },
    info: { bg: "rgba(14,165,233,0.06)", fg: "#0ea5e9", border: "rgba(14,165,233,0.15)", icon: "#0ea5e9" },
    warning: { bg: "rgba(240,180,41,0.06)", fg: "#b45309", border: "rgba(240,180,41,0.2)", icon: "#f0b429" },
    pending: { bg: "rgba(253,80,0,0.05)", fg: "var(--color-accent)", border: "rgba(253,80,0,0.15)", icon: "var(--color-accent)" },
  }[color];

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 9,
      background: palette.bg, border: `0.5px solid ${palette.border}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</span>
        <span style={{ color: palette.icon, display: "flex" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: palette.fg, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{sub}</div>
    </div>
  );
}