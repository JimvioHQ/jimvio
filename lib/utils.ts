import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

/** Format a numeric amount; default display currency is USD. */
export function formatCurrency(amount: number, currency = DEFAULT_FIAT): string {
  if (currency === "RWF") {
    return `RWF ${amount.toLocaleString("en-RW")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.length === 3 ? currency : DEFAULT_FIAT,
  }).format(amount);
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
