import type {
  NormalizedInboundOrder,
  PublishProductInput,
  PublishedProduct,
  StoreConnector,
  StoreFulfillmentUpdate,
  StoreInventoryUpdate,
  StorePriceUpdate,
} from "./types";

export function normalizeShopifyFinancialStatus(
  financialStatus: unknown,
  cancelledAt?: unknown
): "paid" | "pending" | "failed" | "refunded" | "cancelled" {
  const status = String(financialStatus ?? "").trim().toLowerCase();
  if (cancelledAt) {
    return status === "refunded" || status === "partially_refunded"
      ? "refunded"
      : "cancelled";
  }
  if (status === "paid") return "paid";
  if (status === "refunded" || status === "partially_refunded") return "refunded";
  if (status === "voided") return "cancelled";
  if (status === "failed") return "failed";
  // pending, authorized, partially_paid, unpaid and unknown states never fulfill.
  return "pending";
}

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

  /** Admin GraphQL — preferred for Product APIs (App Store / deprecation-safe). */
  private async adminGraphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const res = await this.adminFetch("/graphql.json", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: T;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || json.errors?.length) {
      const msg =
        json.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        "Shopify GraphQL request failed.";
      throw new Error(msg);
    }
    if (!json.data) throw new Error("Shopify GraphQL returned no data.");
    return json.data;
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

  /**
   * Publish via GraphQL Product APIs (productCreate + productVariantsBulkCreate).
   * Inventory quantities are applied afterward through updateInventory (location-aware).
   */
  async publishProduct(input: PublishProductInput): Promise<PublishedProduct> {
    const optionNames = (input.options ?? []).slice(0, 3);
    const productOptions =
      optionNames.length > 0
        ? optionNames.map((name) => {
            const values = new Set<string>();
            for (const v of input.variants) {
              const val = v.options?.[name];
              if (val) values.add(String(val));
            }
            if (!values.size) values.add("Default");
            return { name, values: [...values].map((v) => ({ name: v })) };
          })
        : undefined;

    const media = (input.images ?? [])
      .filter(Boolean)
      .slice(0, 20)
      .map((src) => ({
        originalSource: src,
        mediaContentType: "IMAGE" as const,
      }));

    type CreateResult = {
      productCreate: {
        product: {
          id: string;
          handle: string;
          legacyResourceId: string;
        } | null;
        userErrors: Array<{ field?: string[]; message: string }>;
      };
    };

    const createData = await this.adminGraphql<CreateResult>(
      `mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) {
          product { id handle legacyResourceId }
          userErrors { field message }
        }
      }`,
      {
        product: {
          title: input.title,
          descriptionHtml: input.descriptionHtml ?? undefined,
          status: "ACTIVE",
          productOptions,
        },
        media: media.length ? media : undefined,
      }
    );

    const createErrors = createData.productCreate.userErrors;
    if (createErrors?.length) {
      throw new Error(
        `Shopify product publish failed: ${createErrors.map((e) => e.message).join("; ")}`
      );
    }
    const product = createData.productCreate.product;
    if (!product?.id) throw new Error("Shopify did not return a product id.");

    const variantInputs = input.variants.map((v) => {
      const optionValues =
        optionNames.length > 0
          ? optionNames.map((name) => ({
              optionName: name,
              name: String(v.options?.[name] ?? "Default"),
            }))
          : [{ optionName: "Title", name: "Default Title" }];

      return {
        price: String(v.price),
        compareAtPrice:
          v.compareAtPrice != null ? String(v.compareAtPrice) : undefined,
        optionValues,
        inventoryItem: {
          sku: v.sku ?? undefined,
          tracked: true,
        },
        metafields: v.jimvioVariantId
          ? [
              {
                namespace: "jimvio",
                key: "variant_id",
                type: "single_line_text_field",
                value: v.jimvioVariantId,
              },
            ]
          : undefined,
      };
    });

    type BulkResult = {
      productVariantsBulkCreate: {
        productVariants: Array<{
          id: string;
          legacyResourceId: string;
          sku: string | null;
        }> | null;
        userErrors: Array<{ field?: string[]; message: string }>;
      };
    };

    const bulkData = await this.adminGraphql<BulkResult>(
      `mutation productVariantsBulkCreate(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
        $strategy: ProductVariantsBulkCreateStrategy
      ) {
        productVariantsBulkCreate(
          productId: $productId
          variants: $variants
          strategy: $strategy
        ) {
          productVariants { id legacyResourceId sku }
          userErrors { field message }
        }
      }`,
      {
        productId: product.id,
        strategy: "REMOVE_STANDALONE_VARIANT",
        variants: variantInputs,
      }
    );

    const bulkErrors = bulkData.productVariantsBulkCreate.userErrors;
    if (bulkErrors?.length) {
      throw new Error(
        `Shopify variant create failed: ${bulkErrors.map((e) => e.message).join("; ")}`
      );
    }

    const storeVariants = bulkData.productVariantsBulkCreate.productVariants ?? [];

    // Publish to Online Store so the product is sellable (productCreate defaults unpublished).
    await this.adminGraphql(
      `mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors { field message }
        }
      }`,
      {
        id: product.id,
        input: [{ publicationId: await this.getOnlineStorePublicationId() }],
      }
    ).catch(() => {
      // Non-fatal: merchant can publish manually if publication lookup fails
    });

    const published: PublishedProduct = {
      storeProductId: String(product.legacyResourceId || product.id.replace(/\D/g, "")),
      handle: product.handle ?? null,
      storeVariantIds: storeVariants.map((sv, i) => ({
        storeVariantId: String(sv.legacyResourceId || sv.id.replace(/\D/g, "")),
        jimvioVariantId: input.variants[i]?.jimvioVariantId ?? null,
        sku: sv.sku ?? input.variants[i]?.sku ?? null,
      })),
    };

    const inventoryUpdates = input.variants
      .map((v, i) => {
        const storeVariantId = published.storeVariantIds[i]?.storeVariantId;
        if (!storeVariantId || v.inventory == null) return null;
        return { storeVariantId, quantity: v.inventory };
      })
      .filter(Boolean) as Array<{ storeVariantId: string; quantity: number }>;

    if (inventoryUpdates.length) {
      await this.updateInventory(inventoryUpdates).catch(() => {
        // Inventory can be synced later via INVENTORY_SYNC jobs
      });
    }

    return published;
  }

  private async getOnlineStorePublicationId(): Promise<string> {
    type PubResult = {
      publications: {
        nodes: Array<{ id: string; name: string }>;
      };
    };
    const data = await this.adminGraphql<PubResult>(
      `query {
        publications(first: 20) {
          nodes { id name }
        }
      }`
    );
    const online =
      data.publications.nodes.find((p) => /online store/i.test(p.name)) ||
      data.publications.nodes[0];
    if (!online?.id) throw new Error("No Shopify publication found.");
    return online.id;
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
      const variantGid = u.storeVariantId.startsWith("gid://")
        ? u.storeVariantId
        : `gid://shopify/ProductVariant/${u.storeVariantId}`;

      type UpdateResult = {
        productVariantUpdate: {
          productVariant: { id: string } | null;
          userErrors: Array<{ message: string }>;
        };
      };

      const data = await this.adminGraphql<UpdateResult>(
        `mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant { id }
            userErrors { message }
          }
        }`,
        {
          input: {
            id: variantGid,
            price: String(u.price),
            compareAtPrice:
              u.compareAtPrice != null ? String(u.compareAtPrice) : undefined,
          },
        }
      );

      const errors = data.productVariantUpdate.userErrors;
      if (errors?.length) {
        throw new Error(
          `Shopify price update failed for variant ${u.storeVariantId}: ${errors
            .map((e) => e.message)
            .join("; ")}`
        );
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
      shippingAmount: (() => {
        const totalShipping = (
          payload.total_shipping_price_set as { shop_money?: { amount?: string } } | undefined
        )?.shop_money?.amount;
        if (totalShipping != null) return Number(totalShipping);
        return ((payload.shipping_lines as Array<{ price?: string }>) ?? []).reduce(
          (sum, line) => sum + Number(line.price ?? 0),
          0
        );
      })(),
      paymentStatus: normalizeShopifyFinancialStatus(
        payload.financial_status,
        payload.cancelled_at
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
