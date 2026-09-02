/**
 * Strip supplier branding from text shown to buyers on the storefront, checkout, and orders.
 * Internal code may still use `source === "cj"` — only user-visible copy is sanitized here.
 */

const DROPSHIP_RE = /\bdropship(ping|per|ment)?\b/gi;
const CJ_DROPSHIPPING_RE = /\bcj\s*dropshipping\b/gi;
const CJ_WAREHOUSE_RE = /\bcj\s*warehouse\b/gi;
const CJ_PACKET_RE = /\bcj\s*packet\b/gi;
const CJ_WORD_RE = /\bCJ\b/gi;
const CJ_PREFIX_RE = /\bcj[_-][a-z0-9]+/gi;
const CJ_DOMAIN_RE = /https?:\/\/[^\s"'<>]*cjdropshipping[^\s"'<>]*/gi;
const CJ_DOMAIN_IN_HREF_RE =
  /<a\b[^>]*href=["'][^"']*cjdropshipping[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

function collapseWhitespace(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}

/** Returns true if text still contains supplier branding after basic cleanup. */
export function containsSupplierBranding(text: string): boolean {
  return (
    /\bcj\s*dropshipping\b/i.test(text) ||
    /\bcj\s*warehouse\b/i.test(text) ||
    /\bcj\s*packet\b/i.test(text) ||
    /\bCJ\b/.test(text) ||
    /\bcj[_-][a-z0-9]+/i.test(text) ||
    /\bdropship(ping|per|ment)?\b/i.test(text) ||
    /cjdropshipping/i.test(text)
  );
}

function stripSupplierBranding(text: string): string {
  return collapseWhitespace(
    text
      .replace(CJ_DROPSHIPPING_RE, "")
      .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
      .replace(CJ_PACKET_RE, "International")
      .replace(CJ_PREFIX_RE, "")
      .replace(CJ_WORD_RE, "")
      .replace(DROPSHIP_RE, "")
      .replace(CJ_DOMAIN_RE, ""),
  );
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
  if (!raw?.trim()) return "";

  const label = stripSupplierBranding(raw.trim());
  if (!label || containsSupplierBranding(label)) return "";
  return label;
}

/** Neutral tracking / carrier status shown on buyer order pages. */
export function sanitizeTrackingStatus(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const cleaned = sanitizeSupplierFacingText(raw);
  return cleaned || null;
}

/** Generic sanitizer for short labels (carriers, badges, etc.). */
export function sanitizeSupplierFacingText(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  const text = raw.trim()
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_PACKET_RE, "International")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "")
    .replace(CJ_DOMAIN_RE, "");

  return collapseWhitespace(text);
}

/**
 * Remove supplier branding from product description HTML before render.
 * Image tags (including CJ CDNs such as cf.cjdropshipping.com) are preserved
 * so description photos keep rendering.
 */
function preserveDescriptionImageTag(tag: string): string {
  if (!/\bsrc\s*=/i.test(tag)) return tag;
  if (/src\s*=\s*["']?\s*javascript:/i.test(tag)) return "";
  let next = tag;
  if (!/\breferrerpolicy=/i.test(next)) {
    next = next.replace(/<img\b/i, '<img referrerpolicy="no-referrer"');
  }
  if (!/\bloading=/i.test(next)) {
    next = next.replace(/<img\b/i, '<img loading="lazy"');
  }
  return next;
}

export function sanitizeProductDescriptionHtml(html: string): string {
  if (!html) return "";

  let source = html.replace(/&lt;img\b([^&]*?)(?:\/\s*)?&gt;/gi, "<img$1>");

  const preservedImages: string[] = [];
  let out = source.replace(/<img\b[^>]*>/gi, (tag) => {
    preservedImages.push(preserveDescriptionImageTag(tag));
    return `__JIMVIO_DESC_IMG_${preservedImages.length - 1}__`;
  });

  out = out
    .replace(CJ_DOMAIN_IN_HREF_RE, "$1")
    .replace(CJ_DOMAIN_RE, "")
    .replace(CJ_DROPSHIPPING_RE, "")
    .replace(CJ_WAREHOUSE_RE, "Fulfillment center")
    .replace(CJ_PACKET_RE, "International")
    .replace(CJ_WORD_RE, "")
    .replace(DROPSHIP_RE, "");

  out = out.replace(/__JIMVIO_DESC_IMG_(\d+)__/g, (_, index) => {
    return preservedImages[Number(index)] ?? "";
  });

  return out.trim();
}
