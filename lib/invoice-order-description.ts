/**
 * NOWPayments invoice `order_description` — shown in their hosted UI (often under details).
 * Keep under ~512 chars to avoid API rejection.
 */
export function buildNowPaymentsOrderDescription(
  orderNumber: string | null | undefined,
  items: { product_name: string | null | undefined; quantity: number | null | undefined }[],
  maxLen = 512
): string {
  const num = orderNumber?.trim() || "Order";
  if (!items?.length) {
    return `Jimvio ${num}`;
  }
  const parts = items.map((i) => {
    const name = (i.product_name || "Item").replace(/\s+/g, " ").trim();
    const q = Math.max(1, Number(i.quantity) || 1);
    return `${name} ×${q}`;
  });
  let line = `Jimvio ${num}: ${parts.join("; ")}`;
  if (line.length <= maxLen) return line;
  return `${line.slice(0, Math.max(0, maxLen - 1))}…`;
}
