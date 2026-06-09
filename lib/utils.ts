import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Attachment } from "@/types";
import { RangeKey, RANGES } from "@/components/ui/admin";
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


export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

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
export type ImageInput =
  | string[]
  | { url?: string; src?: string }[]
  | string
  | null
  | undefined;

// export function normalizeImages(input: ImageInput): string[] {
//   if (!input) return [];

//   // Already an array — coerce each element to a usable URL
//   if (Array.isArray(input)) {
//     return input
//       .map((item) => {
//         if (typeof item === "string") return item;
//         if (item && typeof item === "object") {
//           return item.url ?? item.src ?? "";
//         }
//         return "";
//       })
//       .filter((u): u is string => typeof u === "string" && u.length > 0);
//   }

//   if (typeof input === "string") {
//     const trimmed = input.trim();
//     if (!trimmed) return [];
//     if (trimmed.startsWith("[") || trimmed.startsWith("{") || trimmed.startsWith('"')) {
//       try {
//         const parsed = JSON.parse(trimmed);
//         return normalizeImages(parsed);
//       } catch {
//       }
//     }

//     return [trimmed];
//   }

//   return [];
// }

export function isRenderableImageSrc(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  if (t === "[object Object]" || t === "null" || t === "undefined") return false;
  if (t.startsWith("/")) return true;
  if (t.startsWith("data:") || t.startsWith("blob:")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveRange(input: string | undefined): RangeKey {
  if (input && input in RANGES) return input as RangeKey;
  return "mtd";
}

export function absoluteTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function relativeTime(iso: string | null): string {
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

export async function downloadFile(id: string) {
  const res = await fetch(`/api/files/${id}?download=1`);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = id;
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
}


export type ProductType = "physical" | "digital";
export type DeliveryTime = "fast" | "standard" | "economy";

export type FilterableListing = {
  name: string;
  price: string;
  category: string;
  shippingFrom: string;
  deliveryTime: DeliveryTime;
  type: ProductType;
  rating?: string;
};

export type AppliedFilters = {
  search: string;
  productType: ProductType;
  category: string;
  shippingFrom: string[];
  deliveryTimes: DeliveryTime[];
  priceRange: [number, number];
  minRating: number;
};

export const DEFAULT_FILTERS: AppliedFilters = {
  search: "",
  productType: "physical",
  category: "Trending Now",
  shippingFrom: [],
  deliveryTimes: [],
  priceRange: [0, 5000],
  minRating: 0,
};

export function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ""));
}

export function filterListings<T extends FilterableListing>(
  items: T[],
  filters: AppliedFilters,
): T[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (item.type !== filters.productType) return false;
    if (query && !item.name.toLowerCase().includes(query)) return false;
    if (
      filters.category !== "Trending Now" &&
      item.category !== filters.category
    ) {
      return false;
    }
    if (
      filters.shippingFrom.length > 0 &&
      !filters.shippingFrom.includes(item.shippingFrom)
    ) {
      return false;
    }
    if (
      filters.deliveryTimes.length > 0 &&
      !filters.deliveryTimes.includes(item.deliveryTime)
    ) {
      return false;
    }
    const price = parsePrice(item.price);
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
      return false;
    }
    if (filters.minRating > 0) {
      const rating = item.rating ? Number(item.rating) : 0;
      if (rating < filters.minRating) return false;
    }
    return true;
  });
}


export function normalizeImages(input: unknown): string[] {
  if (!input) return [];

  let arr: unknown[] = [];

  if (typeof input === "string") {
    // Legacy rows where JSONB was accidentally JSON.stringify'd before insert
    try {
      const parsed = JSON.parse(input);
      arr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Plain string URL
      return isRenderableUrl(input) ? [input] : [];
    }
  } else if (Array.isArray(input)) {
    arr = input;
  } else {
    return [];
  }

  return arr
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const url = o.url ?? o.src ?? o.image_url ?? o.imageUrl;
        return typeof url === "string" ? url.trim() : "";
      }
      return "";
    })
    .filter(isRenderableUrl);
}

export function isRenderableUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  if (t === "[object Object]" || t === "null" || t === "undefined") return false;
  if (t.startsWith("/")) return true;
  if (t.startsWith("data:") || t.startsWith("blob:")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns the best single image URL or a fallback */
export function getProductImage(images: unknown, fallback = "/placeholder.png"): string {
  const normalized = normalizeImages(images);
  // Prefer the image marked is_primary if original was an object array
  if (Array.isArray(images)) {
    const primary = (images as Record<string, unknown>[]).find(
      (item) => item && typeof item === "object" && item.is_primary === true,
    );
    if (primary) {
      const url = primary.url ?? primary.src;
      if (isRenderableUrl(url)) return url as string;
    }
  }
  return normalized[0] ?? fallback;
}

// ─── Shared types and pure helpers ───────────────────────────────────────────
// No server imports here — safe to import from both server and client components

export type DbProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: unknown;
  product_type: string;
  currency: string;
  status: string;
  is_flash_deal: boolean | null;
  discount_label: string | null;
  shipping_from: string | null;
  delivery_time: string | null;
  affiliate_commission_rate: number | null;
  view_count: number | null;
  sale_count: number | null;
  sold_count: number | null;
  claimed_pct: number | null;
  rating: number | null;
  review_count: number | null;
  is_free_shipping: boolean | null;
  category_id: string | null;
};

export function fmtPrice(amount: number | null | undefined): string {
  if (!amount) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function fmtCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}


export function getImage(images: unknown): string {
  if (!images) return "/placeholder.png";
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try { arr = JSON.parse(images); }
    catch { return isRenderableUrl(images) ? images : "/placeholder.png"; }
  } else if (Array.isArray(images)) {
    arr = images;
  } else {
    return "/placeholder.png";
  }
  const primary = arr.find(
    (x) => x && typeof x === "object" && (x as Record<string, unknown>).is_primary === true,
  );
  if (primary) {
    const u = (primary as Record<string, unknown>).url ?? (primary as Record<string, unknown>).src;
    if (isRenderableUrl(u)) return u as string;
  }
  for (const item of arr) {
    if (isRenderableUrl(item)) return item;
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (isRenderableUrl(u)) return u as string;
    }
  }
  return "/placeholder.png";
}

export function getDiscount(p: DbProduct): string {
  if (p.discount_label) return p.discount_label;
  if (p.compare_at_price && p.price && p.compare_at_price > p.price) {
    return `-${Math.round((1 - p.price / p.compare_at_price) * 100)}%`;
  }
  return "";
}