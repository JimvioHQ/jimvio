import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

/** Old product URLs ended with a supplier code ("…-cjbjpfmb00711"). */
const LEGACY_PRODUCT_PATH = /^\/marketplace\/((?:[a-z0-9-]+-)?cj[a-z0-9]{5,24})\/?$/i;

export function legacyProductSlug(pathname: string): string | null {
  const match = LEGACY_PRODUCT_PATH.exec(pathname);
  return match ? decodeURIComponent(match[1]!).toLowerCase() : null;
}

/**
 * Current slug for an old product address, so the request proxy can answer with
 * a real HTTP 308 before the page starts streaming. Any failure returns null and
 * the product page still redirects on its own.
 */
export async function currentProductSlug(oldSlug: string): Promise<string | null> {
  try {
    const url = `${getSupabaseUrl()}/rest/v1/product_slug_redirects?old_slug=eq.${encodeURIComponent(oldSlug)}&select=products(slug,status,is_active,deleted_at)&limit=1`;
    const key = getSupabaseSecretKey();
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ products?: { slug?: string | null } | null }>;
    const slug = rows[0]?.products?.slug;
    return typeof slug === "string" && slug && slug !== oldSlug ? slug : null;
  } catch {
    return null;
  }
}
