/** Accept only http(s) tracking links. Never invent a carrier URL. */
export function safeTrackingHref(raw: string | null | undefined): string | null {
  const value = raw?.trim() || "";
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
