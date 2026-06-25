/**
 * Strip supplier branding from text shown to buyers on the storefront, checkout, and orders.
 * Internal code may still use `source === "cj"` — only user-visible copy is sanitized here.
 */

const DROPSHIP_RE = /\bdropship(ping|per|ment)?\b/gi;
const CJ_DROPSHIPPING_RE = /\bcj\s*dropshipping\b/gi;
const CJ_WAREHOUSE_RE = /\bcj\s*warehouse\b/gi;
const CJ_PACKET_RE = /\bcj\s*packet\b/gi;
const CJ_WORD_RE = /\bCJ\b/g;
const CJ_DOMAIN_RE = /https?:\/\/[^\s"'<>]*cjdropshipping[^\s"'<>]*/gi;
const CJ_DOMAIN_IN_HREF_RE =
  /<a\b[^>]*href=["'][^"']*cjdropshipping[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

function collapseWhitespace(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}

/** Neutral label for logistics methods returned by external fulfillment APIs. */
export function sanitizeShippingMethodName(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Standard Shipping";

  const normalized = raw.trim();

  if (/cjpacket\s+ordinary/i.test(normalized)) return "Economy International";
  if (/cjpacket\s+fast/i.test(normalized)) return "Express International";
  if (/cjpacket\s+registered/i.test(normalized)) return "Registered International";
  if (CJ_PACKET_RE.test(normalized)) {
    const rest = normalized.replace(CJ_PACKET_RE, "").trim();
    return rest ? `International ${rest}` : "International Shipping";
  }

  let name = normalized
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_PACKET_RE, "International")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "");

  name = collapseWhitespace(name);
  return name || "Standard Shipping";
}

/** Neutral copy for ship-from / warehouse labels on product pages. */
export function sanitizeShipFromLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";

  let label = raw.trim()
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "");

  label = collapseWhitespace(label);
  return label || "—";
}

/** Generic sanitizer for short labels (carriers, badges, etc.). */
export function sanitizeSupplierFacingText(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  let text = raw.trim()
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_PACKET_RE, "International")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "")
    .replace(CJ_DOMAIN_RE, "");

  return collapseWhitespace(text);
}

/** Remove supplier branding from product description HTML before render. */
export function sanitizeProductDescriptionHtml(html: string): string {
  if (!html) return "";

  let out = html
    .replace(CJ_DOMAIN_IN_HREF_RE, "$1")
    .replace(CJ_DOMAIN_RE, "")
    .replace(/cjdropshipping\.com/gi, "")
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_PACKET_RE, "International")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "");

  return out.trim();
}
