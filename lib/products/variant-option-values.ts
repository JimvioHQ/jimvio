/** Normalize CJ/Shopify variant option values for storefront UI. */

export function isInvalidOptionLabel(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (t === "[]" || t === "{}" || t === "null" || t === "undefined") return true;
  if (/^\[\s*\]$/.test(t) || /^\{\s*\}$/.test(t)) return true;
  return false;
}

export function sanitizeOptionValue(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => sanitizeOptionValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(" / ") : null;
  }
  if (typeof value === "object") return null;
  const trimmed = String(value).trim();
  if (isInvalidOptionLabel(trimmed)) return null;
  return trimmed;
}

export function sanitizeVariantOptions(
  raw: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "variant_key" || key.endsWith("_label")) continue;
    const clean = sanitizeOptionValue(value);
    if (clean) out[key] = clean;
  }
  return Object.keys(out).length > 0 ? out : null;
}
