"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { normalizeProductSource } from "@/lib/sources/product-source";
import { getProducts } from "@/services/db";

export async function getSearchSuggestions(query: string) {
  try {
    if (!query || query.length < 1) return { success: true, products: [] };
    
    const { products } = await getProducts({
      search: query,
      limit: 6,
      sort: "trending"
    });

    return { 
      success: true, 
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images?.[0] || null,
        price: p.price,
        currency: p.currency
      }))
    };
  } catch (error: any) {
    console.error("Search suggestions error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFollowVendor(vendorId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // Check if already following
    const { data: existing } = await supabase
      .from("vendor_followers")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from("vendor_followers")
        .delete()
        .eq("vendor_id", vendorId)
        .eq("user_id", user.id);
      
      if (error) throw error;
      revalidatePath("/");
      return { success: true, action: "unfollowed" };
    } else {
      // Follow
      const { error } = await supabase
        .from("vendor_followers")
        .insert({
          vendor_id: vendorId,
          user_id: user.id
        });
      
      if (error) throw error;
      revalidatePath("/");
      return { success: true, action: "followed" };
    }
  } catch (error: any) {
    console.error("Toggle follow error:", error);
    return { success: false, error: error.message };
  }
}

export async function submitReview({
  productId,
  vendorId,
  rating,
  title,
  body
}: {
  productId?: string;
  vendorId?: string;
  rating: number;
  title?: string;
  body?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("reviews")
      .upsert({
        product_id: productId || null,
        vendor_id: vendorId || null,
        buyer_id: user.id,
        rating,
        title,
        body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'product_id, buyer_id' })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/");
    return { success: true, data };
  } catch (error: any) {
    console.error("Submit review error:", error);
    return { success: false, error: error.message };
  }
}

export async function getFollowStatus(vendorId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from("vendor_followers")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("user_id", user.id)
      .single();

    return !!data;
  } catch {
    return false;
  }
}
export async function getNavbarCounts() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { cartCount: 0, chatCount: 0 };

    console.log("Fetching navbar counts for user:", user.id);

    // Parallelize the queries
    const [cartResult, notificationResult] = await Promise.all([
      supabase
        .from("order_items")
        .select("quantity, orders!inner(id)")
        .eq("orders.buyer_id", user.id)
        .eq("orders.status", "pending"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
    ]);

    if (cartResult.error) {
      console.error("Error fetching cart items:", cartResult.error);
    }
    if (notificationResult.error) {
      console.error("Error fetching notifications:", notificationResult.error);
    }

    const totalItems = cartResult.data?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
    const chatCount = notificationResult.count ?? 0;

    console.log(`[getNavbarCounts] Result: ${totalItems} cart, ${chatCount} chat`);

    return {
      cartCount: totalItems,
      chatCount: chatCount,
    };
  } catch (err) {
    console.error("[getNavbarCounts] Global error:", err);
    return { cartCount: 0, chatCount: 0 };
  }
}

export async function addToCart(productId: string, vendorId: string, quantity: number = 1) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // 1. Get product details for price etc
    const { data: product, error: pError } = await supabase
      .from("products")
      .select("name, price, images, shopify_variant_id, shopify_product_id, currency, source, source_metadata")
      .eq("id", productId)
      .single();

    if (pError || !product) throw new Error("Product not found");

    const productCurrency = (product as { currency?: string | null }).currency?.toUpperCase() || "USD";
    
    // 2. Look for an existing pending order for this vendor AND currency and buyer
    let { data: order, error: oError } = await supabase
      .from("orders")
      .select("id, currency")
      .eq("buyer_id", user.id)
      .eq("vendor_id", vendorId)
      .eq("currency", productCurrency)
      .eq("status", "pending")
      .maybeSingle();

    if (!order) {
      // Create new pending order
      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          vendor_id: vendorId,
          status: "pending",
          total_amount: product.price * quantity,
          subtotal: product.price * quantity,
          currency: productCurrency,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      order = newOrder;
    }

    if (!order) throw new Error("Could not retrieve or create order");
    const orderId = order.id;

    // 3. Add or update order item
    const { data: existingItem } = await supabase
      .from("order_items")
      .select("id, quantity")
      .eq("order_id", orderId)
      .eq("product_id", productId)
      .maybeSingle();

    const lineSource = normalizeProductSource((product as { source?: string | null }).source);
    const lineMeta = (product as { source_metadata?: Record<string, unknown> | null }).source_metadata ?? {};

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      const { error: updateError } = await supabase
        .from("order_items")
        .update({
          quantity: newQty,
          total_price: product.price * newQty,
          product_source: lineSource,
          source_metadata: lineMeta,
        })
        .eq("id", existingItem.id);
      
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          product_id: productId,
          vendor_id: vendorId,
          product_name: product.name,
          product_image: product.images?.[0] || null,
          quantity: quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
          shopify_variant_id: product.shopify_variant_id ?? null,
          shopify_product_id: product.shopify_product_id ?? null,
          product_source: lineSource,
          source_metadata: lineMeta,
        });
      
      if (insertError) throw insertError;
    }

    // 4. Update order totals (subtotal / total_amount) are now updated automatically by 
    // the 'tr_update_order_totals' PostgreSQL trigger. No manual update needed.
    
    // 5. Fetch updated cart item count for immediate frontend update (reduces roundtrips)
    const { data: countData } = await supabase
      .from("order_items")
      .select("quantity, orders!inner(id)")
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending");
    
    const newCartCount = countData?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

    // Only revalidate the cart page where it matters most, avoiding global slowdown
    revalidatePath("/cart");
    
    return { success: true, cartCount: newCartCount };
  } catch (error: any) {
    console.error("Add to cart error:", error);
    return { success: false, error: error.message };
  }
}

/** True when Node/undici could not reach Supabase (VPN, Wi‑Fi, or cold edge). */
function isTransientNetworkError(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message, String(error.cause ?? ""));
  }
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string") parts.push(o.message);
    if (typeof o.details === "string") parts.push(o.details);
  }
  const s = parts.join(" ");
  return /fetch failed|ConnectTimeout|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|EAI_AGAIN/i.test(
    s
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function getCart() {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { orders: [], total: 0 };

      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
        *,
        vendors (id, business_name, business_slug),
        order_items (*)
      `)
        .eq("buyer_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (orders || []).filter((order) => {
        const items = order.order_items as unknown[] | undefined;
        return Array.isArray(items) && items.length > 0;
      });
      const total = list.reduce((sum, order) => {
        const items = order.order_items as { total_price: number }[] | undefined;
        const lineSum =
          items?.reduce((s, i) => s + Number(i.total_price), 0) ?? Number(order.total_amount);
        return sum + lineSum;
      }, 0);

      return { orders: list, total };
    } catch (error) {
      const canRetry = attempt < maxAttempts && isTransientNetworkError(error);
      if (canRetry) {
        await sleep(400 * attempt);
        continue;
      }
      if (isTransientNetworkError(error)) {
        console.warn(
          "getCart: Supabase unreachable after retries (network/timeout). Returning empty cart."
        );
      } else {
        console.error("Get cart error:", error);
      }
      return { orders: [], total: 0 };
    }
  }
  return { orders: [], total: 0 };
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Authentication required");

    if (quantity <= 0) {
      return removeFromCart(itemId);
    }

    // Get item to find order and unit price
    const { data: item, error: iError } = await supabase
      .from("order_items")
      .select("*, orders!inner(buyer_id, status)")
      .eq("id", itemId)
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending")
      .single();

    if (iError || !item) throw new Error("Item not found");

    const newTotalPrice = Number(item.unit_price) * quantity;

    const { error: uError } = await supabase
      .from("order_items")
      .update({ quantity, total_price: newTotalPrice })
      .eq("id", itemId);

    if (uError) throw uError;

    // Order totals (subtotal / total_amount) are updated automatically by trigger.
    
    revalidatePath("/cart");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Update cart item error:", error);
    return { success: false, error: error.message };
  }
}

export async function removeFromCart(itemId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Authentication required");

    // Two-step lookup avoids fragile nested PostgREST filters on delete flows.
    const { data: line, error: lineErr } = await supabase
      .from("order_items")
      .select("id, order_id")
      .eq("id", itemId)
      .maybeSingle();

    if (lineErr || !line) throw new Error("Item not found");

    const { data: ord, error: ordErr } = await supabase
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", line.order_id)
      .single();

    if (ordErr || !ord || ord.buyer_id !== user.id || ord.status !== "pending") {
      throw new Error("Item not found");
    }

    // Now using the standard Supabase client since RLS has been fixed.
    // Order totals (subtotal / total_amount) are updated automatically by trigger.
    const { data: removed, error: dError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)
      .eq("order_id", line.order_id)
      .select("id");

    if (dError) throw dError;
    if (!removed?.length) {
      throw new Error("Could not remove item. Please try again.");
    }

    // Check if order is now empty - automatic deletion of empty orders can be 
    // handled by checking remaining items.
    const { data: remainingItems } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", line.order_id);

    if (!remainingItems || remainingItems.length === 0) {
      const { error: delOrdErr } = await supabase.from("orders").delete().eq("id", line.order_id);
      if (delOrdErr) {
        console.warn("removeFromCart: could not delete empty pending order:", delOrdErr);
      }
    }

    revalidatePath("/cart");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleWishlist(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data: existing } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      revalidatePath("/dashboard/wishlist");
      revalidatePath("/dashboard/marketplace");
      return { success: true, inWishlist: false };
    } else {
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      revalidatePath("/dashboard/wishlist");
      revalidatePath("/dashboard/marketplace");
      return { success: true, inWishlist: true };
    }
  } catch (error: any) {
    console.error("Toggle wishlist error:", error);
    return { success: false, error: error.message };
  }
}

export async function getWishlistProductIds(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id);
    return (data ?? []).map((r) => r.product_id);
  } catch {
    return [];
  }
}

/**
 * Check whether a product is already in the current user's pending cart.
 * Returns { inCart: true, itemId: "<order_item_id>" } or { inCart: false }.
 */
export async function checkProductInCart(productId: string): Promise<{ inCart: boolean; itemId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { inCart: false };

    const { data } = await supabase
      .from("order_items")
      .select("id, orders!inner(buyer_id, status)")
      .eq("product_id", productId)
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending")
      .maybeSingle();

    if (data) return { inCart: true, itemId: data.id };
    return { inCart: false };
  } catch {
    return { inCart: false };
  }
}

/**
 * Remove a product from the cart by product_id (not item_id).
 * Looks up the matching order_item automatically then delegates to removeFromCart.
 */
export async function removeProductFromCart(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: item } = await supabase
      .from("order_items")
      .select("id, orders!inner(buyer_id, status)")
      .eq("product_id", productId)
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending")
      .maybeSingle();

    if (!item) return { success: false, error: "Item not in cart" };

    return removeFromCart(item.id);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

