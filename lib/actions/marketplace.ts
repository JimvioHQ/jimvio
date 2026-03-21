"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
      .select("name, price, images, shopify_variant_id, shopify_product_id")
      .eq("id", productId)
      .single();

    if (pError || !product) throw new Error("Product not found");

    // 2. Look for an existing pending order for this vendor and buyer
    let { data: order, error: oError } = await supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("vendor_id", vendorId)
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

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      const { error: updateError } = await supabase
        .from("order_items")
        .update({
          quantity: newQty,
          total_price: product.price * newQty
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
        });
      
      if (insertError) throw insertError;
    }

    // 4. Update order totals (optional but good practice)
    const { data: allItems } = await supabase
      .from("order_items")
      .select("total_price")
      .eq("order_id", orderId);
    
    const newTotal = allItems?.reduce((sum, i) => sum + Number(i.total_price), 0) || 0;
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ total_amount: newTotal, subtotal: newTotal })
      .eq("id", orderId);
    
    if (orderUpdateError) throw orderUpdateError;

    revalidatePath("/");
    revalidatePath("/marketplace");
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    console.error("Add to cart error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCart() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const total = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    return { orders: orders || [], total };
  } catch (error) {
    console.error("Get cart error:", error);
    return { orders: [], total: 0 };
  }
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

    // Update order total
    const { data: allItems } = await supabase
      .from("order_items")
      .select("total_price")
      .eq("order_id", item.order_id);
    
    const newTotal = allItems?.reduce((sum, i) => sum + Number(i.total_price), 0) || 0;
    
    await supabase
      .from("orders")
      .update({ total_amount: newTotal, subtotal: newTotal })
      .eq("id", item.order_id);

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

    const { data: item, error: iError } = await supabase
      .from("order_items")
      .select("order_id, orders!inner(buyer_id, status)")
      .eq("id", itemId)
      .eq("orders.buyer_id", user.id)
      .eq("orders.status", "pending")
      .single();

    if (iError || !item) throw new Error("Item not found");

    const orderId = item.order_id;

    const { error: dError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId);

    if (dError) throw dError;

    // Check if order is now empty
    const { data: remainingItems } = await supabase
      .from("order_items")
      .select("total_price")
      .eq("order_id", orderId);

    if (!remainingItems || remainingItems.length === 0) {
      await supabase.from("orders").delete().eq("id", orderId);
    } else {
      const newTotal = remainingItems.reduce((sum, i) => sum + Number(i.total_price), 0);
      await supabase
        .from("orders")
        .update({ total_amount: newTotal, subtotal: newTotal })
        .eq("id", orderId);
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
