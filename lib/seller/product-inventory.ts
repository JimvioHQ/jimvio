/**
 * Pure catalog rules for the seller My Products page.
 * Filters, stock, and sort use fields already stored on products.
 */

export const PRODUCT_FILTERS = [
  "All", "Active", "In review", "Rejected", "Paused", "Draft", "Archived",
  "Digital", "Physical", "Low Stock", "Out of Stock",
] as const;

export type ProductFilter = typeof PRODUCT_FILTERS[number];

export const PRIMARY_PRODUCT_FILTERS = ["All", "Active", "Paused", "Draft", "Archived"] as const;
export const TYPE_PRODUCT_FILTERS = ["Digital", "Physical", "Low Stock", "Out of Stock"] as const;
export const MORE_PRODUCT_FILTERS = ["In review", "Rejected"] as const;

export const PRODUCT_SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "Name A–Z" },
  { id: "price", label: "Price: high to low" },
  { id: "sales", label: "Most sales" },
  { id: "views", label: "Most views" },
] as const;

export type ProductSortKey = typeof PRODUCT_SORTS[number]["id"];

export const PRODUCT_PAGE_SIZES = [10, 24, 50] as const;

export type CatalogProduct = {
  name: string;
  slug: string;
  price: number | string;
  status: string | null;
  product_type: string | null;
  is_digital: boolean | null;
  inventory_quantity: number | null;
  sale_count: number | null;
  view_count: number | null;
  created_at: string | null;
  updated_at?: string | null;
  track_inventory: boolean | null;
  low_stock_threshold: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  physical: "Physical",
  digital: "Digital",
  subscription: "Subscription",
  course: "Course",
  software: "Software",
  template: "Template",
  ebook: "Ebook",
  coaching: "Coaching",
  community: "Community",
  bundle: "Bundle",
};

export function isLowStock(product: CatalogProduct): boolean {
  if (product.is_digital || !product.track_inventory) return false;
  const threshold = product.low_stock_threshold ?? 5;
  const qty = product.inventory_quantity ?? 0;
  return qty <= threshold && qty > 0;
}

export function isOutOfStock(product: CatalogProduct): boolean {
  if (product.is_digital || !product.track_inventory) return false;
  return (product.inventory_quantity ?? 0) === 0;
}

export function productTypeLabel(product: CatalogProduct): string {
  if (product.is_digital) {
    if (product.product_type && product.product_type !== "physical" && product.product_type !== "digital") {
      return TYPE_LABEL[product.product_type] ?? "Digital";
    }
    return "Digital";
  }
  if (product.product_type && TYPE_LABEL[product.product_type]) return TYPE_LABEL[product.product_type];
  return "Physical";
}

export function stockText(product: CatalogProduct): string {
  if (product.is_digital || !product.track_inventory) return "—";
  const qty = product.inventory_quantity ?? 0;
  if (isOutOfStock(product)) return "Out of stock";
  if (isLowStock(product)) return `Low · ${qty}`;
  return String(qty);
}

export function formatCatalogDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function matchesProductSearch(product: CatalogProduct, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return product.name.toLowerCase().includes(query) || product.slug.toLowerCase().includes(query);
}

export function matchesProductFilter(product: CatalogProduct, filter: ProductFilter): boolean {
  switch (filter) {
    case "All": return true;
    case "Active": return product.status === "active";
    case "In review": return product.status === "pending_review";
    case "Rejected": return product.status === "rejected";
    case "Paused": return product.status === "paused";
    case "Draft": return product.status === "draft";
    case "Archived": return product.status === "archived";
    case "Digital": return Boolean(product.is_digital);
    case "Physical": return !product.is_digital;
    case "Low Stock": return isLowStock(product);
    case "Out of Stock": return isOutOfStock(product);
    default: return true;
  }
}

function catalogTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function compareCatalogProducts(sort: ProductSortKey) {
  return (a: CatalogProduct, b: CatalogProduct) => {
    switch (sort) {
      case "oldest":
        return catalogTime(a.created_at) - catalogTime(b.created_at);
      case "name":
        return a.name.localeCompare(b.name);
      case "price":
        return Number(b.price) - Number(a.price);
      case "sales":
        return (b.sale_count ?? 0) - (a.sale_count ?? 0);
      case "views":
        return (b.view_count ?? 0) - (a.view_count ?? 0);
      default:
        return catalogTime(b.created_at) - catalogTime(a.created_at);
    }
  };
}

export function countProductFilters(products: CatalogProduct[]): Record<ProductFilter, number> {
  const searched = products;
  const counts = {} as Record<ProductFilter, number>;
  for (const filter of PRODUCT_FILTERS) {
    counts[filter] = filter === "All"
      ? searched.length
      : searched.filter((product) => matchesProductFilter(product, filter)).length;
  }
  return counts;
}

export function showingProductsLabel(input: {
  productCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  loadFailed: boolean;
}): string {
  if (input.loadFailed && input.productCount === 0) return "Products unavailable";
  if (input.filteredCount === 0) return `Showing 0 of ${input.productCount} products`;
  const totalPages = Math.max(1, Math.ceil(input.filteredCount / input.pageSize));
  const safePage = Math.min(Math.max(input.page, 1), totalPages);
  const start = (safePage - 1) * input.pageSize + 1;
  const end = Math.min(safePage * input.pageSize, input.filteredCount);
  return `Showing ${start}–${end} of ${input.filteredCount} products`;
}
