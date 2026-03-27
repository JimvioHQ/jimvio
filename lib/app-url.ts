/**
 * Canonical public site origin for redirects (emails, OAuth, password reset).
 * Set NEXT_PUBLIC_APP_URL per environment: http://localhost:3000 locally, https://jimvio.com in production.
 * Must match Supabase Auth → URL Configuration → Redirect URLs.
 */
export function getPublicAppUrl(): string {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL?.trim() : "";
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}
