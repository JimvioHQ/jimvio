/**
 * Remove supplier/marketplace jargon from imported product titles (M-2).
 *
 * Supplier feeds (CJ) carry seller-side keywords that read as spam to
 * buyers: "European And American", "Hot Selling", "Wholesale",
 * "AliExpress", "Amazon", "Ins Style", "Qixi", "Foreign Trade"…
 * Mirrors the production clean-up migration 20261028165842 so new imports
 * arrive clean.
 */
const SUPPLIER_JARGON =
  /(european and american|europe and the united states|cross[- ]border|foreign trade|explosion models?|factory direct sales of|selling hot selling|hot selling|hot sale|wholesale|ins style|\bins\b|net red|aliexpress|amazon|\bwish\b|best sellers?|spot goods|han guo yin|qixi)/gi;

export function cleanSupplierProductName(raw: string): string {
  const original = (raw ?? "").trim();
  const cleaned = original
    .replace(SUPPLIER_JARGON, "")
    .replace(/\s*[,;/]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned.length < 8) return original;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
