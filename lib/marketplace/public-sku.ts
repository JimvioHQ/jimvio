/** Supplier SKUs (e.g. "CJJT1636355-Red") reveal the supplier; buyers see none. */
export function publicSku(sku: string | null | undefined): string | null {
  const v = (sku ?? "").trim();
  if (!v || /^cj/i.test(v)) return null;
  return v;
}
