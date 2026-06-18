import { createClient } from "@/lib/supabase/server";
import { addToCart } from "@/lib/actions/marketplace";

export type ReorderLine = {
  product_id: string;
  vendor_id: string;
  quantity: number;
  variant_id?: string | null;
};

export type ReorderResult = {
  added: number;
  skipped: Array<{ product_id: string; reason: string }>;
};

export async function reorderCartLines(items: ReorderLine[]): Promise<ReorderResult> {
  const skipped: ReorderResult["skipped"] = [];
  let added = 0;

  for (const item of items) {
    if (!item.product_id || !item.vendor_id) {
      skipped.push({
        product_id: item.product_id || "unknown",
        reason: "Missing product or vendor",
      });
      continue;
    }

    const qty = Math.min(Math.max(Number(item.quantity) || 1, 1), 999);
    const result = await addToCart(
      item.product_id,
      item.vendor_id,
      qty,
      item.variant_id ?? null,
    );

    if (result.success) {
      added += 1;
    } else {
      skipped.push({
        product_id: item.product_id,
        reason: result.error ?? "Could not add to cart",
      });
    }
  }

  return { added, skipped };
}

export async function reorderFromOrder(orderId: string, userId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      buyer_id,
      order_items (
        product_id,
        vendor_id,
        quantity,
        variant_id
      )
    `)
    .eq("id", orderId)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");

  const lines: ReorderLine[] = (order.order_items ?? [])
    .filter((i) => i.product_id && i.vendor_id)
    .map((i) => ({
      product_id: i.product_id as string,
      vendor_id: i.vendor_id as string,
      quantity: Number(i.quantity) || 1,
      variant_id: i.variant_id,
    }));

  if (lines.length === 0) {
    throw new Error("No items from this order can be reordered.");
  }

  const result = await reorderCartLines(lines);

  if (result.added === 0) {
    const reason = result.skipped[0]?.reason ?? "Products may no longer be available.";
    throw new Error(reason);
  }

  return {
    ...result,
    cartUrl: "/cart",
  };
}
