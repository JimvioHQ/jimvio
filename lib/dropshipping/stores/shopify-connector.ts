import type {
  NormalizedInboundOrder,
  PublishProductInput,
  PublishedProduct,
  StoreConnector,
  StoreFulfillmentUpdate,
  StoreInventoryUpdate,
  StorePriceUpdate,
} from "./types";

type ShopifyClientConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
};

/**
 * Shopify store connector using Admin REST + modern fulfillment orders flow.
 * Access tokens never leave the server.
 */
export class ShopifyStoreConnector implements StoreConnector {
  readonly platform = "shopify" as const;
  readonly displayName = "Shopify";

  constructor(private readonly cfg: ShopifyClientConfig) {}

  private baseUrl(): string {
    const domain = this.cfg.shopDomain.replace(/^https?:\/\//, "").split("/")[0];
    return `https://${domain}/admin/api/${this.cfg.apiVersion}`;
  }

  private async adminFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.cfg.accessToken,
        ...(init?.headers ?? {}),
      },
    });
  }

  async testConnection() {
    const res = await this.adminFetch("/shop.json");
    if (!res.ok) {
      return {
        ok: false,
        error:
          res.status === 401
            ? "Shopify connection expired. Reconnect your store."
            : "Shopify connection test failed. Check credentials and try again.",
      };
    }
    const json = (await res.json()) as { shop?: { name?: string } };
    return { ok: true, shopName: json.shop?.name };
  }

  async publishProduct(input: PublishProductInput): Promise<PublishedProduct> {
    const options = (input.options ?? []).slice(0, 3).map((name) => ({ name }));
    const variants = input.variants.map((v) => {
      const optionValues = Object.values(v.options ?? {});
      return {
        sku: v.sku ?? undefined,
        price: String(v.price),
        compare_at_price: v.compareAtPrice != null ? String(v.compareAtPrice) : undefined,
        inventory_management: "shopify",
        inventory_quantity: v.inventory ?? 0,
        option1: optionValues[0],
        option2: optionValues[1],
        option3: optionValues[2],
        weight: v.weightGrams != null ? v.weightGrams / 1000 : undefined,
        weight_unit: "kg",
        metafields: v.jimvioVariantId
          ? [
              {
                namespace: "jimvio",
                key: "variant_id",
                value: v.jimvioVariantId,
                type: "single_line_text_field",
              },
            ]
          : undefined,
      };
    });

    const body = {
      product: {
        title: input.title,
        body_html: input.descriptionHtml,
        options: options.length ? options : undefined,
        variants,
        images: input.images.map((src) => ({ src })),
        status: "active",
      },
    };

    const res = await this.adminFetch("/products.json", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (json as { errors?: string })?.errors
          ? `Shopify product publish failed: ${JSON.stringify((json as { errors: unknown }).errors)}`
          : "Shopify product publish failed."
      );
    }

    const product = (json as { product?: Record<string, unknown> }).product;
    if (!product?.id) throw new Error("Shopify did not return a product id.");

    const storeVariants = (product.variants as Array<Record<string, unknown>>) ?? [];
    return {
      storeProductId: String(product.id),
      handle: (product.handle as string) ?? null,
      storeVariantIds: storeVariants.map((sv, i) => ({
        storeVariantId: String(sv.id),
        jimvioVariantId: input.variants[i]?.jimvioVariantId ?? null,
        sku: (sv.sku as string) ?? null,
      })),
    };
  }

  async updateInventory(updates: StoreInventoryUpdate[]): Promise<void> {
    for (const u of updates) {
      const variantRes = await this.adminFetch(`/variants/${u.storeVariantId}.json`);
      if (!variantRes.ok) {
        throw new Error(
          `Shopify variant ${u.storeVariantId} not found for inventory update.`
        );
      }
      const variantJson = (await variantRes.json()) as {
        variant?: { inventory_item_id?: number };
      };
      const inventoryItemId = variantJson.variant?.inventory_item_id;
      if (!inventoryItemId) continue;

      const locationsRes = await this.adminFetch("/locations.json");
      const locationsJson = (await locationsRes.json()) as {
        locations?: Array<{ id: number }>;
      };
      const locationId = locationsJson.locations?.[0]?.id;
      if (!locationId) {
        throw new Error("Shopify has no inventory locations configured.");
      }

      const setRes = await this.adminFetch("/inventory_levels/set.json", {
        method: "POST",
        body: JSON.stringify({
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available: Math.max(0, Math.floor(u.quantity)),
        }),
      });
      if (!setRes.ok) {
        throw new Error("Shopify inventory update failed.");
      }
    }
  }

  async updatePrices(updates: StorePriceUpdate[]): Promise<void> {
    for (const u of updates) {
      const res = await this.adminFetch(`/variants/${u.storeVariantId}.json`, {
        method: "PUT",
        body: JSON.stringify({
          variant: {
            id: Number(u.storeVariantId),
            price: String(u.price),
            compare_at_price:
              u.compareAtPrice != null ? String(u.compareAtPrice) : undefined,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`Shopify price update failed for variant ${u.storeVariantId}.`);
      }
    }
  }

  /**
   * Uses Fulfillment Orders API (modern). Handles multiple fulfillment orders /
   * delivery groups — does not assume a single fulfillment group.
   */
  async createFulfillment(update: StoreFulfillmentUpdate): Promise<{ fulfillmentId?: string }> {
    const orderId = update.externalOrderId;
    const foRes = await this.adminFetch(`/orders/${orderId}/fulfillment_orders.json`);
    if (!foRes.ok) {
      throw new Error("Could not load Shopify fulfillment orders for this order.");
    }
    const foJson = (await foRes.json()) as {
      fulfillment_orders?: Array<{
        id: number;
        status: string;
        line_items?: Array<{ id: number; quantity: number; variant_id?: number }>;
      }>;
    };

    const openOrders = (foJson.fulfillment_orders ?? []).filter((fo) =>
      ["open", "in_progress", "scheduled"].includes(fo.status)
    );
    if (!openOrders.length) {
      return {};
    }

    let lastFulfillmentId: string | undefined;

    for (const fo of openOrders) {
      const lineItems = (fo.line_items ?? []).map((li) => ({
        id: li.id,
        quantity: li.quantity,
      }));
      if (!lineItems.length) continue;

      const res = await this.adminFetch("/fulfillments.json", {
        method: "POST",
        body: JSON.stringify({
          fulfillment: {
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id: fo.id,
                fulfillment_order_line_items: lineItems,
              },
            ],
            tracking_info: {
              number: update.trackingNumber ?? undefined,
              url: update.trackingUrl ?? undefined,
              company: update.trackingCompany ?? undefined,
            },
            notify_customer: update.notifyCustomer ?? true,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error("Shopify fulfillment create failed.");
      }
      const fid = (json as { fulfillment?: { id?: number } }).fulfillment?.id;
      if (fid) lastFulfillmentId = String(fid);
    }

    return { fulfillmentId: lastFulfillmentId };
  }

  normalizeOrder(payload: Record<string, unknown>): NormalizedInboundOrder {
    const lineItems = (payload.line_items as Array<Record<string, unknown>>) ?? [];
    return {
      externalOrderId: String(payload.id ?? ""),
      externalOrderNumber: payload.order_number != null ? String(payload.order_number) : null,
      email: (payload.email as string) ?? null,
      phone: (payload.phone as string) ?? null,
      currency: String(payload.currency ?? "USD"),
      subtotal: Number(payload.subtotal_price ?? 0),
      shippingAmount: Number(
        (payload.total_shipping_price_set as { shop_money?: { amount?: string } })?.shop_money
          ?.amount ?? payload.shipping_lines
          ? ((payload.shipping_lines as Array<{ price?: string }>) ?? []).reduce(
              (s, l) => s + Number(l.price ?? 0),
              0
            )
          : 0
      ),
      taxAmount: Number(payload.total_tax ?? 0),
      discountAmount: Number(payload.total_discounts ?? 0),
      total: Number(payload.total_price ?? 0),
      shippingAddress: (payload.shipping_address as Record<string, unknown>) ?? null,
      billingAddress: (payload.billing_address as Record<string, unknown>) ?? null,
      lineItems: lineItems.map((li) => ({
        storeProductId: li.product_id != null ? String(li.product_id) : null,
        storeVariantId: li.variant_id != null ? String(li.variant_id) : null,
        sku: (li.sku as string) ?? null,
        title: (li.title as string) ?? null,
        quantity: Number(li.quantity ?? 0),
        unitPrice: Number(li.price ?? 0),
        totalPrice: Number(li.price ?? 0) * Number(li.quantity ?? 0),
      })),
      rawPayload: payload,
    };
  }
}
