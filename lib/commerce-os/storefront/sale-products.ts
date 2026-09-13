import { salePercent } from "./money";

export type PricedProduct = {
  id: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
};

/** Products with a valid compare-at price higher than the current price. */
export function productsOnSale<T extends PricedProduct>(products: T[]): T[] {
  return products.filter((p) => salePercent(p.price, p.compare_at_price) != null);
}
