import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCjQuotaAvailableForBackground, noteCjQuotaIfPresent } from "@/lib/cj/quota-circuit";
import { usableCjVid } from "@/lib/cj/variant-vid";
import { submitCjOrderForLines } from "@/lib/sources/cj/submit-order";
import type {
  CreateSupplierOrderInput,
  GetShippingRatesInput,
  ShippingQuote,
  SupplierConnector,
  SupplierInventory,
  SupplierProduct,
  SupplierTracking,
  SupplierVariant,
} from "./types";

/**
 * CJ as Supplier Connector #1.
 * Wraps existing CJ auth, quota circuit, submit-order, inventory helpers.
 * Does NOT bypass quota protection or invent stock/shipping.
 */
export class CjSupplierConnector implements SupplierConnector {
  readonly code = "cj" as const;
  readonly displayName = "Jimvio Store";

  constructor(private readonly db: SupabaseClient) {}

  async getProduct(supplierProductId: string): Promise<SupplierProduct | null> {
    if (!(await assertCjQuotaAvailableForBackground())) {
      throw new Error(
        "Jimvio Store inventory is temporarily unavailable. Sync will retry automatically."
      );
    }
    const { getOrRefreshAccessToken } = await import("@/lib/cj/auth");
    const { CJ_BASE } = await import("@/lib/cj/client");
    const token = await getOrRefreshAccessToken();
    if (!token) return null;

    const res = await fetch(`${CJ_BASE}/product/query?pid=${encodeURIComponent(supplierProductId)}`, {
      headers: { "CJ-Access-Token": token },
    });
    const json = await res.json().catch(() => null);
    noteCjQuotaIfPresent(json);
    if (!res.ok || !json?.data) return null;

    const d = json.data as Record<string, unknown>;
    return {
      supplierCode: "cj",
      supplierProductId: String(d.pid ?? supplierProductId),
      title: String(d.productNameEn ?? d.productName ?? "Jimvio Store product"),
      descriptionHtml: (d.description as string) ?? null,
      images: Array.isArray(d.productImage)
        ? (d.productImage as string[])
        : typeof d.productImage === "string"
          ? [d.productImage]
          : [],
      cost: d.sellPrice != null ? Number(d.sellPrice) : null,
      currency: "USD",
      raw: d,
    };
  }

  async getVariants(supplierProductId: string): Promise<SupplierVariant[]> {
    if (!(await assertCjQuotaAvailableForBackground())) {
      throw new Error(
        "Jimvio Store inventory is temporarily unavailable. Sync will retry automatically."
      );
    }
    const product = await this.getProduct(supplierProductId);
    if (!product?.raw) return [];

    const variants = (product.raw.variants as Array<Record<string, unknown>>) ?? [];
    const mapped: SupplierVariant[] = [];
    for (const v of variants) {
      const vid = usableCjVid(v.vid) ?? usableCjVid(v.variantSku);
      if (!vid) continue;
      const inventories = Array.isArray(v.inventories) ? v.inventories : [];
      let stock = 0;
      for (const inv of inventories as Array<Record<string, unknown>>) {
        stock += Number(inv.totalInventory ?? inv.factoryInventory ?? 0) || 0;
      }
      mapped.push({
        supplierCode: "cj",
        supplierProductId,
        supplierVariantId: vid,
        sku: (v.variantSku as string) ?? vid,
        cost: v.variantSellPrice != null ? Number(v.variantSellPrice) : null,
        currency: "USD",
        inventory: stock,
        raw: v,
      });
    }
    return mapped;
  }

  async getInventory(supplierVariantIds: string[]): Promise<SupplierInventory[]> {
    if (!supplierVariantIds.length) return [];
    if (!(await assertCjQuotaAvailableForBackground())) {
      throw new Error(
        "Jimvio Store inventory is temporarily unavailable. Sync will retry automatically."
      );
    }
    const { getOrRefreshAccessToken } = await import("@/lib/cj/auth");
    const { fetchCJVariantStock } = await import("@/lib/cj/sync-inventory");
    const token = await getOrRefreshAccessToken();
    if (!token) {
      throw new Error("CJ authentication is not configured.");
    }
    const results: SupplierInventory[] = [];
    for (const vid of supplierVariantIds) {
      try {
        const stock = await fetchCJVariantStock(token, vid);
        results.push({ supplierVariantId: vid, quantity: stock });
      } catch {
        // Do not fabricate stock — skip unavailable variants
      }
    }
    return results;
  }

  async getShippingRates(input: GetShippingRatesInput): Promise<ShippingQuote[]> {
    if (!(await assertCjQuotaAvailableForBackground())) {
      throw new Error(
        "CJ shipping rates are temporarily unavailable. Sync will retry automatically."
      );
    }
    // Prefer existing checkout shipping path when possible; expose temporary failure clearly.
    try {
      const { getOrRefreshAccessToken } = await import("@/lib/cj/auth");
      const token = await getOrRefreshAccessToken();
      if (!token) {
        throw new Error("CJ authentication is not configured.");
      }

      const { CJ_BASE } = await import("@/lib/cj/client");
      const body = {
        startCountryCode: "CN",
        endCountryCode: input.countryCode,
        products: input.lines.map((l) => ({
          vid: l.supplierVariantId,
          quantity: l.quantity,
        })),
      };
      const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": token,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      noteCjQuotaIfPresent(json);
      if (!res.ok || !json?.data) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "CJ shipping rates are temporarily unavailable."
        );
      }

      const rows = Array.isArray(json.data) ? json.data : [json.data];
      return rows.map((row: Record<string, unknown>) => ({
        supplier: "cj" as const,
        method: String(row.logisticName ?? row.shippingMethod ?? "Standard"),
        methodId: row.logisticCompanyId != null ? String(row.logisticCompanyId) : undefined,
        cost: Number(row.logisticPrice ?? row.postage ?? 0),
        currency: String(row.currency ?? "USD"),
        minDays: row.logisticAging != null ? Number(row.logisticAging) : null,
        maxDays: row.logisticAging != null ? Number(row.logisticAging) + 3 : null,
        trackingAvailable: true,
        raw: row,
      }));
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "CJ shipping rates are temporarily unavailable. Sync will retry automatically."
      );
    }
  }

  async createOrder(input: CreateSupplierOrderInput) {
    const lines = input.lines.map((l, idx) => ({
      orderItemId: `ds-${input.jimvioOrderId}-${idx}`,
      productId: "",
      vendorId: "",
      quantity: l.quantity,
      unitPrice: l.unitPrice ?? 0,
      totalPrice: (l.unitPrice ?? 0) * l.quantity,
      sourceMetadata: { cj_vid: l.supplierVariantId, vid: l.supplierVariantId },
      cjVid: l.supplierVariantId,
    }));

    // Persist shipping method on order if provided (required by existing submit path)
    if (input.shippingMethod) {
      await this.db
        .from("orders")
        .update({ cj_shipping_method: input.shippingMethod })
        .eq("id", input.jimvioOrderId);
    }

    const result = await submitCjOrderForLines(
      this.db,
      input.jimvioOrderId,
      input.jimvioOrderNumber,
      lines
    );

    if (!result.ok) {
      throw new Error(
        result.error ||
          "Order could not be submitted because the supplier variant is unavailable."
      );
    }

    const { data: order } = await this.db
      .from("orders")
      .select("cj_order_id, cj_order_num, cj_fulfillment_status")
      .eq("id", input.jimvioOrderId)
      .maybeSingle();

    if (!order?.cj_order_id) {
      throw new Error("CJ order submission did not return an order id.");
    }

    return {
      supplierOrderId: order.cj_order_id,
      supplierOrderNumber: order.cj_order_num ?? null,
      status: order.cj_fulfillment_status ?? "submitted",
    };
  }

  async getOrder(supplierOrderId: string) {
    const { data } = await this.db
      .from("orders")
      .select("cj_order_id, cj_order_num, cj_fulfillment_status")
      .eq("cj_order_id", supplierOrderId)
      .maybeSingle();
    if (!data?.cj_order_id) return null;
    return {
      supplierOrderId: data.cj_order_id,
      supplierOrderNumber: data.cj_order_num,
      status: data.cj_fulfillment_status ?? "unknown",
    };
  }

  async getTracking(supplierOrderId: string): Promise<SupplierTracking | null> {
    const { data } = await this.db
      .from("orders")
      .select("cj_order_id, tracking_number, tracking_status, cj_fulfillment_status")
      .eq("cj_order_id", supplierOrderId)
      .maybeSingle();
    if (!data?.tracking_number) return null;
    return {
      supplierOrderId,
      trackingNumber: data.tracking_number,
      status: data.tracking_status ?? data.cj_fulfillment_status ?? "shipped",
    };
  }
}
