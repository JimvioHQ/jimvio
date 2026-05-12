import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Attachment } from "@/types";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_FIAT = "USD";

function getRwfToUsdRateForDisplay(): number {
  const pub =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_RWF_TO_USD_RATE
      ? parseFloat(process.env.NEXT_PUBLIC_RWF_TO_USD_RATE)
      : NaN;
  const server =
    typeof process !== "undefined" && process.env.RWF_TO_USD_RATE
      ? parseFloat(process.env.RWF_TO_USD_RATE)
      : NaN;
  const r =
    Number.isFinite(pub) && pub > 0
      ? pub
      : Number.isFinite(server) && server > 0
        ? server
        : 0.0008;
  return r;
}

/** Format a numeric amount. Pass ISO 4217 code (e.g. RWF, USD, ZMW) when known — avoids showing USD for RWF orders. */
export function formatCurrency(amount: number, currency = DEFAULT_FIAT): string {
  const c = (currency || DEFAULT_FIAT).toUpperCase();
  if (c === "RWF") {
    return `RWF ${amount.toLocaleString("en-RW")}`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c.length === 3 ? c : DEFAULT_FIAT,
    }).format(amount);
  } catch {
    return `${c} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

/** Wallet / payouts default to RWF in schema — use when no column is loaded yet. */
export function formatWalletMoney(amount: number, walletCurrency?: string | null): string {
  return formatCurrency(amount, (walletCurrency || "RWF").toUpperCase());
}

type LineWithOrderCurrency = {
  total_price: number | string;
  orders?: { currency?: string | null } | null;
};

/** Aggregate line totals by parent order currency (vendor dashboard revenue). */
export function formatMultiCurrencyLineTotals(rows: LineWithOrderCurrency[]): string {
  const map = new Map<string, number>();
  for (const row of rows) {
    const c = (row.orders?.currency || "RWF").toUpperCase();
    map.set(c, (map.get(c) ?? 0) + Number(row.total_price));
  }
  if (map.size === 0) return formatCurrency(0, "RWF");
  const parts = [...map.entries()].map(([c, a]) => formatCurrency(a, c));
  return parts.join(" · ");
}

/**
 * Cart and checkout lines: always show the **stored** order currency (no RWF→USD conversion).
 * Use this for pending orders and line items. For marketplace browse cards, see `formatDisplayMoney`.
 */
export function formatCartMoney(amount: number, currency?: string | null): string {
  return formatCurrency(amount, (currency || DEFAULT_FIAT).toUpperCase());
}

export type CartOrderForTotals = {
  currency?: string | null;
  order_items: { total_price: number | string }[];
};

/** One subtotal per currency when the cart has multiple vendor orders in different currencies. */
export function formatMultiCurrencyCartTotals(orders: CartOrderForTotals[]): string {
  const map = new Map<string, number>();
  for (const o of orders) {
    const c = (o.currency || DEFAULT_FIAT).toUpperCase();
    const sum = o.order_items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
    map.set(c, (map.get(c) ?? 0) + sum);
  }
  if (map.size === 0) return formatCurrency(0, DEFAULT_FIAT);
  return [...map.entries()].map(([c, a]) => formatCurrency(a, c)).join(" · ");
}

/**
 * Show prices in USD when the stored currency is RWF (uses same rate as payments).
 * Other currencies pass through to Intl.
 */
export function formatDisplayMoney(amount: number, currency?: string | null): string {
  const c = (currency || DEFAULT_FIAT).toUpperCase();
  if (c === "RWF") {
    const usd = amount * getRwfToUsdRateForDisplay();
    return formatCurrency(usd, DEFAULT_FIAT);
  }
  return formatCurrency(amount, c);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

export function generateAffiliateUrl(
  baseUrl: string,
  linkCode: string
): string {
  return `${baseUrl}/ref/${linkCode}`;
}

export function calculateDiscount(
  price: number,
  compareAtPrice: number
): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function getStarRating(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

export const getInputValidationClasses = (
  hasError: boolean,
  className?: string
): string => {
  const baseClasses =
    "w-full placeholder:text-sm placeholder:text-gray-600 disabled:cursor-not-allowed placeholder:font-medium pl-10 pr-4 py-3 border rounded-sm transition-all duration-300 focus:outline-none focus:ring-2 bg-white";

  return cn(
    baseClasses,
    hasError
      ? "placeholder:text-red-500 bg-red-50 border-red-300 focus:border-red-500 focus:ring-red-200"
      : "hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 hover:border-gray-300",
    className
  );
};



// ─── Helpers ───────────────────────────────────────────────────────────────────

export function parseAttachments(raw: unknown): Attachment[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is Attachment =>
      typeof x === "object" &&
      x !== null &&
      "url" in x &&
      typeof (x as { url: unknown }).url === "string"
  );
}

export function deriveMessageType(
  atts: ChatAttachmentPayload[],
  body: string
): string {
  if (atts.length === 0) return "text";
  const allImg = atts.every((a) => a.mime.startsWith("image/"));
  const allAudio = atts.every((a) => a.mime.startsWith("audio/"));
  if (body.trim()) return "text";
  if (allImg) return "image";
  if (allAudio) return "audio";
  return "file";
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=opus",
  ])
    if (MediaRecorder.isTypeSupported(c)) return c;
  return "";
}