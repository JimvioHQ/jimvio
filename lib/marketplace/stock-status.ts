/**
 * Centralized marketplace stock status for customer-facing UI.
 * Authoritative quantity: products.inventory_quantity / product_variants.inventory_quantity
 * (available = on_hand after holds are applied server-side at checkout).
 */
import { DEFAULT_PLATFORM_DEFAULTS } from "@/lib/platform-settings-shared";

export const DEFAULT_LOW_STOCK_THRESHOLD =
  DEFAULT_PLATFORM_DEFAULTS.low_stock_threshold;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export type StockInput = {
  inventory_quantity?: number | null;
  track_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  low_stock_threshold?: number | null;
  in_stock?: boolean | null;
  /** When true, hide quantity (e.g. some supplier catalogs). Status may still show. */
  hideQuantity?: boolean;
};

export type ResolvedStock = {
  status: StockStatus;
  available: number | null;
  threshold: number;
  label: string;
  compactLabel: string;
  showQuantity: boolean;
};

function resolveThreshold(raw: number | null | undefined): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return DEFAULT_LOW_STOCK_THRESHOLD;
}

/** Resolve available units from product or selected variant inventory. */
export function resolveAvailableQuantity(
  inventory_quantity: number | null | undefined,
): number | null {
  if (inventory_quantity == null) return null;
  const n = Number(inventory_quantity);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

export function resolveStockStatus(input: StockInput): ResolvedStock {
  const threshold = resolveThreshold(input.low_stock_threshold);
  const track = input.track_inventory !== false;
  const available = resolveAvailableQuantity(input.inventory_quantity);
  const hideQuantity = Boolean(input.hideQuantity);

  // Explicit out-of-stock flag from catalog
  if (input.in_stock === false) {
    return {
      status: "out_of_stock",
      available: available ?? 0,
      threshold,
      label: "Out of stock",
      compactLabel: "Out of stock",
      showQuantity: false,
    };
  }

  // Not tracking inventory → treat as available without inventing a count
  if (!track || available == null) {
    if (input.in_stock === true) {
      return {
        status: "in_stock",
        available: null,
        threshold,
        label: "In stock",
        compactLabel: "In stock",
        showQuantity: false,
      };
    }
    return {
      status: "unknown",
      available: null,
      threshold,
      label: "",
      compactLabel: "",
      showQuantity: false,
    };
  }

  if (available <= 0) {
    if (input.allow_backorder) {
      return {
        status: "in_stock",
        available: 0,
        threshold,
        label: "Available to order",
        compactLabel: "Available to order",
        showQuantity: false,
      };
    }
    return {
      status: "out_of_stock",
      available: 0,
      threshold,
      label: "Out of stock",
      compactLabel: "Out of stock",
      showQuantity: false,
    };
  }

  if (available <= threshold) {
    const label = hideQuantity
      ? "Low stock"
      : `Low stock · ${available} left`;
    return {
      status: "low_stock",
      available,
      threshold,
      label,
      compactLabel: label,
      showQuantity: !hideQuantity,
    };
  }

  const label = hideQuantity
    ? "In stock"
    : `In stock · ${available.toLocaleString()} available`;
  return {
    status: "in_stock",
    available,
    threshold,
    label,
    compactLabel: label,
    showQuantity: !hideQuantity,
  };
}

/** True when purchase should be blocked for stock reasons. */
export function isPurchaseBlockedByStock(input: StockInput): boolean {
  const resolved = resolveStockStatus(input);
  return resolved.status === "out_of_stock";
}

/** CJ / supplier catalogs that sync stock but historically hide raw counts. */
export function shouldHideStockQuantity(product: {
  source?: string | null;
}): boolean {
  return product.source === "cj";
}

/** Dropship-eligible marketplace products (CJ supplier catalog). */
export function isDropshipEligible(product: {
  source?: string | null;
}): boolean {
  return product.source === "cj";
}
