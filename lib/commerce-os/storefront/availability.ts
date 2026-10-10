import { resolveStockStatus, type StockInput } from "@/lib/marketplace/stock-status";

/** Product cards never show a unit count. Out-of-stock is a badge, not a quantity. */
export function storefrontCardStockLine(): null {
  return null;
}

/** PDP label: availability only, never a raw inventory count. */
export function storefrontDetailAvailabilityLabel(input: StockInput): string {
  const stock = resolveStockStatus({ ...input, hideQuantity: true });
  if (stock.status === "out_of_stock") return "Out of stock";
  if (stock.status === "low_stock" || stock.status === "in_stock") {
    return stock.label || "In stock";
  }
  const track = input.track_inventory === true;
  const qty = input.inventory_quantity;
  if (track && typeof qty === "number" && qty <= 0 && !input.allow_backorder) {
    return "Out of stock";
  }
  return "In stock";
}
