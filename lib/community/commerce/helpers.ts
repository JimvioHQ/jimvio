/**
 * Creator Commerce Engine — pure helpers (Phase 5).
 */

import type { Msg } from "@/types";
import type { CommerceEmbed, CommerceKind } from "./types";
import { COMMERCE_KINDS } from "./types";

export function isCommerceKind(v: unknown): v is CommerceKind {
  return typeof v === "string" && (COMMERCE_KINDS as readonly string[]).includes(v);
}

/** Read commerce embed from message metadata (supports legacy DM product shares). */
export function parseCommerceEmbed(m: Msg): CommerceEmbed | null {
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const raw = meta.commerce;
  if (raw && typeof raw === "object") {
    const c = raw as Record<string, unknown>;
    if (isCommerceKind(c.kind) && typeof c.id === "string" && typeof c.title === "string") {
      return c as CommerceEmbed;
    }
  }

  if (m.message_type === "product" && meta.product_id) {
    return {
      kind: "product",
      id: String(meta.product_id),
      title: String(meta.name ?? "Product"),
      price: typeof meta.price === "number" ? meta.price : Number(meta.price) || null,
      imageUrl: meta.image ? String(meta.image) : null,
      href: `/marketplace/${meta.slug ?? meta.product_id}`,
      currency: "RWF",
    };
  }

  if (meta.course_id && (m.message_type === "course" || meta.commerce_kind === "course")) {
    return {
      kind: "course",
      id: String(meta.course_id),
      title: String(meta.title ?? meta.name ?? "Course"),
      progress: typeof meta.progress === "number" ? meta.progress : null,
      lessons: typeof meta.lessons === "number" ? meta.lessons : null,
      instructor: meta.instructor ? String(meta.instructor) : null,
      href: meta.href ? String(meta.href) : null,
      imageUrl: meta.image ? String(meta.image) : null,
    };
  }

  return null;
}

export function isCommerceMessage(m: Msg): boolean {
  return parseCommerceEmbed(m) !== null;
}

export function commerceMessageMatchesQuery(m: Msg, q: string): boolean {
  const embed = parseCommerceEmbed(m);
  if (!embed) return false;
  if (!q) return true;
  const hay = [
    embed.title,
    embed.subtitle,
    embed.sellerName,
    embed.instructor,
    embed.affiliateCode,
    embed.couponCode,
    embed.kind,
    m.body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterMessagesByCommerceKind(
  messages: Msg[],
  kinds: CommerceKind[],
  query = ""
): Msg[] {
  const set = new Set(kinds);
  return messages.filter((m) => {
    const embed = parseCommerceEmbed(m);
    if (!embed || !set.has(embed.kind)) return false;
    return commerceMessageMatchesQuery(m, query);
  });
}

export function buildAffiliateLink(args: {
  baseHref: string;
  code: string;
  offerId?: string;
}): string {
  try {
    const url = new URL(
      args.baseHref,
      typeof window !== "undefined" ? window.location.origin : "https://jimvio.com"
    );
    url.searchParams.set("ref", args.code);
    if (args.offerId) url.searchParams.set("offer", args.offerId);
    return url.pathname + url.search;
  } catch {
    const sep = args.baseHref.includes("?") ? "&" : "?";
    return `${args.baseHref}${sep}ref=${encodeURIComponent(args.code)}`;
  }
}

export function formatCommercePrice(
  price: number | null | undefined,
  currency = "RWF"
): string {
  if (price == null || Number.isNaN(price)) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency === "RWF" ? "RWF" : currency,
      maximumFractionDigits: currency === "RWF" ? 0 : 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

export function discountPercent(
  price: number | null | undefined,
  compareAt: number | null | undefined
): number | null {
  if (price == null || compareAt == null || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function embedToLegacyProductMeta(embed: CommerceEmbed): Record<string, unknown> {
  return {
    commerce: embed,
    product_id: embed.kind === "product" || embed.kind === "marketplace_item" ? embed.id : undefined,
    slug: embed.href?.split("/").pop(),
    name: embed.title,
    price: embed.price,
    image: embed.imageUrl,
  };
}
