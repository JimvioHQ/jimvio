export function getPublicAppUrl(): string {
  // 1. Explicit environment variable (highest priority)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");

  // 2. Client-side browser detection
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 3. Vercel environment detection
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, "")}`;
  }

  // 4. Local development fallback
  return "http://localhost:3000";
}
