/**
 * Safe storefront navigation href validation.
 * Blocks javascript:/data:/vbscript: and keeps http(s) or relative paths.
 */

export type NavItem = {
  label: string;
  href: string;
};

const UNSAFE = /^(javascript|data|vbscript):/i;

export function isSafeNavHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (UNSAFE.test(value)) return false;
  if (value.startsWith("/")) return true;
  if (value.startsWith("#")) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeNavItems(items: unknown): NavItem[] {
  if (!Array.isArray(items)) return [];
  const out: NavItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const label =
      typeof (raw as { label?: unknown }).label === "string"
        ? (raw as { label: string }).label.trim()
        : "";
    const href =
      typeof (raw as { href?: unknown }).href === "string"
        ? (raw as { href: string }).href.trim()
        : "";
    if (!label || !href || !isSafeNavHref(href)) continue;
    out.push({ label: label.slice(0, 64), href: href.slice(0, 500) });
    if (out.length >= 24) break;
  }
  return out;
}

export function sanitizeSocialLinks(
  social: Record<string, unknown> | null | undefined
): Record<string, string> {
  const keys = [
    "instagram",
    "tiktok",
    "facebook",
    "youtube",
    "x",
    "twitter",
    "linkedin",
    "whatsapp",
  ] as const;
  const out: Record<string, string> = {};
  if (!social) return out;
  for (const key of keys) {
    const v = social[key];
    if (typeof v === "string" && isSafeNavHref(v)) {
      out[key] = v.trim().slice(0, 500);
    }
  }
  return out;
}
