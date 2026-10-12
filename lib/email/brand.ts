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

export const EMAIL_SOCIAL = [
  { name: "instagram" as const, label: "Instagram", href: "https://www.instagram.com/jimvio_official" },
  { name: "tiktok" as const, label: "TikTok", href: "https://www.tiktok.com/@jimvio_official" },
  { name: "linkedin" as const, label: "LinkedIn", href: "https://www.linkedin.com/company/jimvio/" },
] as const;

export function emailAssetBase(explicit?: string): string {
  const raw =
    explicit ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" ? "https://www.jimvio.com" : "http://localhost:3000");
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
