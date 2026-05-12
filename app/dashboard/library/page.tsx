"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Download, Search, ExternalLink, FileText, Zap, Loader2,
  BookOpen, Package, LayoutTemplate, Music, ImageIcon, Archive,
  Copy, BarChart2, CheckCircle2, Clock, AlertTriangle, Sparkles,
  Library, Grid3X3, RefreshCw, ChevronsUpDown, ChevronUp, ChevronDown,
  Table2, XCircle, CheckSquare, Square, Camera, Star, ShoppingBag,
  HardDrive, Store, Tag, RotateCcw, TrendingUp, Bell, Columns,
  LayoutGrid, AlignJustify,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigitalAccessRow {
  id: string;
  access_url: string | null;
  subtype: string | null;
  granted_at: string;
  expires_at: string | null;
  last_accessed_at?: string | null;
  order_id?: string | null;
  order_item_id?: string | null;
  revoke_reason?: string | null;
  products: {
    id: string;
    name: string;
    images: string[] | null;
    button_text: string | null;
    pricing_type: string | null;
    billing_period: string | null;
    digital_file_size?: number | null;
    tags?: string[] | null;
    description?: string | null;
    vendor_id?: string | null;
  } | null;
  order_items?: {
    unit_price?: number | null;
    total_price?: number | null;
    download_count?: number | null;
    variant_name?: string | null;
    variant_id?: string | null;
  } | null;
  vendors?: {
    business_name?: string | null;
    business_logo?: string | null;
  } | null;
  lesson_progress?: {
    completed_lessons: number;
    total_lessons: number;
    percent: number;
  } | null;
  user_review?: {
    rating: number;
    id: string;
  } | null;
}

type Density = "compact" | "comfortable";
type FilterId = typeof FILTER_TABS[number]["id"];
type SortKey = "name" | "subtype" | "granted_at" | "expires_at" | "status" | "last_accessed_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 24;

// ─── Subtype config ───────────────────────────────────────────────────────────

function getSubtypeConfig(subtype: string | null, url: string | null) {
  switch (subtype) {
    case "course":
      return { label: "Course", icon: BookOpen, gradient: "from-sky-500 to-blue-600", accent: "#0ea5e9", action: "continue" as const, actionLabel: "Continue learning", ActionIcon: BookOpen };
    case "software":
      return { label: "Software", icon: Zap, gradient: "from-violet-500 to-purple-600", accent: "#8b5cf6", action: "open" as const, actionLabel: "Launch app", ActionIcon: ExternalLink };
    case "ai-tools":
      return { label: "AI Tool", icon: Sparkles, gradient: "from-fuchsia-500 to-pink-600", accent: "#d946ef", action: "open" as const, actionLabel: "Open tool", ActionIcon: ExternalLink };
    case "templates":
      return { label: "Template", icon: LayoutTemplate, gradient: "from-amber-400 to-orange-500", accent: "#f59e0b", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
    case "ebooks":
      return { label: "Ebook", icon: FileText, gradient: "from-emerald-500 to-teal-600", accent: "#10b981", action: "download" as const, actionLabel: "Read now", ActionIcon: Download };
    case "music-audio":
      return { label: "Audio", icon: Music, gradient: "from-pink-500 to-rose-600", accent: "#ec4899", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
    case "graphics-design":
      return { label: "Graphics", icon: ImageIcon, gradient: "from-orange-400 to-red-500", accent: "#f97316", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
    case "photography":
      return { label: "Photography", icon: Camera, gradient: "from-rose-400 to-pink-600", accent: "#fb7185", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
    default: {
      const ext = url?.split(".").pop()?.toLowerCase();
      if (ext === "pdf") return { label: "PDF", icon: FileText, gradient: "from-red-500 to-rose-600", accent: "#ef4444", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
      if (["zip", "rar"].includes(ext ?? "")) return { label: "Archive", icon: Archive, gradient: "from-slate-400 to-gray-600", accent: "#6b7280", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
      return { label: "Digital asset", icon: Package, gradient: "from-slate-400 to-gray-500", accent: "#6b7280", action: "open" as const, actionLabel: "Access", ActionIcon: ExternalLink };
    }
  }
}

const FILTER_TABS = [
  { id: "all", label: "All assets", icon: Grid3X3 },
  { id: "software", label: "Software", icon: Zap },
  { id: "ai-tools", label: "AI Tools", icon: Sparkles },
  { id: "course", label: "Courses", icon: BookOpen },
  { id: "ebooks", label: "Ebooks", icon: FileText },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "music-audio", label: "Audio", icon: Music },
  { id: "graphics-design", label: "Graphics", icon: ImageIcon },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "other", label: "Other", icon: Package },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpiredFn(row: DigitalAccessRow) {
  return row.expires_at ? new Date(row.expires_at) < new Date() : false;
}

function daysUntilExpiryFn(row: DigitalAccessRow) {
  if (!row.expires_at) return null;
  return Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatCurrency(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Revoke reason label ──────────────────────────────────────────────────────

function getRevokeReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  switch (reason) {
    case "refunded": return "Refunded";
    case "subscription_expired": return "Subscription expired";
    case "manual": return "Manually revoked";
    default: return reason;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton({ density }: { density: Density }) {
  const compact = density === "compact";
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className={cn("animate-pulse", compact ? "aspect-[4/3]" : "aspect-video")} style={{ backgroundColor: "var(--color-surface-secondary)" }} />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
        <div className="h-3 w-1/2 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
        <div className="h-9 w-full rounded-xl animate-pulse mt-4" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <td className="pl-4 py-3 w-12"><div className="h-10 w-10 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4"><div className="h-4 w-40 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4 hidden sm:table-cell"><div className="h-6 w-20 rounded-full" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4 hidden md:table-cell"><div className="h-3.5 w-24 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4 hidden lg:table-cell"><div className="h-3.5 w-20 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4"><div className="h-6 w-16 rounded-full" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
      <td className="py-3 pr-4"><div className="flex gap-1.5 justify-end"><div className="h-8 w-20 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /><div className="h-8 w-8 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></div></td>
    </tr>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: "var(--color-danger)", backgroundColor: "rgba(229,72,77,0.06)" }}>
      <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "var(--color-danger)" }} />
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--color-danger)" }}>Failed to load your library</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Check your connection and try again.</p>
      </div>
      <button onClick={onRetry} className="h-8 px-4 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-85" style={{ backgroundColor: "var(--color-danger)" }}>
        Retry
      </button>
    </div>
  );
}

// ─── Expiry notification banner ───────────────────────────────────────────────

function ExpiryBanner({ items }: { items: DigitalAccessRow[] }) {
  const [dismissed, setDismissed] = useState(false);
  const expiring = items.filter(r => {
    const d = daysUntilExpiryFn(r);
    return d !== null && d > 0 && d <= 7;
  });
  if (expiring.length === 0 || dismissed) return null;

  return (
    <div
      className="rounded-2xl border p-4 flex items-start gap-3"
      style={{ borderColor: "rgba(240,180,41,0.4)", backgroundColor: "rgba(240,180,41,0.08)" }}
    >
      <Bell className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: "var(--color-warning)" }}>
          {expiring.length} item{expiring.length !== 1 ? "s" : ""} expiring within 7 days
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {expiring.map(r => {
            const d = daysUntilExpiryFn(r);
            const isSubscription = r.products?.pricing_type === "subscription" || !!r.products?.billing_period;
            return (
              <div
                key={r.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px]"
                style={{ borderColor: "rgba(240,180,41,0.3)", backgroundColor: "rgba(240,180,41,0.1)" }}
              >
                <span className="font-semibold truncate max-w-[160px]" style={{ color: "var(--color-text-primary)" }}>
                  {r.products?.name ?? "Unknown"}
                </span>
                <span style={{ color: "var(--color-warning)" }}>{d}d left</span>
                {isSubscription && (
                  <button
                    className="flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-white transition-opacity hover:opacity-85"
                    style={{ backgroundColor: "var(--color-warning)", fontSize: "10px" }}
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> Renew
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-60" style={{ color: "var(--color-text-muted)" }}>
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Recently used shelf ──────────────────────────────────────────────────────

function RecentlyUsedShelf({ items, onAccessRecorded }: { items: DigitalAccessRow[]; onAccessRecorded: (id: string) => void }) {
  const recent = useMemo(() =>
    [...items]
      .filter(r => r.last_accessed_at && !isExpiredFn(r))
      .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime())
      .slice(0, 5),
    [items]
  );

  if (recent.length < 2) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Continue where you left off</p>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {recent.map(row => {
          const config = getSubtypeConfig(row.subtype, row.access_url);
          const SubtypeIcon = config.icon;
          const ActionIcon = config.ActionIcon;
          const image = row.products?.images?.[0] ?? null;
          const name = row.products?.name ?? "Unknown";
          const vendorLogo = row.vendors?.business_logo ?? null;

          function handleAction() {
            if (!row.access_url) return;
            onAccessRecorded(row.id);
            if (config.action === "download") {
              const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
            } else {
              window.open(row.access_url, "_blank");
            }
          }

          const thumbnail = image ?? vendorLogo;

          return (
            <div
              key={row.id}
              className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl border cursor-pointer group transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
                minWidth: 220,
                maxWidth: 260,
              }}
            >
              <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
                {thumbnail ? (
                  <img src={thumbnail} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", config.gradient)} style={{ opacity: 0.2 }}>
                    <SubtypeIcon className="h-5 w-5" style={{ color: config.accent, opacity: 1 }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{name}</p>
                {/* Course progress bar */}
                {row.lesson_progress && row.lesson_progress.total_lessons > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.accent }} />
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{row.lesson_progress.percent}% complete</p>
                  </div>
                ) : (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {row.last_accessed_at ? `Used ${new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </p>
                )}
              </div>
              {config.action === "continue" ? (
                <Link
                  href={`/dashboard/my-courses/${row.products?.id}`}
                  onClick={() => onAccessRecorded(row.id)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-85"
                  style={{ background: `linear-gradient(135deg, ${config.accent}, ${config.accent}bb)` }}
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  onClick={handleAction}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-85"
                  style={{ background: `linear-gradient(135deg, ${config.accent}, ${config.accent}bb)` }}
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grid sort bar ────────────────────────────────────────────────────────────

function GridSortBar({ sortKey, sortDir, onSort }: { sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const options: { key: SortKey; label: string }[] = [
    { key: "granted_at", label: "Date claimed" },
    { key: "name", label: "Name" },
    { key: "subtype", label: "Type" },
    { key: "expires_at", label: "Expiry" },
    { key: "last_accessed_at", label: "Last used" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "var(--color-text-muted)" }}>Sort</span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
        {options.map(o => {
          const active = sortKey === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onSort(o.key)}
              className="h-7 px-3 rounded-full text-[11px] font-semibold border whitespace-nowrap flex items-center gap-1 transition-all"
              style={{
                backgroundColor: active ? "var(--color-text-primary)" : "var(--color-surface)",
                color: active ? "var(--color-bg)" : "var(--color-text-muted)",
                borderColor: active ? "var(--color-text-primary)" : "var(--color-border)",
              }}
            >
              {o.label}
              {active && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkBar({ selected, total, onSelectAll, onClear, onBulkCopy, onBulkDownload }: {
  selected: Set<string>; total: number; onSelectAll: () => void; onClear: () => void; onBulkCopy: () => void; onBulkDownload: () => void;
}) {
  const count = selected.size;
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-xl)" }}>
      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{count} selected</span>
      <div className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />
      <button onClick={onSelectAll} className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--color-accent)" }}>Select all {total}</button>
      <button onClick={onBulkCopy} className="h-8 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-secondary)" }}>
        <Copy className="h-3.5 w-3.5" /> Copy links
      </button>
      <button onClick={onBulkDownload} className="h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-85 gradient-brand">
        <Download className="h-3.5 w-3.5" /> Download all
      </button>
      <button onClick={onClear} className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-60" style={{ color: "var(--color-text-muted)" }}>
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ productId, existingReview, onReviewLeft }: {
  productId: string;
  existingReview: { rating: number; id: string } | null | undefined;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (submitted || existingReview) {
    const rating = existingReview?.rating ?? (submitted ? hovered : 0);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className="h-3 w-3" fill={s <= rating ? "var(--color-warning)" : "none"} style={{ color: s <= rating ? "var(--color-warning)" : "var(--color-border)" }} />
        ))}
        <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>Your rating</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => { setSubmitted(true); onReviewLeft(productId, s); }}
          className="transition-transform hover:scale-110"
        >
          <Star className="h-3 w-3" fill={s <= hovered ? "var(--color-warning)" : "none"} style={{ color: s <= hovered ? "var(--color-warning)" : "var(--color-border)" }} />
        </button>
      ))}
      <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>Rate</span>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({
  row, highlight, index, selected, onToggleSelect, onAccessRecorded, onReviewLeft, density,
}: {
  row: DigitalAccessRow; highlight: boolean; index: number;
  selected: boolean; onToggleSelect: (id: string) => void;
  onAccessRecorded: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
  density: Density;
}) {
  const product = row.products;
  const config = getSubtypeConfig(row.subtype, row.access_url);
  const SubtypeIcon = config.icon;
  const ActionIcon = config.ActionIcon;
  const isExpired = isExpiredFn(row);
  const daysLeft = daysUntilExpiryFn(row);
  const image = product?.images?.[0] ?? null;
  // Vendor logo as secondary fallback
  const vendorLogo = row.vendors?.business_logo ?? null;
  const thumbnail = image ?? vendorLogo;
  const name = product?.name ?? "Unknown product";
  const dateLabel = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const expiryLabel = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const isSubscription = product?.pricing_type === "subscription" || !!product?.billing_period;
  const expiryVerb = isSubscription ? "Renews" : "Expires";
  const pricePaid = formatCurrency(row.order_items?.unit_price);
  const fileSize = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
  const downloadCount = row.order_items?.download_count ?? null;
  const variantName = row.order_items?.variant_name ?? null;
  const vendorName = row.vendors?.business_name ?? null;
  const revokeReason = getRevokeReasonLabel(row.revoke_reason);
  const compact = density === "compact";

  function handleCopy() {
    if (!row.access_url) return;
    navigator.clipboard.writeText(row.access_url);
    toast.success("Link copied to clipboard");
  }

  async function handleAction() {
    if (!row.access_url) return;
    onAccessRecorded(row.id);
    if (config.action === "download") {
      const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
    } else {
      window.open(row.access_url, "_blank");
    }
  }

  return (
    <div
      className={cn(
        "product-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5",
        highlight && "ring-2",
        isExpired && "opacity-60 grayscale",
        selected && "ring-2",
      )}
      style={{
        animationDelay: `${index * 40}ms`,
        ...(highlight && { boxShadow: `var(--shadow-glow), 0 0 0 2px rgba(48,164,108,0.3)` }),
        ...(selected && { outline: `2px solid var(--color-accent)`, outlineOffset: "2px" }),
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleSelect(row.id)}
        className="absolute top-3 right-3 z-20 h-6 w-6 rounded-lg flex items-center justify-center transition-all"
        style={{
          backgroundColor: selected ? "var(--color-accent)" : "rgba(0,0,0,0.35)",
          border: selected ? "none" : "1.5px solid rgba(255,255,255,0.4)",
          backdropFilter: "blur(4px)",
        }}
      >
        {selected
          ? <CheckSquare className="h-3.5 w-3.5 text-white" />
          : <Square className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </button>

      {/* Order link badge (top-left, only if order_id available) */}
      {row.order_id && (
        <Link
          href={`/dashboard/orders/${row.order_id}`}
          className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
          title={`Order #${row.order_id}`}
          onClick={e => e.stopPropagation()}
        >
          <ShoppingBag className="h-2.5 w-2.5" />
          #{String(row.order_id).slice(-6)}
        </Link>
      )}

      {/* Thumbnail */}
      <div className={cn("relative overflow-hidden", compact ? "aspect-[4/3]" : "aspect-video")} style={{ backgroundColor: "var(--color-surface-secondary)" }}>
        {thumbnail ? (
          <>
            <img src={thumbnail} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            {!image && vendorLogo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <img src={vendorLogo} alt={vendorName ?? "Vendor"} className="h-12 w-12 rounded-xl object-contain bg-white p-1" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        ) : (
          <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br", config.gradient)} style={{ opacity: 0.12 }}>
            <SubtypeIcon className="h-10 w-10" style={{ color: config.accent, opacity: 1 }} />
            {/* Vendor fallback text if no logo */}
            {vendorName && <span className="text-[10px] font-bold" style={{ color: config.accent, opacity: 0.7 }}>{vendorName}</span>}
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex items-start gap-1.5 flex-wrap max-w-[calc(100%-3.5rem)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: `${config.accent}22`, color: config.accent, border: `1px solid ${config.accent}40` }}>
            <SubtypeIcon className="h-3 w-3" /> {config.label}
          </div>
          {isExpired ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(229,72,77,0.15)", color: "var(--color-danger)", border: "1px solid rgba(229,72,77,0.3)" }}>
              <AlertTriangle className="h-3 w-3" /> Expired
            </div>
          ) : daysLeft !== null && daysLeft <= 7 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(240,180,41,0.15)", color: "var(--color-warning)", border: "1px solid rgba(240,180,41,0.3)" }}>
              <Clock className="h-3 w-3" /> {daysLeft}d left
            </div>
          ) : !isExpired && row.access_url ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(48,164,108,0.15)", color: "var(--color-success)", border: "1px solid rgba(48,164,108,0.3)" }}>
              <CheckCircle2 className="h-3 w-3" /> Active
            </div>
          ) : null}
        </div>

        {/* Course progress overlay */}
        {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-white/80">{row.lesson_progress.completed_lessons}/{row.lesson_progress.total_lessons} lessons</span>
              <span className="text-[10px] font-bold text-white">{row.lesson_progress.percent}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${row.lesson_progress.percent}%` }} />
            </div>
          </div>
        )}

        {/* Hover overlay */}
        {!isExpired && row.access_url && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            {config.action === "continue" ? (
              <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm">
                <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
              </Link>
            ) : (
              <button onClick={handleAction} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm">
                <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className={cn("h-0.5 w-8 rounded-full mb-3 bg-gradient-to-r", config.gradient)} />

        {/* Name + variant */}
        <p className="text-[14px] font-semibold truncate leading-snug" style={{ color: "var(--color-text-primary)" }} title={name}>{name}</p>
        {variantName && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{variantName}</p>
        )}

        {/* Vendor attribution */}
        {vendorName && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {vendorLogo ? (
              <img src={vendorLogo} alt={vendorName} className="h-4 w-4 rounded object-cover" />
            ) : (
              <Store className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
            )}
            <span className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{vendorName}</span>
          </div>
        )}

        {/* Meta row: claimed date + price paid */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {config.action === "continue" ? "Enrolled" : "Claimed"} · {dateLabel}
          </p>
          {pricePaid && (
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{pricePaid}</span>
          )}
        </div>

        {/* Tags */}
        {product?.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.tags.slice(0, 3).map(tag => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
                <Tag className="h-2.5 w-2.5" /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expiry / lifetime */}
        {expiryLabel && !isExpired && (
          <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: isSubscription ? "var(--color-success)" : "var(--color-warning)" }}>
            <Clock className="h-3 w-3" /> {expiryVerb} {expiryLabel}
            {isSubscription && (
              <button className="ml-1 text-[10px] font-bold underline underline-offset-2 hover:no-underline" style={{ color: "var(--color-accent)" }}>
                Manage
              </button>
            )}
          </p>
        )}
        {!row.expires_at && (
          <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>Lifetime access</p>
        )}

        {/* Revoke reason */}
        {revokeReason && (
          <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "var(--color-danger)" }}>
            <XCircle className="h-3 w-3" /> {revokeReason}
          </p>
        )}

        {/* File size + download count row */}
        {(fileSize || downloadCount !== null) && (
          <div className="flex items-center gap-3 mt-2">
            {fileSize && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                <HardDrive className="h-3 w-3" /> {fileSize}
              </span>
            )}
            {downloadCount !== null && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                <Download className="h-3 w-3" /> {downloadCount} download{downloadCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Review CTA */}
        {!isExpired && row.access_url && product?.id && (
          <div className="mt-2.5">
            <StarRating
              productId={product.id}
              existingReview={row.user_review}
              onReviewLeft={onReviewLeft}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          {isExpired ? (
            <button disabled className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-40 cursor-not-allowed flex items-center justify-center gap-1.5" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
              <AlertTriangle className="h-3.5 w-3.5" /> {revokeReason ?? "Expired"}
            </button>
          ) : !row.access_url ? (
            <button disabled className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-50 cursor-not-allowed flex items-center justify-center gap-1.5" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
            </button>
          ) : config.action === "continue" ? (
            <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className={cn("flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r", config.gradient)}>
              <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
            </Link>
          ) : (
            <button onClick={handleAction} className={cn("flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r", config.gradient)}>
              <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
            </button>
          )}
          {row.access_url && !isExpired && (
            config.action === "continue" ? (
              <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} title="View progress" className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                <BarChart2 className="h-4 w-4" />
              </Link>
            ) : (
              <button onClick={handleCopy} title="Copy link" className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                <Copy className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {/* Order linkback */}
        {row.order_id && (
          <Link
            href={`/dashboard/orders/${row.order_id}`}
            className="mt-2.5 flex items-center gap-1 text-[10px] font-medium hover:underline transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ShoppingBag className="h-3 w-3" />
            View order #{String(row.order_id).slice(-8)}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  rows, highlightId, selected, onToggleSelect, onAccessRecorded, onReviewLeft,
}: {
  rows: DigitalAccessRow[];
  highlightId: string | null;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onAccessRecorded: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("granted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sortKey) {
      case "name": av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
      case "subtype": av = a.subtype ?? ""; bv = b.subtype ?? ""; break;
      case "granted_at": av = new Date(a.granted_at).getTime(); bv = new Date(b.granted_at).getTime(); break;
      case "expires_at": av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
      case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
      case "status": av = isExpiredFn(a) ? 1 : 0; bv = isExpiredFn(b) ? 1 : 0; break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [rows, sortKey, sortDir]);

  const COLS: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Product", className: "w-full" },
    { key: "subtype", label: "Type", className: "w-32 hidden sm:table-cell" },
    { key: "granted_at", label: "Claimed", className: "w-36 hidden md:table-cell" },
    { key: "last_accessed_at", label: "Last used", className: "w-36 hidden lg:table-cell" },
    { key: "expires_at", label: "Expires", className: "w-36 hidden xl:table-cell" },
    { key: "status", label: "Status", className: "w-28" },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" style={{ color: "var(--color-accent)" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "var(--color-accent)" }} />;
  }

  const allSelected = sorted.length > 0 && sorted.every(r => selected.has(r.id));

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
              <th className="w-10 pl-4 py-3">
                <button
                  onClick={() => sorted.forEach(r => onToggleSelect(r.id))}
                  className="h-5 w-5 rounded-md border flex items-center justify-center transition-all"
                  style={{ borderColor: allSelected ? "var(--color-accent)" : "var(--color-border)", backgroundColor: allSelected ? "var(--color-accent)" : "transparent" }}
                >
                  {allSelected && <CheckSquare className="h-3 w-3 text-white" />}
                </button>
              </th>
              <th className="w-12 pl-2 py-3" />
              {COLS.map(col => (
                <th key={col.key} className={cn("py-3 pr-4 text-left font-semibold select-none", col.className)} style={{ color: "var(--color-text-muted)" }}>
                  <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    {col.label} <SortIcon col={col.key} />
                  </button>
                </th>
              ))}
              {/* Extra cols */}
              <th className="w-24 py-3 pr-4 text-left font-semibold hidden xl:table-cell" style={{ color: "var(--color-text-muted)" }}>Price</th>
              <th className="w-24 py-3 pr-4 text-left font-semibold hidden xl:table-cell" style={{ color: "var(--color-text-muted)" }}>Downloads</th>
              <th className="w-36 py-3 pr-4 text-right font-semibold" style={{ color: "var(--color-text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <TableRow
                key={row.id}
                row={row}
                highlight={highlightId === row.id || highlightId === row.products?.id}
                isLast={i === sorted.length - 1}
                selected={selected.has(row.id)}
                onToggleSelect={onToggleSelect}
                onAccessRecorded={onAccessRecorded}
                onReviewLeft={onReviewLeft}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
        <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>{sorted.length} item{sorted.length !== 1 ? "s" : ""}</p>
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Click a column header to sort · Arrow keys to navigate</p>
      </div>
    </div>
  );
}

function TableRow({ row, highlight, isLast, selected, onToggleSelect, onAccessRecorded, onReviewLeft }: {
  row: DigitalAccessRow; highlight: boolean; isLast: boolean;
  selected: boolean; onToggleSelect: (id: string) => void;
  onAccessRecorded: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const product = row.products;
  const config = getSubtypeConfig(row.subtype, row.access_url);
  const SubtypeIcon = config.icon;
  const ActionIcon = config.ActionIcon;
  const isExpired = isExpiredFn(row);
  const daysLeft = daysUntilExpiryFn(row);
  const image = product?.images?.[0] ?? null;
  const vendorLogo = row.vendors?.business_logo ?? null;
  const thumbnail = image ?? vendorLogo;
  const name = product?.name ?? "Unknown product";
  const grantedLabel = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const expiryLabel = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const lastUsedLabel = row.last_accessed_at ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
  const pricePaid = formatCurrency(row.order_items?.unit_price);
  const fileSize = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
  const downloadCount = row.order_items?.download_count ?? null;
  const variantName = row.order_items?.variant_name ?? null;
  const vendorName = row.vendors?.business_name ?? null;
  const revokeReason = getRevokeReasonLabel(row.revoke_reason);

  function handleCopy() {
    if (!row.access_url) return;
    navigator.clipboard.writeText(row.access_url);
    toast.success("Link copied");
  }

  async function handleAction() {
    if (!row.access_url) return;
    onAccessRecorded(row.id);
    if (config.action === "download") {
      const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
    } else {
      window.open(row.access_url, "_blank");
    }
  }

  return (
    <tr
      className={cn("group transition-colors", isExpired && "opacity-55")}
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--color-border)",
        backgroundColor: selected ? "rgba(253,80,0,0.04)" : highlight ? "rgba(48,164,108,0.05)" : "var(--color-surface)",
      }}
      onMouseEnter={e => { if (!selected && !highlight) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-secondary)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = selected ? "rgba(253,80,0,0.04)" : highlight ? "rgba(48,164,108,0.05)" : "var(--color-surface)"; }}
    >
      {/* Checkbox */}
      <td className="pl-4 py-3 w-10">
        <button onClick={() => onToggleSelect(row.id)} className="h-5 w-5 rounded-md border flex items-center justify-center transition-all" style={{ borderColor: selected ? "var(--color-accent)" : "var(--color-border)", backgroundColor: selected ? "var(--color-accent)" : "transparent" }}>
          {selected && <CheckSquare className="h-3 w-3 text-white" />}
        </button>
      </td>
      {/* Thumbnail */}
      <td className="pl-2 py-3 w-12">
        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
          {thumbnail ? (
            <img src={thumbnail} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", config.gradient)} style={{ opacity: 0.18 }}>
              <SubtypeIcon className="h-5 w-5" style={{ color: config.accent, opacity: 1 }} />
            </div>
          )}
        </div>
      </td>
      {/* Name + meta */}
      <td className="py-3 pr-4 w-full">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {highlight && <span className="shrink-0 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-success)" }} />}
            <span className="font-semibold truncate max-w-[220px]" style={{ color: "var(--color-text-primary)" }} title={name}>{name}</span>
            {variantName && <span className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>{variantName}</span>}
          </div>
          {vendorName && (
            <div className="flex items-center gap-1">
              {vendorLogo && <img src={vendorLogo} alt={vendorName} className="h-3 w-3 rounded object-cover" />}
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{vendorName}</span>
            </div>
          )}
          {/* Inline course progress */}
          {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1 w-20 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
                <div className="h-full rounded-full" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.accent }} />
              </div>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{row.lesson_progress.percent}%</span>
            </div>
          )}
          {/* Review stars inline */}
          {!isExpired && row.access_url && product?.id && (
            <div className="mt-0.5">
              <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
            </div>
          )}
          {/* Order link */}
          {row.order_id && (
            <Link href={`/dashboard/orders/${row.order_id}`} className="flex items-center gap-1 text-[10px] hover:underline opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-text-muted)" }}>
              <ShoppingBag className="h-2.5 w-2.5" /> #{String(row.order_id).slice(-8)}
            </Link>
          )}
        </div>
      </td>
      {/* Type */}
      <td className="py-3 pr-4 w-32 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${config.accent}14`, color: config.accent }}>
          <SubtypeIcon className="h-3 w-3 shrink-0" /> {config.label}
        </span>
      </td>
      {/* Claimed */}
      <td className="py-3 pr-4 w-36 hidden md:table-cell">
        <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{grantedLabel}</span>
      </td>
      {/* Last used */}
      <td className="py-3 pr-4 w-36 hidden lg:table-cell">
        <span className="text-[12px]" style={{ color: lastUsedLabel === "Never" ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>{lastUsedLabel}</span>
      </td>
      {/* Expires */}
      <td className="py-3 pr-4 w-36 hidden xl:table-cell">
        {revokeReason ? (
          <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--color-danger)" }}>
            <XCircle className="h-3 w-3 shrink-0" /> {revokeReason}
          </span>
        ) : row.expires_at ? (
          <span className="text-[12px] inline-flex items-center gap-1" style={{ color: isExpired ? "var(--color-danger)" : daysLeft !== null && daysLeft <= 7 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
            {(isExpired || (daysLeft !== null && daysLeft <= 7)) && <Clock className="h-3 w-3 shrink-0" />}
            {expiryLabel}
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Lifetime</span>
        )}
      </td>
      {/* Status */}
      <td className="py-3 pr-4 w-28">
        {isExpired ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,72,77,0.1)", color: "var(--color-danger)", border: "1px solid rgba(229,72,77,0.2)" }}>
            <AlertTriangle className="h-3 w-3" /> Expired
          </span>
        ) : !row.access_url ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(240,180,41,0.1)", color: "var(--color-warning)", border: "1px solid rgba(240,180,41,0.2)" }}>
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(48,164,108,0.1)", color: "var(--color-success)", border: "1px solid rgba(48,164,108,0.2)" }}>
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
      </td>
      {/* Price paid */}
      <td className="py-3 pr-4 w-24 hidden xl:table-cell">
        <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{pricePaid ?? (fileSize ? fileSize : "—")}</span>
      </td>
      {/* Download count */}
      <td className="py-3 pr-4 w-24 hidden xl:table-cell">
        <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
          {downloadCount !== null ? `${downloadCount}×` : "—"}
        </span>
      </td>
      {/* Actions */}
      <td className="py-3 pr-4 w-36">
        <div className="flex items-center justify-end gap-1.5">
          {!isExpired && row.access_url ? (
            <>
              {config.action === "continue" ? (
                <>
                  <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85", config.gradient)}>
                    <ActionIcon className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">{config.actionLabel}</span>
                  </Link>
                  <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} title="View progress" className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <>
                  <button onClick={handleAction} className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85", config.gradient)}>
                    <ActionIcon className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">{config.actionLabel}</span>
                  </button>
                  <button onClick={handleCopy} title="Copy link" className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="text-[11px] opacity-40" style={{ color: "var(--color-text-muted)" }}>—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: DigitalAccessRow[] }) {
  const total = items.length;
  const active = items.filter(r => r.access_url && !isExpiredFn(r)).length;
  const expired = items.filter(r => isExpiredFn(r)).length;
  const expiringSoon = items.filter(r => { const d = daysUntilExpiryFn(r); return d !== null && d > 0 && d <= 7; }).length;

  const stats = [
    { label: "Total assets", value: total, color: "var(--color-text-primary)" },
    { label: "Active", value: active, color: "var(--color-success)" },
    ...(expiringSoon > 0 ? [{ label: "Expiring soon", value: expiringSoon, color: "var(--color-warning)" }] : []),
    ...(expired > 0 ? [{ label: "Expired", value: expired, color: "var(--color-danger)" }] : []),
  ];

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />}
          <div>
            <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>{s.label}</p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigitalLibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get("highlight") ?? searchParams.get("new") ?? null;

  const [items, setItems] = useState<DigitalAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("dlv") as "grid" | "table") ?? "grid";
    return "grid";
  });
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("dld") as Density) ?? "comfortable";
    return "comfortable";
  });
  const [showExpired, setShowExpired] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("granted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);

  function setViewModePersisted(mode: "grid" | "table") {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("dlv", mode);
  }

  function setDensityPersisted(d: Density) {
    setDensity(d);
    if (typeof window !== "undefined") localStorage.setItem("dld", d);
  }

  // ── Updated load — fetches all required fields ──
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setRefreshing(false); return; }
    userIdRef.current = user.id;

    const { data, error } = await supabase
      .from("digital_access")
      .select(`
        id, access_url, subtype, granted_at, expires_at, last_accessed_at,
        order_id, order_item_id, revoke_reason,
        products (
          id, name, images, button_text, pricing_type, billing_period,
          digital_file_size, tags, description,
          vendors ( business_name, business_logo )
        ),
        order_items (
          unit_price, total_price, download_count, variant_name, variant_id
        )
      `)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[DigitalLibrary]", error);
      setLoadError(true);
    } else {
      setLoadError(false);
      // Fetch lesson_progress and user_reviews separately
      const accessIds = (data ?? []).map(r => r.id);
      const productIds = (data ?? []).map(r => (Array.isArray(r.products) ? r.products[0]?.id : (r.products as any)?.id)).filter(Boolean);

      // lesson_progress aggregates
      let progressMap: Record<string, { completed_lessons: number; total_lessons: number; percent: number }> = {};
      if (productIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("course_id, completed, community_courses!inner(total_lessons)")
          .eq("user_id", user.id)
          .in("course_id", productIds);
        if (progressData) {
          const grouped: Record<string, { completed: number; total: number }> = {};
          (progressData as any[]).forEach(p => {
            if (!grouped[p.course_id]) grouped[p.course_id] = { completed: 0, total: p.community_courses?.total_lessons ?? 0 };
            if (p.completed) grouped[p.course_id].completed += 1;
          });
          Object.entries(grouped).forEach(([courseId, g]) => {
            progressMap[courseId] = {
              completed_lessons: g.completed,
              total_lessons: g.total,
              percent: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
            };
          });
        }
      }

      // user reviews
      let reviewMap: Record<string, { rating: number; id: string }> = {};
      if (productIds.length > 0) {
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("id, product_id, rating")
          .eq("buyer_id", user.id)
          .in("product_id", productIds);
        if (reviewData) {
          (reviewData as any[]).forEach(r => { reviewMap[r.product_id] = { rating: r.rating, id: r.id }; });
        }
      }

      const resolved = (data ?? []).map((row: any) => {
        const product = Array.isArray(row.products) ? (row.products[0] ?? null) : row.products;
        const vendor = product?.vendors ? (Array.isArray(product.vendors) ? product.vendors[0] : product.vendors) : null;
        const orderItem = Array.isArray(row.order_items) ? (row.order_items[0] ?? null) : row.order_items;
        const productId = product?.id;
        return {
          ...row,
          products: product ? { ...product, vendors: undefined } : null,
          vendors: vendor,
          order_items: orderItem,
          lesson_progress: productId ? progressMap[productId] ?? null : null,
          user_review: productId ? reviewMap[productId] ?? null : null,
        } as DigitalAccessRow;
      });
      setItems(resolved);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // ── Realtime ──
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      await load();
      if (cancelled || !userIdRef.current) return;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      channelRef.current = supabase
        .channel(`digital-access-${userIdRef.current}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "digital_access", filter: `user_id=eq.${userIdRef.current}` }, () => load())
        .subscribe();
    }
    init();
    return () => {
      cancelled = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [load]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // CMD+K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); return; }
      // Escape: clear search / deselect
      if (e.key === "Escape") {
        if (search) setSearch("");
        else if (selected.size > 0) setSelected(new Set());
        else if (focusedIndex >= 0) setFocusedIndex(-1);
        return;
      }
      // Arrow keys navigate grid (only when not in input)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (viewMode === "grid" && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
          if (e.key === "ArrowRight") return Math.min(prev + 1, paginated.length - 1);
          if (e.key === "ArrowLeft") return Math.max(prev - 1, 0);
          if (e.key === "ArrowDown") return Math.min(prev + cols, paginated.length - 1);
          if (e.key === "ArrowUp") return Math.max(prev - cols, 0);
          return prev;
        });
        return;
      }
      // Enter triggers primary action on focused card
      if (e.key === "Enter" && focusedIndex >= 0 && paginated[focusedIndex]) {
        const row = paginated[focusedIndex];
        if (!row.access_url || isExpiredFn(row)) return;
        const config = getSubtypeConfig(row.subtype, row.access_url);
        if (config.action === "continue") {
          router.push(`/dashboard/my-courses/${row.products?.id}`);
        } else if (config.action === "download") {
          const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
        } else {
          window.open(row.access_url, "_blank");
        }
      }
      // Space toggles selection on focused card
      if (e.key === " " && focusedIndex >= 0 && paginated[focusedIndex]) {
        e.preventDefault();
        toggleSelect(paginated[focusedIndex].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Scroll highlighted into view ──
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [highlightId, items]);

  // ── Record access ──
  const handleAccessRecorded = useCallback(async (id: string) => {
    const supabase = createClient();
    const now = new Date().toISOString();
    setItems(prev => prev.map(r => r.id === id ? { ...r, last_accessed_at: now } : r));
    await supabase.from("digital_access").update({ last_accessed_at: now }).eq("id", id);
  }, []);

  // ── Submit review ──
  const handleReviewLeft = useCallback(async (productId: string, rating: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("reviews")
      .upsert({ product_id: productId, buyer_id: user.id, rating }, { onConflict: "product_id,buyer_id" })
      .select("id, rating")
      .single();
    if (!error && data) {
      setItems(prev => prev.map(r => r.products?.id === productId ? { ...r, user_review: { rating: data.rating, id: data.id } } : r));
      toast.success(`Rated ${rating} star${rating !== 1 ? "s" : ""}!`);
    }
  }, []);

  // ── Filter + sort ──
  const knownSubtypes = useMemo(() => new Set<string>(FILTER_TABS.map(t => t.id).filter(id => id !== "all" && id !== "other")), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(row => {
      if (!showExpired && isExpiredFn(row)) return false;
      const name = row.products?.name ?? "";
      const desc = row.products?.description ?? "";
      const tags = (row.products?.tags ?? []).join(" ");
      const matchSearch = !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || tags.toLowerCase().includes(q);
      const bucket = !row.subtype || !knownSubtypes.has(row.subtype) ? "other" : row.subtype;
      const matchFilter = activeFilter === "all" || bucket === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [items, search, activeFilter, showExpired, knownSubtypes]);


  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sortKey) {
      case "name": av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
      case "subtype": av = a.subtype ?? ""; bv = b.subtype ?? ""; break;
      case "granted_at": av = new Date(a.granted_at).getTime(); bv = new Date(b.granted_at).getTime(); break;
      case "expires_at": av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
      case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
      case "status": av = isExpiredFn(a) ? 1 : 0; bv = isExpiredFn(b) ? 1 : 0; break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [filtered, sortKey, sortDir]);

  useEffect(() => { setPage(1); setFocusedIndex(-1); }, [search, activeFilter, showExpired, sortKey, sortDir]);

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < sorted.length;

  const countBySubtype = useMemo(() => {
    return items.filter(r => showExpired || !isExpiredFn(r)).reduce<Record<string, number>>((acc, row) => {
      const key = !row.subtype || !knownSubtypes.has(row.subtype) ? "other" : row.subtype;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  }, [items, showExpired, knownSubtypes]);

  const expiredCount = items.filter(r => isExpiredFn(r)).length;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function bulkCopy() {
    const urls = items.filter(r => selected.has(r.id) && r.access_url).map(r => r.access_url!).join("\n");
    if (!urls) { toast.error("No valid links in selection"); return; }
    navigator.clipboard.writeText(urls);
    toast.success(`Copied ${selected.size} link${selected.size !== 1 ? "s" : ""}`);
  }

  function bulkDownload() {
    items.filter(r => selected.has(r.id) && r.access_url && getSubtypeConfig(r.subtype, r.access_url).action === "download").forEach(r => {
      const a = document.createElement("a"); a.href = r.access_url!; a.download = ""; a.target = "_blank"; a.click();
    });
    toast.success("Downloads started");
  }

  // ── Grid column classes based on density ──
  const gridCols = density === "compact"
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-7">
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
            <div className="space-y-2 mt-1">
              <div className="h-7 w-44 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
              <div className="h-4 w-56 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
            </div>
          </div>
          <div className="h-10 w-64 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
        </div>
        <div className="flex gap-2 animate-pulse">
          {[80, 72, 68, 76, 64, 80].map((w, i) => (
            <div key={i} className="h-8 rounded-full" style={{ width: w, backgroundColor: "var(--color-surface-secondary)" }} />
          ))}
        </div>
        <div className={cn("grid", gridCols)}>
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} density={density} />)}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <BulkBar
        selected={selected}
        total={sorted.length}
        onSelectAll={() => setSelected(new Set(sorted.map(r => r.id)))}
        onClear={() => setSelected(new Set())}
        onBulkCopy={bulkCopy}
        onBulkDownload={bulkDownload}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shrink-0" style={{ boxShadow: "var(--shadow-md)" }}>
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none" style={{ color: "var(--color-text-primary)" }}>Digital Library</h1>
              <p className="text-[13px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>All your purchased digital products in one place</p>
              {items.length > 0 && <div className="mt-3"><StatsBar items={items} /></div>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Show expired toggle */}
            {expiredCount > 0 && (
              <button
                onClick={() => setShowExpired(v => !v)}
                className="h-10 px-3 rounded-xl text-[12px] font-semibold border flex items-center gap-1.5 transition-all"
                style={{
                  borderColor: showExpired ? "var(--color-danger)" : "var(--color-border)",
                  backgroundColor: showExpired ? "rgba(229,72,77,0.08)" : "var(--color-surface)",
                  color: showExpired ? "var(--color-danger)" : "var(--color-text-muted)",
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {showExpired ? "Hide" : "Show"} expired ({expiredCount})
              </button>
            )}

            {/* Density toggle (grid mode only) */}
            {viewMode === "grid" && (
              <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
                {([
                  { d: "comfortable" as Density, Icon: LayoutGrid, title: "Comfortable density" },
                  { d: "compact" as Density, Icon: AlignJustify, title: "Compact density" },
                ] as const).map(({ d, Icon, title }) => (
                  <button
                    key={d}
                    onClick={() => setDensityPersisted(d)}
                    title={title}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: density === d ? "var(--color-surface)" : "transparent",
                      color: density === d ? "var(--color-text-primary)" : "var(--color-text-muted)",
                      boxShadow: density === d ? "var(--shadow-sm)" : undefined,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}

            {/* Refresh */}
            <button onClick={() => load(true)} disabled={refreshing} title="Refresh library" className="h-10 w-10 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>

            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
              {([
                { mode: "grid" as const, Icon: Grid3X3, title: "Grid view" },
                { mode: "table" as const, Icon: Table2, title: "Table view" },
              ]).map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewModePersisted(mode)}
                  title={title}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: viewMode === mode ? "var(--color-surface)" : "transparent",
                    color: viewMode === mode ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    boxShadow: viewMode === mode ? "var(--shadow-sm)" : undefined,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
              <input
                ref={searchRef}
                placeholder="Search by name, tag, description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input h-10 pl-9 pr-10 text-[13px] w-52 focus:w-72 transition-all"
              />
              {search ? (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
                  <XCircle className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none border hidden sm:block" style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {loadError && <ErrorBanner onRetry={() => load()} />}

        {/* ── Expiry notification banner ── */}
        <ExpiryBanner items={items} />

        {/* ── Recently used shelf ── */}
        <RecentlyUsedShelf items={items} onAccessRecorded={handleAccessRecorded} />

        {/* ── Filter tabs ── */}
        {items.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map(tab => {
              const count = tab.id === "all"
                ? (showExpired ? items.length : items.filter(r => !isExpiredFn(r)).length)
                : (countBySubtype[tab.id] ?? 0);
              if (tab.id !== "all" && count === 0) return null;
              const TabIcon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className="h-8 pl-3 pr-3 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: isActive ? "var(--color-text-primary)" : "transparent",
                    color: isActive ? "var(--color-bg)" : "var(--color-text-secondary)",
                    borderColor: isActive ? "var(--color-text-primary)" : "var(--color-border)",
                    boxShadow: isActive ? "var(--shadow-sm)" : undefined,
                  }}
                >
                  <TabIcon className="h-3 w-3" />
                  {tab.label}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--color-surface-secondary)", color: isActive ? "inherit" : "var(--color-text-muted)" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Grid sort bar ── */}
        {sorted.length > 0 && viewMode === "grid" && (
          <GridSortBar sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
        )}

        {/* ── Results label ── */}
        {(search || activeFilter !== "all") && sorted.length > 0 && (
          <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            Showing <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{sorted.length}</span> result{sorted.length !== 1 ? "s" : ""}
            {search && <> for <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>"{search}"</span></>}
          </p>
        )}

        {/* ── Empty: no items ── */}
        {items.length === 0 && !loadError && (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed" style={{ borderColor: "var(--color-border)" }}>
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 border" style={{ background: "var(--color-accent-light)", borderColor: "var(--color-accent-subtle)" }}>
              <Library className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
            </div>
            <p className="text-[16px] font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Your library is empty</p>
            <p className="text-[13px] max-w-xs text-center leading-relaxed mb-7" style={{ color: "var(--color-text-muted)" }}>
              Software, courses, ebooks and other digital products you purchase appear here with instant access.
            </p>
            <Link href="/marketplace" className="btn-premium gradient-brand text-white inline-flex items-center gap-2" style={{ boxShadow: "var(--shadow-md)" }}>
              <Sparkles className="h-4 w-4" /> Browse marketplace
            </Link>
          </div>
        )}

        {/* ── Empty: no search results — differentiated ── */}
        {items.length > 0 && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed" style={{ borderColor: "var(--color-border)" }}>
            <Search className="h-8 w-8 mb-4" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              {search && activeFilter !== "all"
                ? `No ${activeFilter} results for "${search}"`
                : search
                  ? `No results for "${search}"`
                  : `No ${activeFilter} assets`}
            </p>
            <p className="text-[13px] mb-4" style={{ color: "var(--color-text-muted)" }}>
              {search
                ? "Try different keywords — search covers names, tags, and descriptions"
                : "Try a different filter"}
            </p>
            <div className="flex gap-2">
              {search && (
                <button onClick={() => setSearch("")} className="h-8 px-4 rounded-xl text-[12px] font-semibold border transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}>
                  Clear search
                </button>
              )}
              {activeFilter !== "all" && (
                <button onClick={() => setActiveFilter("all")} className="h-8 px-4 rounded-xl text-[12px] font-semibold border transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}>
                  Show all
                </button>
              )}
              {!search && activeFilter === "all" && (
                <Link href="/marketplace" className="h-8 px-4 rounded-xl text-[12px] font-bold text-white gradient-brand flex items-center gap-1.5 transition-opacity hover:opacity-85">
                  <Sparkles className="h-3.5 w-3.5" /> Browse marketplace
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Grid view ── */}
        {sorted.length > 0 && viewMode === "grid" && (
          <>
            <div className={cn("grid stagger-children", gridCols)}>
              {paginated.map((row, i) => {
                const isHighlighted = highlightId === row.id || highlightId === row.products?.id;
                return (
                  <div
                    key={row.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={cn(focusedIndex === i && "ring-2 ring-offset-2 rounded-2xl")}
                    style={focusedIndex === i ? { outline: "2px solid var(--color-accent)", outlineOffset: "4px", borderRadius: "var(--radius-lg)" } : undefined}
                    tabIndex={-1}
                  >
                    <GridCard
                      row={row}
                      highlight={isHighlighted}
                      index={i}
                      selected={selected.has(row.id)}
                      onToggleSelect={toggleSelect}
                      onAccessRecorded={handleAccessRecorded}
                      onReviewLeft={handleReviewLeft}
                      density={density}
                    />
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Showing {paginated.length} of {sorted.length}</p>
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="h-9 px-6 rounded-xl border text-xs font-semibold transition-all hover:opacity-80"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
                >
                  Load more ({sorted.length - paginated.length} remaining)
                </button>
              </div>
            )}
            {/* Keyboard hint */}
            {sorted.length > 1 && (
              <p className="text-center text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                ↑↓←→ navigate · Enter to open · Space to select · Esc to clear
              </p>
            )}
          </>
        )}

        {/* ── Table view ── */}
        {sorted.length > 0 && viewMode === "table" && (
          <TableView
            rows={sorted}
            highlightId={highlightId}
            selected={selected}
            onToggleSelect={toggleSelect}
            onAccessRecorded={handleAccessRecorded}
            onReviewLeft={handleReviewLeft}
          />
        )}
      </div>
    </>
  );
}