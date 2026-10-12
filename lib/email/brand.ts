export const EMAIL_ICONS = [
  "cart-check",
  "cart-plus",
  "mail-check",
  "shield-user",
  "shield-check",
  "lock",
  "bag",
  "card",
  "box",
  "calendar",
  "clock",
  "alert",
  "compass",
  "pin",
  "monitor",
  "chat",
  "chevron",
  "instagram",
  "tiktok",
  "linkedin",
] as const;

export type EmailIconName = (typeof EMAIL_ICONS)[number];

export const EMAIL_COLORS = {
  orange: "#FF5A1F",
  navy: "#111827",
  muted: "#64748B",
  faint: "#94A3B8",
  canvas: "#F4F7FB",
  white: "#FFFFFF",
  line: "#E7EDF4",
  peach: "#FFF6F1",
  peachBorder: "#FFE6D8",
  iconPeach: "#FFF1E8",
  link: "#2563EB",
} as const;

export { JIMVIO_SOCIAL_LINKS as EMAIL_SOCIAL } from "../brand/social";

/** Public origin for images inside email HTML. Never a deployment URL or localhost. */
export const EMAIL_ASSET_ORIGIN = "https://www.jimvio.com";

export function emailAssetBase(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return EMAIL_ASSET_ORIGIN;
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function emailIconUrl(base: string, name: EmailIconName): string {
  return `${base.replace(/\/$/, "")}/email/icons/${name}.png`;
}

export function absoluteAppUrl(pathOrUrl: string, base = emailAssetBase()): string {
  const value = pathOrUrl.trim();
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\//i.test(value)) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value}`;
}
