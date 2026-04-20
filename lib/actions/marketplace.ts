"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { finalizeAndCompleteOrder } from "./order-lifecycle";
import { normalizeProductSource } from "@/lib/sources/product-source";
import { getProducts } from "@/services/db";
import { cookies } from "next/headers";
import { getDefaultAffiliateCommissionPercent } from "@/lib/platform-settings";

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
    
    // Targeted revalidation instead of nuking entire cache
    if (productId) {
      revalidatePath(`/marketplace`);
    }
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
        .select("quantity, orders!inner(id, metadata)")
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

    const totalItems = cartResult.data?.filter(item => !(item.orders as any)?.metadata?.is_direct_checkout)?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
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

    // 1+2. Fetch product details AND existing pending order IN PARALLEL
    const [productResult, orderResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, price, images, shopify_variant_id, shopify_product_id, currency, source, source_metadata, affiliate_enabled, affiliate_commission_rate, product_type, pricing_type, billing_period")
        .eq("id", productId)
        .single(),
      supabase
        .from("orders")
        .select("id, currency, metadata")
        .eq("buyer_id", user.id)
        .eq("vendor_id", vendorId)
        .eq("status", "pending")
        .maybeSingle(),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) throw new Error("Product not found");

    const productCurrency = (product as { currency?: string | null }).currency?.toUpperCase() || "USD";
    
    // Check if the existing order matches currency, if not create a new one
    let order = orderResult.data;
    if (order && order.currency !== productCurrency) {
      order = null; // Need a new order for this currency
    }

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

    // 3. Handle referral/affiliate tracking
    const cookieStore = await cookies();
    const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value;
    const refCode = cookieStore.get("jimvio_ref")?.value;
    let affiliateId = null;
    let commissionRate = (product as any).affiliate_commission_rate ?? (await getDefaultAffiliateCommissionPercent());
    let commissionAmount = 0;

    // Attach video_id to order metadata if present
    if (lastVideoId && !(order.metadata as any)?.video_id) {
      await supabase
        .from("orders")
        .update({
          metadata: { ...((order.metadata as any) || {}), video_id: lastVideoId }
        })
        .eq("id", orderId);
    }

    if (refCode && (product as any).affiliate_enabled) {
      // 1. Try resolving as specific link_code (LNK-)
      if (refCode.startsWith("LNK-")) {
        const { data: link } = await supabase
          .from("affiliate_links")
          .select("affiliate_id, commission_rate")
          .eq("link_code", refCode)
          .maybeSingle();

        if (link) {
          affiliateId = link.affiliate_id;
          commissionRate = link.commission_rate || commissionRate;
        }
      } else {
        // 2. Try resolving as general affiliate_code (AFF-)
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id")
          .eq("affiliate_code", refCode)
          .maybeSingle();

        if (aff) {
          affiliateId = aff.id;
        }
      }
    }

    const price = Number(product.price);
    const lineSource = normalizeProductSource((product as { source?: string | null }).source);
    const lineMeta = (product as { source_metadata?: Record<string, unknown> | null }).source_metadata ?? {};

    // 4. Add or update order item
    const { data: existingItem } = await supabase
      .from("order_items")
      .select("id, quantity, metadata")
      .eq("order_id", orderId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      const newTotal = price * newQty;
      const newCommAmount = affiliateId ? (newTotal * (commissionRate || 10)) / 100 : 0;

      const { error: updateError } = await supabase
        .from("order_items")
        .update({
          quantity: newQty,
          total_price: newTotal,
          unit_price: price,
          affiliate_id: affiliateId,
          affiliate_commission_rate: commissionRate,
          affiliate_commission_amount: newCommAmount,
          product_source: lineSource,
          source_metadata: lineMeta,
          metadata: { ...((existingItem.metadata as any) || {}), video_id: lastVideoId }
        })
        .eq("id", existingItem.id);
      
      if (updateError) throw updateError;
    } else {
      const totalPrice = price * quantity;
      const initialCommAmount = affiliateId ? (totalPrice * (commissionRate || 10)) / 100 : 0;

      const { error: insertError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          product_id: productId,
          vendor_id: vendorId,
          product_type: (product as any).product_type || "physical",
          product_name: product.name,
          product_image: product.images?.[0] || null,
          quantity: quantity,
          unit_price: price,
          total_price: totalPrice,
          affiliate_id: affiliateId,
          affiliate_commission_rate: commissionRate,
          affiliate_commission_amount: initialCommAmount,
          shopify_variant_id: product.shopify_variant_id ?? null,
          shopify_product_id: product.shopify_product_id ?? null,
          product_source: lineSource,
          source_metadata: lineMeta,
          pricing_type: (product as any).pricing_type || "one_time",
          billing_period: (product as any).billing_period || null,
          metadata: { video_id: lastVideoId }
        });
      
      if (insertError) throw insertError;
    }

    // 4. Update order totals (subtotal / total_amount) are now updated automatically by 
    // the 'tr_update_order_totals' PostgreSQL trigger. No manual update needed.

    return { success: true };
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
        // Exclude direct checkout digital items from the normal cart
        if ((order.metadata as any)?.is_direct_checkout === true) return false;
        
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
 * BATCH: Get all product IDs currently in the user's pending cart.
 * Use this at the page/layout level to avoid N+1 per-card queries.
 */
export async function getCartProductIds(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("order_items")
      .select("product_id, orders!inner(buyer_id, status)")
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending");

    return (data ?? []).map((r) => r.product_id);
  } catch {
    return [];
  }
}

/**
 * BATCH: Get all vendor IDs the current user is following.
 * Use this at the page/layout level to avoid N+1 per-button queries.
 */
export async function getFollowedVendorIds(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("vendor_followers")
      .select("vendor_id")
      .eq("user_id", user.id);

    return (data ?? []).map((r) => r.vendor_id);
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

/**
 * Cancel an order or update its status.
 */
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const adminClient = createServiceRoleClient();

    // 1. Fetch current order
    const { data: order, error: fetchErr } = await adminClient
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) return { success: false, error: "Order not found" };

    // Security: Only buyer can update through this endpoint (unless admin handled elsewhere)
    if (order.buyer_id !== user.id) {
       return { success: false, error: "Action restricted to order owner" };
    }

    const currentStatus = order.status;

    // 2. Handle 'Completed' transition via specialized logic (Fund Release)
    if (newStatus === "completed") {
       const res = await finalizeAndCompleteOrder(orderId, user.id, "Buyer confirmed order completion.");
       return { success: res.success, error: res.error };
    }

    // 3. Buyer State Machine Logic
    // Buyers can typically move:
    // shipped -> delivered
    // pending -> cancelled
    // confirmed -> cancelled (depending on store policy, let's allow for now if not processed)
    
    let allowed = false;
    if (currentStatus === "shipped" && newStatus === "delivered") allowed = true;
    if (currentStatus === "pending" && newStatus === "cancelled") allowed = true;
    if (currentStatus === "confirmed" && newStatus === "cancelled") allowed = true;

    if (!allowed) {
      return { success: false, error: `Invalid transition: Cannot move from ${currentStatus} to ${newStatus}` };
    }

    // 4. Update Status
    const { error: updateErr } = await adminClient
      .from("orders")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    // 5. Track History
    await adminClient.from("order_status_history").insert({
      order_id: orderId,
      user_id: user.id,
      previous_status: currentStatus,
      new_status: newStatus,
      notes: `Buyer transitioned order to ${newStatus}`
    });

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order status error:", error);
    return { success: false, error: error.message };
  }
}

export async function buyDirectCheckout(productId: string, vendorId: string, quantity: number = 1) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, images, shopify_variant_id, shopify_product_id, currency, source, source_metadata, affiliate_enabled, affiliate_commission_rate, product_type, pricing_type, billing_period")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    const productCurrency = product.currency?.toUpperCase() || "USD";
    
    // Create new direct checkout order immediately
    const { data: order, error: createError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        vendor_id: vendorId,
        status: "pending",
        total_amount: product.price * quantity,
        subtotal: product.price * quantity,
        currency: productCurrency,
        metadata: { is_direct_checkout: true }
      })
      .select()
      .single();
    
    if (createError) throw createError;

    const orderId = order.id;

    // Handle affiliate tracking
    const cookieStore = await cookies();
    const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value;
    const refCode = cookieStore.get("jimvio_ref")?.value;
    let affiliateId = null;
    let commissionRate = (product as any).affiliate_commission_rate ?? (await getDefaultAffiliateCommissionPercent());

    if (lastVideoId && !(order.metadata as any)?.video_id) {
      await supabase
        .from("orders")
        .update({
          metadata: { ...((order.metadata as any) || {}), video_id: lastVideoId }
        })
        .eq("id", orderId);
    }

    if (refCode && (product as any).affiliate_enabled) {
      if (refCode.startsWith("LNK-")) {
        const { data: link } = await supabase
          .from("affiliate_links").select("affiliate_id, commission_rate").eq("link_code", refCode).maybeSingle();
        if (link) {
          affiliateId = link.affiliate_id;
          commissionRate = link.commission_rate || commissionRate;
        }
      } else {
        const { data: aff } = await supabase
          .from("affiliates").select("id").eq("affiliate_code", refCode).maybeSingle();
        if (aff) affiliateId = aff.id;
      }
    }

    const price = Number(product.price);
    const lineSource = normalizeProductSource((product as { source?: string | null }).source);
    const lineMeta = (product as { source_metadata?: Record<string, unknown> | null }).source_metadata ?? {};
    const totalPrice = price * quantity;
    const initialCommAmount = affiliateId ? (totalPrice * (commissionRate || 10)) / 100 : 0;

    const { error: insertError } = await supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        product_id: productId,
        vendor_id: vendorId,
        product_type: product.product_type || "digital",
        product_name: product.name,
        product_image: product.images?.[0] || null,
        quantity: quantity,
        unit_price: price,
        total_price: totalPrice,
        affiliate_id: affiliateId,
        affiliate_commission_rate: commissionRate,
        affiliate_commission_amount: initialCommAmount,
        shopify_variant_id: product.shopify_variant_id ?? null,
        shopify_product_id: product.shopify_product_id ?? null,
        product_source: lineSource,
        source_metadata: lineMeta,
        pricing_type: product.pricing_type || "one_time",
        billing_period: product.billing_period || null,
        metadata: { video_id: lastVideoId }
      });
    
    if (insertError) throw insertError;

    return { success: true, orderId: orderId };
  } catch (error: any) {
    console.error("Direct checkout error:", error);
    return { success: false, error: error.message };
  }
}
