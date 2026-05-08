"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download, Search, ExternalLink, FileText, Zap, Loader2,
  BookOpen, Package, LayoutTemplate, Music, ImageIcon, Archive,
  Copy, BarChart2, CheckCircle2, Clock, AlertTriangle, Sparkles,
  Library, ChevronRight, Grid3X3, RefreshCw,
  ChevronsUpDown, ChevronUp, ChevronDown, Table2,
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
  products: {
    id: string;
    name: string;
    images: string[] | null;
    button_text: string | null;
    pricing_type: string | null;
    billing_period: string | null;
  } | null;
}

// ─── Subtype config ───────────────────────────────────────────────────────────

function getSubtypeConfig(subtype: string | null, url: string | null) {
  switch (subtype) {
    case "course":
      return {
        label: "Course", icon: BookOpen,
        gradient: "from-sky-500 to-blue-600",
        accent: "#0ea5e9",
        action: "continue" as const,
        actionLabel: "Continue learning",
        ActionIcon: BookOpen,
      };
    case "software":
      return {
        label: "Software", icon: Zap,
        gradient: "from-violet-500 to-purple-600",
        accent: "#8b5cf6",
        action: "open" as const,
        actionLabel: "Launch app",
        ActionIcon: ExternalLink,
      };
    case "ai-tools":
      return {
        label: "AI Tool", icon: Sparkles,
        gradient: "from-fuchsia-500 to-pink-600",
        accent: "#d946ef",
        action: "open" as const,
        actionLabel: "Open tool",
        ActionIcon: ExternalLink,
      };
    case "templates":
      return {
        label: "Template", icon: LayoutTemplate,
        gradient: "from-amber-400 to-orange-500",
        accent: "#f59e0b",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
    case "ebooks":
      return {
        label: "Ebook", icon: FileText,
        gradient: "from-emerald-500 to-teal-600",
        accent: "#10b981",
        action: "download" as const,
        actionLabel: "Read now",
        ActionIcon: Download,
      };
    case "music-audio":
      return {
        label: "Audio", icon: Music,
        gradient: "from-pink-500 to-rose-600",
        accent: "#ec4899",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
    case "graphics-design":
      return {
        label: "Graphics", icon: ImageIcon,
        gradient: "from-orange-400 to-red-500",
        accent: "#f97316",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
    case "photography":
      return {
        label: "Photography", icon: ImageIcon,
        gradient: "from-rose-400 to-pink-600",
        accent: "#fb7185",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
    default: {
      const ext = url?.split(".").pop()?.toLowerCase();
      if (ext === "pdf") return {
        label: "PDF", icon: FileText,
        gradient: "from-red-500 to-rose-600",
        accent: "#ef4444",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
      if (["zip", "rar"].includes(ext ?? "")) return {
        label: "Archive", icon: Archive,
        gradient: "from-slate-400 to-gray-600",
        accent: "#6b7280",
        action: "download" as const,
        actionLabel: "Download",
        ActionIcon: Download,
      };
      return {
        label: "Digital asset", icon: Package,
        gradient: "from-slate-400 to-gray-500",
        accent: "#6b7280",
        action: "open" as const,
        actionLabel: "Access",
        ActionIcon: ExternalLink,
      };
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
] as const;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="aspect-video animate-pulse"
        style={{ backgroundColor: "var(--color-surface-secondary)" }}
      />
      <div className="p-4 space-y-3">
        <div
          className="h-4 w-3/4 rounded-lg animate-pulse"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        />
        <div
          className="h-3 w-1/2 rounded-lg animate-pulse"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        />
        <div
          className="h-9 w-full rounded-xl animate-pulse mt-4"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        />
      </div>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({ row, highlight, index }: { row: DigitalAccessRow; highlight: boolean; index: number }) {
  const product = row.products;
  const config = getSubtypeConfig(row.subtype, row.access_url);
  const SubtypeIcon = config.icon;
  const ActionIcon = config.ActionIcon;

  const isExpired = row.expires_at ? new Date(row.expires_at) < new Date() : false;
  const image = product?.images?.[0] ?? null;
  const name = product?.name ?? "Unknown product";

  const dateLabel = new Date(row.granted_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const expiryLabel = row.expires_at
    ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const daysUntilExpiry = row.expires_at
    ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  function handleCopy() {
    if (!row.access_url) return;
    navigator.clipboard.writeText(row.access_url);
    toast.success("Link copied to clipboard");
  }

  function handleAction() {
    if (!row.access_url) return;
    if (config.action === "download") {
      const a = document.createElement("a");
      a.href = row.access_url;
      a.download = "";
      a.target = "_blank";
      a.click();
    } else {
      window.open(row.access_url, "_blank");
    }
  }

  return (
    <div
      className={cn(
        "product-card group relative overflow-hidden transition-all duration-300",
        "hover:-translate-y-0.5",
        highlight && "ring-2",
        isExpired && "opacity-60 grayscale"
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        ...(highlight && {
          borderColor: "var(--color-success)",
          boxShadow: `var(--shadow-glow), 0 0 0 2px rgba(48,164,108,0.2)`,
        }),
      }}
    >
      {/* Thumbnail */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{ backgroundColor: "var(--color-surface-secondary)" }}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        ) : (
          <div
            className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", config.gradient)}
            style={{ opacity: 0.12 }}
          >
            <SubtypeIcon className="h-10 w-10" style={{ color: config.accent, opacity: 1 }} />
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          {/* Subtype pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
            style={{
              background: `${config.accent}22`,
              color: config.accent,
              border: `1px solid ${config.accent}40`,
            }}
          >
            <SubtypeIcon className="h-3 w-3" />
            {config.label}
          </div>

          {/* Status pill */}
          {isExpired ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
              style={{
                background: "rgba(229,72,77,0.15)",
                color: "var(--color-danger)",
                border: "1px solid rgba(229,72,77,0.3)",
              }}
            >
              <AlertTriangle className="h-3 w-3" />
              Expired
            </div>
          ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
              style={{
                background: "rgba(240,180,41,0.15)",
                color: "var(--color-warning)",
                border: "1px solid rgba(240,180,41,0.3)",
              }}
            >
              <Clock className="h-3 w-3" />
              {daysUntilExpiry}d left
            </div>
          ) : !isExpired && row.access_url ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
              style={{
                background: "rgba(48,164,108,0.15)",
                color: "var(--color-success)",
                border: "1px solid rgba(48,164,108,0.3)",
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Active
            </div>
          ) : null}
        </div>

        {/* Hover overlay with quick actions */}
        {!isExpired && row.access_url && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            {config.action === "continue" ? (
              <Link
                href={`/dashboard/my-courses/${product?.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm"
              >
                <ActionIcon className="h-3.5 w-3.5" />
                {config.actionLabel}
              </Link>
            ) : (
              <button
                onClick={handleAction}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm"
              >
                <ActionIcon className="h-3.5 w-3.5" />
                {config.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Accent line using global gradient */}
        <div className={cn("h-0.5 w-8 rounded-full mb-3 bg-gradient-to-r", config.gradient)} />

        <p
          className="text-[14px] font-semibold truncate leading-snug"
          style={{ color: "var(--color-text-primary)" }}
          title={name}
        >
          {name}
        </p>

        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          {config.action === "continue" ? "Enrolled" : "Claimed"} · {dateLabel}
        </p>

        {expiryLabel && !isExpired && (
          <p
            className="text-[11px] mt-1 flex items-center gap-1"
            style={{ color: "var(--color-warning)" }}
          >
            <Clock className="h-3 w-3" />
            Renews {expiryLabel}
          </p>
        )}

        {/* Action row */}
        <div className="mt-4 flex gap-2">
          {isExpired ? (
            <button
              disabled
              className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-40 cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                color: "var(--color-text-muted)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Expired
            </button>
          ) : !row.access_url ? (
            <button
              disabled
              className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-50 cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: "var(--color-surface-secondary)",
                color: "var(--color-text-muted)",
              }}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
            </button>
          ) : config.action === "continue" ? (
            <Link
              href={`/dashboard/my-courses/${product?.id}`}
              className={cn(
                "flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r",
                config.gradient
              )}
            >
              <ActionIcon className="h-3.5 w-3.5" />
              {config.actionLabel}
            </Link>
          ) : (
            <button
              onClick={handleAction}
              className={cn(
                "flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r",
                config.gradient
              )}
            >
              <ActionIcon className="h-3.5 w-3.5" />
              {config.actionLabel}
            </button>
          )}

          {/* Secondary action */}
          {row.access_url && !isExpired && (
            config.action === "continue" ? (
              <Link
                href={`/dashboard/my-courses/${product?.id}?tab=progress`}
                title="View progress"
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors hover-lift"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                <BarChart2 className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={handleCopy}
                title="Copy link"
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                <Copy className="h-4 w-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

type SortKey = "name" | "subtype" | "granted_at" | "expires_at" | "status";
type SortDir = "asc" | "desc";

function TableView({ rows, highlightId }: { rows: DigitalAccessRow[]; highlightId: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("granted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    const aExpired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
    const bExpired = b.expires_at ? new Date(b.expires_at) < new Date() : false;

    switch (sortKey) {
      case "name":
        av = a.products?.name?.toLowerCase() ?? "";
        bv = b.products?.name?.toLowerCase() ?? "";
        break;
      case "subtype":
        av = a.subtype ?? "";
        bv = b.subtype ?? "";
        break;
      case "granted_at":
        av = new Date(a.granted_at).getTime();
        bv = new Date(b.granted_at).getTime();
        break;
      case "expires_at":
        av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        break;
      case "status":
        av = aExpired ? 1 : 0;
        bv = bExpired ? 1 : 0;
        break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const COLS: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Product", className: "w-full" },
    { key: "subtype", label: "Type", className: "w-32 hidden sm:table-cell" },
    { key: "granted_at", label: "Claimed", className: "w-36 hidden md:table-cell" },
    { key: "expires_at", label: "Expires", className: "w-36 hidden lg:table-cell" },
    { key: "status", label: "Status", className: "w-28" },
  ];

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3" style={{ color: "var(--color-accent)" }} />
      : <ChevronDown className="h-3 w-3" style={{ color: "var(--color-accent)" }} />;
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          {/* ── Head ── */}
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
              {/* Thumbnail spacer */}
              <th className="w-12 pl-4 py-3" />
              {COLS.map(col => (
                <th
                  key={col.key}
                  className={cn("py-3 pr-4 text-left font-semibold select-none", col.className)}
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </button>
                </th>
              ))}
              {/* Actions col */}
              <th className="w-36 py-3 pr-4 text-right font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Actions
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {sorted.map((row, i) => (
              <TableRow
                key={row.id}
                row={row}
                highlight={highlightId === row.id || highlightId === row.products?.id}
                isLast={i === sorted.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div
        className="px-4 py-2.5 flex items-center justify-between border-t"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface-secondary)",
        }}
      >
        <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
          {sorted.length} item{sorted.length !== 1 ? "s" : ""}
        </p>
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Click a column header to sort
        </p>
      </div>
    </div>
  );
}

function TableRow({ row, highlight, isLast }: { row: DigitalAccessRow; highlight: boolean; isLast: boolean }) {
  const product = row.products;
  const config = getSubtypeConfig(row.subtype, row.access_url);
  const SubtypeIcon = config.icon;
  const ActionIcon = config.ActionIcon;
  const isExpired = row.expires_at ? new Date(row.expires_at) < new Date() : false;
  const image = product?.images?.[0] ?? null;
  const name = product?.name ?? "Unknown product";

  const daysUntilExpiry = row.expires_at
    ? Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  const grantedLabel = new Date(row.granted_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const expiryLabel = row.expires_at
    ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  function handleCopy() {
    if (!row.access_url) return;
    navigator.clipboard.writeText(row.access_url);
    toast.success("Link copied");
  }

  function handleAction() {
    if (!row.access_url) return;
    if (config.action === "download") {
      const a = document.createElement("a");
      a.href = row.access_url;
      a.download = "";
      a.target = "_blank";
      a.click();
    } else {
      window.open(row.access_url, "_blank");
    }
  }

  return (
    <tr
      className={cn("group transition-colors", isExpired && "opacity-55")}
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--color-border)",
        backgroundColor: highlight
          ? "rgba(48,164,108,0.05)"
          : "var(--color-surface)",
      }}
      onMouseEnter={e => {
        if (!highlight) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-secondary)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = highlight
          ? "rgba(48,164,108,0.05)"
          : "var(--color-surface)";
      }}
    >
      {/* Thumbnail */}
      <td className="pl-4 py-3 w-12">
        <div
          className="h-10 w-10 rounded-xl overflow-hidden shrink-0"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div
              className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", config.gradient)}
              style={{ opacity: 0.18 }}
            >
              <SubtypeIcon className="h-5 w-5" style={{ color: config.accent, opacity: 1 }} />
            </div>
          )}
        </div>
      </td>

      {/* Name */}
      <td className="py-3 pr-4 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {highlight && (
            <span
              className="shrink-0 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-success)" }}
            />
          )}
          <span
            className="font-semibold truncate max-w-[240px]"
            style={{ color: "var(--color-text-primary)" }}
            title={name}
          >
            {name}
          </span>
        </div>
      </td>

      {/* Type */}
      <td className="py-3 pr-4 w-32 hidden sm:table-cell">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: `${config.accent}14`, color: config.accent }}
        >
          <SubtypeIcon className="h-3 w-3 shrink-0" />
          {config.label}
        </span>
      </td>

      {/* Claimed */}
      <td className="py-3 pr-4 w-36 hidden md:table-cell">
        <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
          {grantedLabel}
        </span>
      </td>

      {/* Expires */}
      <td className="py-3 pr-4 w-36 hidden lg:table-cell">
        {row.expires_at ? (
          <span
            className="text-[12px] inline-flex items-center gap-1"
            style={{
              color: isExpired
                ? "var(--color-danger)"
                : daysUntilExpiry !== null && daysUntilExpiry <= 7
                  ? "var(--color-warning)"
                  : "var(--color-text-secondary)",
            }}
          >
            {(isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 7)) && (
              <Clock className="h-3 w-3 shrink-0" />
            )}
            {expiryLabel}
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Lifetime</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 pr-4 w-28">
        {isExpired ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(229,72,77,0.1)",
              color: "var(--color-danger)",
              border: "1px solid rgba(229,72,77,0.2)",
            }}
          >
            <AlertTriangle className="h-3 w-3" /> Expired
          </span>
        ) : !row.access_url ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(240,180,41,0.1)",
              color: "var(--color-warning)",
              border: "1px solid rgba(240,180,41,0.2)",
            }}
          >
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(48,164,108,0.1)",
              color: "var(--color-success)",
              border: "1px solid rgba(48,164,108,0.2)",
            }}
          >
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 pr-4 w-36">
        <div className="flex items-center justify-end gap-1.5">
          {!isExpired && row.access_url ? (
            <>
              {config.action === "continue" ? (
                <>
                  <Link
                    href={`/dashboard/my-courses/${product?.id}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85",
                      config.gradient
                    )}
                  >
                    <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden lg:inline">{config.actionLabel}</span>
                  </Link>
                  <Link
                    href={`/dashboard/my-courses/${product?.id}?tab=progress`}
                    title="View progress"
                    className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAction}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85",
                      config.gradient
                    )}
                  >
                    <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden lg:inline">{config.actionLabel}</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    title="Copy link"
                    className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                  >
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
  const active = items.filter(r => r.access_url && (!r.expires_at || new Date(r.expires_at) > new Date())).length;
  const expiringSoon = items.filter(r => {
    if (!r.expires_at) return false;
    const days = Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 7;
  }).length;

  const stats = [
    { label: "Total assets", value: total, color: "var(--color-text-primary)" },
    { label: "Active", value: active, color: "var(--color-success)" },
    ...(expiringSoon > 0 ? [{ label: "Expiring soon", value: expiringSoon, color: "var(--color-warning)" }] : []),
  ];

  return (
    <div className="flex items-center gap-6">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && (
            <div
              className="h-4 w-px"
              style={{ backgroundColor: "var(--color-border)" }}
            />
          )}
          <div>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {s.label}
            </p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigitalLibraryPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight") ?? searchParams.get("new") ?? null;

  const [items, setItems] = useState<DigitalAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const searchRef = useRef<HTMLInputElement>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("digital_access")
      .select(`
        id, access_url, subtype, granted_at, expires_at,
        products ( id, name, images, button_text, pricing_type, billing_period )
      `)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[DigitalLibrary]", error);
    } else {
      const resolved = (data ?? []).map((row) => ({
        ...row,
        products: Array.isArray(row.products) ? (row.products[0] ?? null) : row.products,
      })) as DigitalAccessRow[];
      setItems(resolved);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  // Keyboard shortcut: CMD+K focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = items.filter((row) => {
    const name = row.products?.name ?? "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || row.subtype === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Count per filter for badges
  const countBySubtype = items.reduce<Record<string, number>>((acc, row) => {
    const key = row.subtype ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-7">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div
              className="h-7 w-44 rounded-xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-secondary)" }}
            />
            <div
              className="h-4 w-28 rounded-lg animate-pulse"
              style={{ backgroundColor: "var(--color-surface-secondary)" }}
            />
          </div>
          <div
            className="h-10 w-64 rounded-xl animate-pulse"
            style={{ backgroundColor: "var(--color-surface-secondary)" }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          {/* Icon — uses gradient-brand from global.css */}
          <div
            className="h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shrink-0"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <Library className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-black tracking-tight leading-none"
              style={{ color: "var(--color-text-primary)" }}
            >
              Digital Library
            </h1>
            <p
              className="text-[13px] mt-1.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              All your purchased digital products in one place
            </p>
            {items.length > 0 && (
              <div className="mt-3">
                <StatsBar items={items} />
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh */}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh library"
            className="h-10 w-10 rounded-xl flex items-center justify-center border transition-colors"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface-secondary)",
            }}
          >
            {([
              { mode: "grid", Icon: Grid3X3, title: "Grid view" },
              { mode: "table", Icon: Table2, title: "Table view" },
            ] as const).map(({ mode, Icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
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

          {/* Search — uses glass-input from global.css */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              ref={searchRef}
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input h-10 pl-9 pr-10 text-[13px] w-52 focus:w-64 transition-all"
            />
            <kbd
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none border"
              style={{
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const count = tab.id === "all" ? items.length : (countBySubtype[tab.id] ?? 0);
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
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--color-surface-secondary)",
                    color: isActive ? "inherit" : "var(--color-text-muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Results label ── */}
      {(search || activeFilter !== "all") && filtered.length > 0 && (
        <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
          Showing{" "}
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {filtered.length}
          </span>{" "}
          result{filtered.length !== 1 ? "s" : ""}
          {search && (
            <>
              {" "}for{" "}
              <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                "{search}"
              </span>
            </>
          )}
        </p>
      )}

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 border"
            style={{
              background: "var(--color-accent-light)",
              borderColor: "var(--color-accent-subtle)",
            }}
          >
            <Library className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          </div>
          <p
            className="text-[16px] font-bold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Your library is empty
          </p>
          <p
            className="text-[13px] max-w-xs text-center leading-relaxed mb-7"
            style={{ color: "var(--color-text-muted)" }}
          >
            Software, courses, ebooks and other digital products you purchase appear here with instant access.
          </p>
          <Link
            href="/marketplace"
            className="btn-premium gradient-brand text-white inline-flex items-center gap-2"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <Sparkles className="h-4 w-4" />
            Browse marketplace
          </Link>
        </div>
      )}

      {/* ── No search results ── */}
      {items.length > 0 && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search
            className="h-8 w-8 mb-4"
            style={{ color: "var(--color-text-muted)" }}
          />
          <p
            className="text-[15px] font-semibold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            No results found
          </p>
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            Try a different search term or filter
          </p>
          <button
            onClick={() => { setSearch(""); setActiveFilter("all"); }}
            className="mt-4 text-[12px] font-semibold hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Grid view ── */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
          {filtered.map((row, i) => (
            <GridCard
              key={row.id}
              row={row}
              highlight={highlightId === row.id || highlightId === row.products?.id}
              index={i}
            />
          ))}
        </div>
      )}

      {/* ── Table view ── */}
      {filtered.length > 0 && viewMode === "table" && (
        <TableView rows={filtered} highlightId={highlightId} />
      )}
    </div>
  );
}