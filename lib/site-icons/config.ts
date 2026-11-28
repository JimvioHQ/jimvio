export type SiteIconDefinition = {
  key: string;
  label: string;
  group: "Browser" | "Apple & iOS" | "Android & PWA" | "Windows & Safari";
  filename: string;
  contentType: "image/png" | "image/svg+xml" | "image/x-icon";
  width: number;
  height: number;
  defaultPath: string;
  help: string;
};

export const SITE_ICON_BUCKET = "site-icons";
export const SITE_ICON_SETTING_KEY = "jimvio_site_icons";
export const SITE_ICON_MAX_BYTES = 1024 * 1024;

export const SITE_ICON_DEFINITIONS: SiteIconDefinition[] = [
  { key: "favicon-ico", label: "Classic favicon", group: "Browser", filename: "favicon.ico", contentType: "image/x-icon", width: 48, height: 48, defaultPath: "/icons/icon-48.png", help: "ICO file; 16, 32 and 48 px layers recommended." },
  { key: "favicon-svg", label: "SVG favicon", group: "Browser", filename: "favicon.svg", contentType: "image/svg+xml", width: 0, height: 0, defaultPath: "/icons/source/any.svg", help: "Sanitized square SVG mark." },
  { key: "favicon-16", label: "16 × 16 favicon", group: "Browser", filename: "icon-16.png", contentType: "image/png", width: 16, height: 16, defaultPath: "/icons/icon-16.png", help: "PNG, exactly 16 × 16." },
  { key: "favicon-32", label: "32 × 32 favicon", group: "Browser", filename: "icon-32.png", contentType: "image/png", width: 32, height: 32, defaultPath: "/icons/icon-32.png", help: "PNG, exactly 32 × 32." },
  { key: "favicon-48", label: "48 × 48 favicon", group: "Browser", filename: "icon-48.png", contentType: "image/png", width: 48, height: 48, defaultPath: "/icons/icon-48.png", help: "PNG, exactly 48 × 48." },
  { key: "icon-24", label: "24 × 24 icon", group: "Browser", filename: "icon-24.png", contentType: "image/png", width: 24, height: 24, defaultPath: "/icons/icon-24.png", help: "PNG, exactly 24 × 24." },
  { key: "icon-64", label: "64 × 64 icon", group: "Browser", filename: "icon-64.png", contentType: "image/png", width: 64, height: 64, defaultPath: "/icons/icon-64.png", help: "PNG, exactly 64 × 64." },
  { key: "icon-72", label: "72 × 72 icon", group: "Browser", filename: "icon-72.png", contentType: "image/png", width: 72, height: 72, defaultPath: "/icons/icon-72.png", help: "PNG, exactly 72 × 72." },
  { key: "icon-96", label: "96 × 96 icon", group: "Browser", filename: "icon-96.png", contentType: "image/png", width: 96, height: 96, defaultPath: "/icons/icon-96.png", help: "PNG, exactly 96 × 96." },
  { key: "icon-128", label: "128 × 128 icon", group: "Browser", filename: "icon-128.png", contentType: "image/png", width: 128, height: 128, defaultPath: "/icons/icon-128.png", help: "PNG, exactly 128 × 128." },
  { key: "icon-144", label: "144 × 144 icon", group: "Browser", filename: "icon-144.png", contentType: "image/png", width: 144, height: 144, defaultPath: "/icons/icon-144.png", help: "PNG, exactly 144 × 144." },
  { key: "icon-256", label: "256 × 256 icon", group: "Browser", filename: "icon-256.png", contentType: "image/png", width: 256, height: 256, defaultPath: "/icons/icon-256.png", help: "PNG, exactly 256 × 256." },
  { key: "icon-180", label: "180 × 180 icon", group: "Apple & iOS", filename: "icon-180.png", contentType: "image/png", width: 180, height: 180, defaultPath: "/icons/icon-180.png", help: "PNG, exactly 180 × 180." },
  { key: "icon-1024", label: "1024 × 1024 master icon", group: "Apple & iOS", filename: "icon-1024.png", contentType: "image/png", width: 1024, height: 1024, defaultPath: "/icons/icon-1024.png", help: "PNG, exactly 1024 × 1024." },
  { key: "apple-touch", label: "Apple Touch Icon", group: "Apple & iOS", filename: "apple-touch-icon.png", contentType: "image/png", width: 180, height: 180, defaultPath: "/icons/apple-touch-icon.png", help: "PNG, exactly 180 × 180; rounded artwork is optional." },
  { key: "apple-152", label: "Apple iPad icon", group: "Apple & iOS", filename: "icon-152.png", contentType: "image/png", width: 152, height: 152, defaultPath: "/icons/icon-152.png", help: "PNG, exactly 152 × 152." },
  { key: "apple-167", label: "Apple iPad Pro icon", group: "Apple & iOS", filename: "icon-167.png", contentType: "image/png", width: 167, height: 167, defaultPath: "/icons/icon-167.png", help: "PNG, exactly 167 × 167." },
  { key: "pwa-192", label: "PWA / Android 192", group: "Android & PWA", filename: "icon-192.png", contentType: "image/png", width: 192, height: 192, defaultPath: "/icons/icon-192.png", help: "PNG, exactly 192 × 192." },
  { key: "pwa-384", label: "PWA 384", group: "Android & PWA", filename: "icon-384.png", contentType: "image/png", width: 384, height: 384, defaultPath: "/icons/icon-384.png", help: "PNG, exactly 384 × 384." },
  { key: "pwa-512", label: "PWA / Android 512", group: "Android & PWA", filename: "icon-512.png", contentType: "image/png", width: 512, height: 512, defaultPath: "/icons/icon-512.png", help: "PNG, exactly 512 × 512." },
  { key: "pwa-maskable-192", label: "Maskable 192", group: "Android & PWA", filename: "maskable-192.png", contentType: "image/png", width: 192, height: 192, defaultPath: "/icons/maskable-192.png", help: "PNG, 192 × 192; keep the logo inside the safe central zone." },
  { key: "pwa-maskable-512", label: "Maskable 512", group: "Android & PWA", filename: "maskable-512.png", contentType: "image/png", width: 512, height: 512, defaultPath: "/icons/maskable-512.png", help: "PNG, 512 × 512; keep the logo inside the safe central zone." },
  { key: "pwa-mono-192", label: "Monochrome 192", group: "Android & PWA", filename: "monochrome-192.png", contentType: "image/png", width: 192, height: 192, defaultPath: "/icons/monochrome-192.png", help: "Single-colour PNG, 192 × 192." },
  { key: "pwa-mono-512", label: "Monochrome 512", group: "Android & PWA", filename: "monochrome-512.png", contentType: "image/png", width: 512, height: 512, defaultPath: "/icons/monochrome-512.png", help: "Single-colour PNG, 512 × 512." },
  { key: "android-background-432", label: "Android adaptive background", group: "Android & PWA", filename: "android-background-432.png", contentType: "image/png", width: 432, height: 432, defaultPath: "/icons/android-background-432.png", help: "PNG, 432 × 432; background layer only." },
  { key: "android-foreground-432", label: "Android adaptive foreground", group: "Android & PWA", filename: "android-foreground-432.png", contentType: "image/png", width: 432, height: 432, defaultPath: "/icons/android-foreground-432.png", help: "Transparent PNG, 432 × 432; foreground mark only." },
  { key: "android-mono-432", label: "Android adaptive monochrome", group: "Android & PWA", filename: "android-monochrome-432.png", contentType: "image/png", width: 432, height: 432, defaultPath: "/icons/android-monochrome-432.png", help: "Transparent monochrome PNG, 432 × 432." },
  { key: "android-preview-432", label: "Android adaptive preview", group: "Android & PWA", filename: "android-adaptive-preview-432.png", contentType: "image/png", width: 432, height: 432, defaultPath: "/icons/android-adaptive-preview-432.png", help: "PNG composite preview, exactly 432 × 432." },
  { key: "windows-tile", label: "Windows tile", group: "Windows & Safari", filename: "mstile-150x150.png", contentType: "image/png", width: 150, height: 150, defaultPath: "/icons/mstile-150x150.png", help: "PNG, exactly 150 × 150." },
  { key: "safari-pinned", label: "Safari pinned tab", group: "Windows & Safari", filename: "safari-pinned-tab.svg", contentType: "image/svg+xml", width: 0, height: 0, defaultPath: "/icons/source/safariPinned.svg", help: "Single-colour SVG suitable for Safari mask icon." },
];

export function getSiteIconDefinition(key: string) {
  return SITE_ICON_DEFINITIONS.find((item) => item.key === key) ?? null;
}
