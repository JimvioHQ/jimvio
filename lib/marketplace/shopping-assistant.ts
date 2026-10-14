export const SHOPPING_MESSAGE_MAX = 500;

export type GroundedShoppingProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  currency?: string | null;
  product_type?: string | null;
};

const BROAD_MESSAGE =
  /^(hi|hello|hey|help|shop|shopping|products?|something|anything|recommend|recommendations?|what should i buy)[.!?]*$/i;

export function sanitizeShoppingMessage(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/[\u0000-\u001F]/g, "").trim().slice(0, SHOPPING_MESSAGE_MAX);
}

export function isBroadShoppingQuestion(message: string): boolean {
  const text = sanitizeShoppingMessage(message);
  if (text.length < 12) return true;
  return BROAD_MESSAGE.test(text);
}

export function shoppingAssistantSystemPrompt(): string {
  return [
    "You are the Jimvio Marketplace shopping assistant.",
    "Help shoppers find products, compare options, understand categories and prices, and use Jimvio.",
    "Only recommend products from the grounded catalog list. Never invent availability, prices, stock, or links.",
    "If the catalog list is empty or the request is too broad, ask one short clarifying question.",
    "Keep the reply under 90 words. Mention a product name only when it appears in the catalog list.",
    "Do not claim an answer succeeded if you cannot use the catalog.",
  ].join(" ");
}

export function groundedCatalogBlock(products: GroundedShoppingProduct[]): string {
  if (products.length === 0) {
    return "Grounded catalog: none. Do not recommend specific products.";
  }
  const lines = products.slice(0, 6).map((product) => {
    const price = product.price == null ? "price unavailable" : `${product.currency ?? "USD"} ${product.price}`;
    return `- ${product.name} | ${price} | /marketplace/${product.slug}`;
  });
  return `Grounded catalog (only these products may be recommended):\n${lines.join("\n")}`;
}
