function normalizeShopifyDomain(input: string): string {
  return String(input)
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

const MYSHOPIFY_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * Strict shop domain validation for OAuth / Admin API hosts.
 * Rejects protocol injection, paths, arbitrary domains, and non-myshopify hosts.
 */
export function assertValidShopifyShopDomain(
  input: string
): { ok: true; domain: string } | { ok: false; error: string } {
  const raw = String(input ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Shop domain is required." };
  }
  if (/[\s\r\n\0]/.test(raw)) {
    return { ok: false, error: "Shop domain contains invalid characters." };
  }
  if (/^(javascript|data|file|vbscript):/i.test(raw)) {
    return { ok: false, error: "Shop domain protocol is not allowed." };
  }
  if (raw.includes("@") || raw.includes("\\")) {
    return { ok: false, error: "Shop domain format is invalid." };
  }

  const domain = normalizeShopifyDomain(raw);
  if (!domain || domain.includes("/") || domain.includes("?") || domain.includes("#")) {
    return { ok: false, error: "Shop domain format is invalid." };
  }
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) {
    return { ok: false, error: "Shop domain hostname is invalid." };
  }
  if (!MYSHOPIFY_RE.test(domain)) {
    return {
      ok: false,
      error: "Use your Shopify store domain (example.myshopify.com).",
    };
  }
  return { ok: true, domain };
}

export function isValidShopifyShopDomain(input: string): boolean {
  return assertValidShopifyShopDomain(input).ok;
}
