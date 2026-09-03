
// "use server";

// import { createClient } from "@/lib/supabase/server";
// import { createServiceRoleClient } from "@/lib/supabase/service-role";
// import { revalidatePath } from "next/cache";
// import { finalizeAndCompleteOrder } from "./order-lifecycle";
// import {
//   normalizeProductSource,
//   isCJSource,
//   toOrderItemSource,
//   supportsAffiliateCommission,
// } from "@/lib/sources/product-source";
// import { getProducts } from "@/services/db";
// import { cookies } from "next/headers";
// import { getDefaultAffiliateCommissionPercent } from "@/lib/platform-settings";
// import { grantDigitalAccess } from "./digital-access";
// import { Json } from "@/types/supabase";
// import { getAdminDB } from "../supabase/admin";

// interface CJProductMeta {
//   cj_pid?: string;
//   cj_vid?: string;
//   cj_weight?: number;
//   [key: string]: unknown;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────

// function isTransientNetworkError(error: unknown): boolean {
//   const parts: string[] = [];
//   if (error instanceof Error) {
//     parts.push(error.message, String(error.cause ?? ""));
//   }
//   if (error && typeof error === "object") {
//     const o = error as Record<string, unknown>;
//     if (typeof o.message === "string") parts.push(o.message);
//     if (typeof o.details === "string") parts.push(o.details);
//   }
//   const s = parts.join(" ");
//   return /fetch failed|ConnectTimeout|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|EAI_AGAIN/i.test(s);
// }

// function sleep(ms: number) {
//   return new Promise<void>((r) => setTimeout(r, ms));
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // CHECKS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function checkUserOwnsProduct(productId: string): Promise<boolean> {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return false;

//   const { data } = await supabase
//     .from("order_items")
//     .select("id, orders!inner(buyer_id, status, payment_status)")
//     .eq("product_id", productId)
//     .eq("orders.buyer_id", user.id)
//     .eq("orders.payment_status", "paid")
//     .not("orders.status", "in", "(cancelled,refunded)")
//     .limit(1)
//     .maybeSingle();

//   return !!data;
// }

// export async function getSearchSuggestions(query: string) {
//   try {
//     if (!query || query.length < 1) return { success: true, products: [] };

//     const { products } = await getProducts({ search: query, limit: 6, sort: "trending" });

//     return {
//       success: true,
//       products: products.map((p: any) => ({
//         id: p.id,
//         name: p.name,
//         slug: p.slug,
//         image: p.images?.[0] || null,
//         price: p.price,
//         currency: p.currency,
//         source: normalizeProductSource(p.source),
//       })),
//     };
//   } catch (error: any) {
//     console.error("Search suggestions error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // VENDOR FOLLOWS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function toggleFollowVendor(vendorId: string) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const { data: existing } = await supabase
//       .from("vendor_followers")
//       .select("id")
//       .eq("vendor_id", vendorId)
//       .eq("user_id", user.id)
//       .single();

//     if (existing) {
//       const { error } = await supabase
//         .from("vendor_followers")
//         .delete()
//         .eq("vendor_id", vendorId)
//         .eq("user_id", user.id);
//       if (error) throw error;
//       return { success: true, action: "unfollowed" };
//     } else {
//       const { error } = await supabase
//         .from("vendor_followers")
//         .insert({ vendor_id: vendorId, user_id: user.id });
//       if (error) throw error;
//       return { success: true, action: "followed" };
//     }
//   } catch (error: any) {
//     console.error("Toggle follow error:", error);
//     return { success: false, error: error.message };
//   }
// }

// export async function getFollowStatus(vendorId: string) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return false;

//     const { data } = await supabase
//       .from("vendor_followers")
//       .select("id")
//       .eq("vendor_id", vendorId)
//       .eq("user_id", user.id)
//       .single();

//     return !!data;
//   } catch {
//     return false;
//   }
// }

// export async function getFollowedVendorIds(): Promise<string[]> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return [];

//     const { data } = await supabase
//       .from("vendor_followers")
//       .select("vendor_id")
//       .eq("user_id", user.id);

//     return (data ?? []).map((r) => r.vendor_id);
//   } catch {
//     return [];
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // REVIEWS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function submitReview({
//   productId,
//   vendorId,
//   rating,
//   title,
//   body,
// }: {
//   productId?: string;
//   vendorId?: string;
//   rating: number;
//   title?: string;
//   body?: string;
// }) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const { data, error } = await supabase
//       .from("reviews")
//       .upsert(
//         {
//           product_id: productId || null,
//           vendor_id: vendorId || null,
//           buyer_id: user.id,
//           rating,
//           title,
//           body,
//           updated_at: new Date().toISOString(),
//         },
//         { onConflict: "product_id, buyer_id" }
//       )
//       .select()
//       .single();

//     if (error) throw error;
//     if (productId) revalidatePath("/marketplace");
//     return { success: true, data };
//   } catch (error: any) {
//     console.error("Submit review error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NAVBAR COUNTS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function getNavbarCounts() {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { cartCount: 0, chatCount: 0 };

//     const [cartResult, notificationResult] = await Promise.all([
//       // Use the carts table — item_count is maintained by the recompute_cart_totals trigger
//       supabase
//         .from("carts")
//         .select("item_count")
//         .eq("user_id", user.id)
//         .maybeSingle(),

//       supabase
//         .from("notifications")
//         .select("id", { count: "exact", head: true })
//         .eq("user_id", user.id)
//         .eq("is_read", false),
//     ]);

//     const cartCount = cartResult.data?.item_count ?? 0;
//     const chatCount = notificationResult.count ?? 0;

//     return { cartCount, chatCount };
//   } catch (err) {
//     console.error("[getNavbarCounts] error:", err);
//     return { cartCount: 0, chatCount: 0 };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ADD TO CART
// // ─────────────────────────────────────────────────────────────────────────────

// export async function addToCart(
//   productId: string,
//   vendorId: string,
//   quantity: number = 1,
//   variantId?: string | null
// ) {
//   try {
//     const uuidRe =
//       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//     if (!uuidRe.test(productId) || !uuidRe.test(vendorId)) {
//       return { success: false, error: "Invalid product or vendor ID" };
//     }
//     if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
//       return { success: false, error: "Quantity must be between 1 and 999" };
//     }

//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     // ── Parallel fetches ─────────────────────────────────────────────────────
//     const [productResult, variantResult] = await Promise.all([
//       supabase
//         .from("products")
//         .select(
//           `id, name, price, images, currency, source, source_metadata,
//            affiliate_enabled, affiliate_commission_rate,
//            product_type, pricing_type, billing_period,
//            status, is_active, track_inventory, inventory_quantity, allow_backorder`
//         )
//         .eq("id", productId)
//         .single(),

//       variantId && uuidRe.test(variantId)
//         ? supabase
//           .from("product_variants")
//           .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source")
//           .eq("id", variantId)
//           .eq("product_id", productId)
//           .single()
//         : Promise.resolve({ data: null, error: null }),
//     ]);

//     const product = productResult.data;
//     if (productResult.error || !product) {
//       return { success: false, error: "Product not found" };
//     }
//     if (product.status !== "active" || !product.is_active) {
//       return { success: false, error: "Product is unavailable" };
//     }

//     // ── CJ-specific: resolve cj_vid from variant or product metadata ─────────
//     const productSource = normalizeProductSource(product.source);
//     const isCJ = isCJSource(productSource);
//     const productMeta = (product.source_metadata as CJProductMeta) ?? {};

//     let cjVid: string | null = null;
//     let cjPid: string | null = productMeta.cj_pid ?? null;
//     let variantWeight: number | null = null;

//     if (isCJ) {
//       if (variantResult.data) {
//         const v = variantResult.data;
//         cjVid = (v.source_metadata as any)?.cj_vid ?? v.cj_vid ?? null;
//         cjPid = (v.source_metadata as any)?.cj_pid ?? v.cj_pid ?? cjPid;
//         variantWeight = v.weight ?? null;
//       } else {
//         cjVid = productMeta.cj_vid ?? null;
//         variantWeight = productMeta.cj_weight ?? null;
//       }

//       if (!cjVid) {
//         return {
//           success: false,
//           error: "This supplier product is missing variant information. Please contact support.",
//         };
//       }
//     }

//     // ── Effective price ───────────────────────────────────────────────────────
//     const variant = variantResult.data;
//     const effectivePrice =
//       variant && Number(variant.price) > 0
//         ? Number(variant.price)
//         : Number(product.price);

//     // ── Inventory check ───────────────────────────────────────────────────────
//     const inventoryQty = variant
//       ? (variant.inventory_quantity ?? 0)
//       : (product.inventory_quantity ?? 0);

//     if (
//       product.track_inventory &&
//       !product.allow_backorder &&
//       inventoryQty < quantity
//     ) {
//       return { success: false, error: "Insufficient stock" };
//     }

//     // ── Affiliate / referral resolution ──────────────────────────────────────
//     const cookieStore = await cookies();
//     const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

//     let affiliateLinkId: string | null = null;
//     const affiliatesAllowed = supportsAffiliateCommission(
//       productSource,
//       product.affiliate_enabled ?? false
//     );

//     if (refCode && affiliatesAllowed) {
//       if (refCode.startsWith("LNK-")) {
//         const { data: link } = await supabase
//           .from("affiliate_links")
//           .select("id")
//           .eq("link_code", refCode)
//           .maybeSingle();
//         if (link) affiliateLinkId = link.id;
//       }
//     }

//     // ── Build source_metadata for cart_items ─────────────────────────────────
//     const lineMeta: Record<string, unknown> = isCJ
//       ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
//       : { ...(productMeta as object) };

//     const lineSource = toOrderItemSource(product.source);

//     // ── Get or create the user's cart ─────────────────────────────────────────
//     // The add_to_cart DB function handles this atomically, but we use the
//     // client-side path here so we can pass the full source_metadata.
//     const { data: cart, error: cartError } = await supabase
//       .from("carts")
//       .upsert(
//         { user_id: user.id, currency: product.currency?.toUpperCase() || "RWF" },
//         { onConflict: "user_id" }
//       )
//       .select("id")
//       .single();

//     if (cartError || !cart) throw cartError ?? new Error("Could not get or create cart");

//     // ── Check for existing line item ──────────────────────────────────────────
//     // Must match on variant_id exactly (null vs non-null are different lines).
//     const existingQuery = supabase
//       .from("cart_items")
//       .select("id, quantity")
//       .eq("cart_id", cart.id)
//       .eq("product_id", productId);

//     const { data: existingItem } = variantId
//       ? await existingQuery.eq("variant_id", variantId).maybeSingle()
//       : await existingQuery.is("variant_id", null).maybeSingle();

//     if (existingItem) {
//       const newQty = existingItem.quantity + quantity;

//       // Re-check inventory against combined quantity
//       if (
//         product.track_inventory &&
//         !product.allow_backorder &&
//         inventoryQty < newQty
//       ) {
//         return { success: false, error: "Insufficient stock" };
//       }

//       const { error: updateError } = await supabase
//         .from("cart_items")
//         .update({
//           quantity: newQty,
//           unit_price_at_add: effectivePrice,
//           source_metadata: lineMeta as Json,
//         })
//         .eq("id", existingItem.id);

//       if (updateError) throw updateError;
//     } else {
//       const { error: insertError } = await supabase
//         .from("cart_items")
//         .insert({
//           cart_id: cart.id,
//           product_id: productId,
//           variant_id: variantId ?? null,
//           vendor_id: vendorId,
//           quantity,
//           unit_price_at_add: effectivePrice,
//           currency_at_add: product.currency?.toUpperCase() || "RWF",
//           product_source: lineSource,
//           source_metadata: lineMeta as Json,
//           affiliate_link_id: affiliateLinkId,
//         });

//       if (insertError) throw insertError;
//     }

//     return { success: true };
//   } catch (error: any) {
//     console.error("Add to cart error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET CART
// // ─────────────────────────────────────────────────────────────────────────────

// export async function getCart() {
//   const maxAttempts = 3;
//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     try {
//       const supabase = await createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return { cart: null, items: [], total: 0 };

//       const { data: cart, error: cartError } = await supabase
//         .from("carts")
//         .select(`
//           *,
//           cart_items (
//             *,
//             products (
//               id, name, slug, images, source, cj_last_synced_at,
//               pricing_type, billing_period, product_type
//             ),
//             product_variants (
//               id, name, options, image_url
//             ),
//             vendors (
//               id, business_name, business_slug
//             )
//           )
//         `)
//         .eq("user_id", user.id)
//         .maybeSingle();

//       if (cartError) throw cartError;
//       if (!cart) return { cart: null, items: [], total: 0 };

//       const items = (cart.cart_items as any[]) ?? [];
//       const total = items.reduce(
//         (sum, item) => sum + Number(item.unit_price_at_add) * Number(item.quantity),
//         0
//       );

//       return { cart, items, total };
//     } catch (error) {
//       const canRetry = attempt < maxAttempts && isTransientNetworkError(error);
//       if (canRetry) {
//         await sleep(400 * attempt);
//         continue;
//       }
//       if (isTransientNetworkError(error)) {
//         console.warn("getCart: Supabase unreachable after retries. Returning empty cart.");
//       } else {
//         console.error("Get cart error:", error);
//       }
//       return { cart: null, items: [], total: 0 };
//     }
//   }
//   return { cart: null, items: [], total: 0 };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // CART MUTATIONS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function updateCartItemQuantity(itemId: string, quantity: number) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) throw new Error("Authentication required");

//     if (quantity <= 0) return removeFromCart(itemId);

//     // Verify ownership via cart join
//     const { data: item, error: iError } = await supabase
//       .from("cart_items")
//       .select("id, unit_price_at_add, carts!inner(user_id)")
//       .eq("id", itemId)
//       .eq("carts.user_id", user.id)
//       .single();

//     if (iError || !item) throw new Error("Item not found");

//     const { error: uError } = await supabase
//       .from("cart_items")
//       .update({ quantity })
//       .eq("id", itemId);

//     if (uError) throw uError;

//     return { success: true };
//   } catch (error: any) {
//     console.error("Update cart item error:", error);
//     return { success: false, error: error.message };
//   }
// }

// export async function removeFromCart(itemId: string) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) throw new Error("Authentication required");

//     // Verify the item belongs to this user's cart
//     const { data: item, error: itemErr } = await supabase
//       .from("cart_items")
//       .select("id, cart_id, carts!inner(user_id)")
//       .eq("id", itemId)
//       .eq("carts.user_id", user.id)
//       .single();

//     if (itemErr || !item) throw new Error("Item not found");

//     const { error: dError } = await supabase
//       .from("cart_items")
//       .delete()
//       .eq("id", itemId);

//     if (dError) throw dError;

//     return { success: true };
//   } catch (error: any) {
//     console.error("Remove from cart error:", error);
//     return { success: false, error: error.message };
//   }
// }

// export async function clearCart() {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) throw new Error("Authentication required");

//     const { data: cart } = await supabase
//       .from("carts")
//       .select("id")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (!cart) return { success: true };

//     const { error } = await supabase
//       .from("cart_items")
//       .delete()
//       .eq("cart_id", cart.id);

//     if (error) throw error;

//     return { success: true };
//   } catch (error: any) {
//     console.error("Clear cart error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // WISHLIST
// // ─────────────────────────────────────────────────────────────────────────────

// export async function toggleWishlist(productId: string) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const { data: existing } = await supabase
//       .from("wishlists")
//       .select("id")
//       .eq("user_id", user.id)
//       .eq("product_id", productId)
//       .maybeSingle();

//     if (existing) {
//       const { error } = await supabase
//         .from("wishlists")
//         .delete()
//         .eq("id", existing.id);
//       if (error) throw error;
//       revalidatePath("/marketplace");
//       revalidatePath("/marketplace");
//       return { success: true, inWishlist: false };
//     } else {
//       const { error } = await supabase
//         .from("wishlists")
//         .insert({ user_id: user.id, product_id: productId });
//       if (error) throw error;
//       revalidatePath("/marketplace");
//       revalidatePath("/marketplace");
//       return { success: true, inWishlist: true };
//     }
//   } catch (error: any) {
//     console.error("Toggle wishlist error:", error);
//     return { success: false, error: error.message };
//   }
// }

// export async function getWishlistProductIds(): Promise<string[]> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return [];
//     const { data } = await supabase
//       .from("wishlists")
//       .select("product_id")
//       .eq("user_id", user.id);
//     return (data ?? []).map((r) => r.product_id);
//   } catch {
//     return [];
//   }
// }

// export async function getCartProductIds(): Promise<string[]> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return [];

//     const { data: cart } = await supabase
//       .from("carts")
//       .select("id")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (!cart) return [];

//     const { data } = await supabase
//       .from("cart_items")
//       .select("product_id")
//       .eq("cart_id", cart.id);

//     return (data ?? [])
//       .map((r) => r.product_id)
//       .filter((id): id is string => id !== null);
//   } catch {
//     return [];
//   }
// }

// export async function checkProductInCart(
//   productId: string
// ): Promise<{ inCart: boolean; itemId?: string }> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { inCart: false };

//     const { data: cart } = await supabase
//       .from("carts")
//       .select("id")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (!cart) return { inCart: false };

//     const { data } = await supabase
//       .from("cart_items")
//       .select("id")
//       .eq("cart_id", cart.id)
//       .eq("product_id", productId)
//       .maybeSingle();

//     if (data) return { inCart: true, itemId: data.id };
//     return { inCart: false };
//   } catch {
//     return { inCart: false };
//   }
// }

// export async function removeProductFromCart(
//   productId: string
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const { data: cart } = await supabase
//       .from("carts")
//       .select("id")
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (!cart) return { success: false, error: "Item not in cart" };

//     const { data: item } = await supabase
//       .from("cart_items")
//       .select("id")
//       .eq("cart_id", cart.id)
//       .eq("product_id", productId)
//       .maybeSingle();

//     if (!item) return { success: false, error: "Item not in cart" };
//     return removeFromCart(item.id);
//   } catch (error: any) {
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ORDER STATUS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function updateOrderStatus(
//   orderId: string,
//   newStatus: string
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const adminClient = createServiceRoleClient();

//     const { data: order, error: fetchErr } = await adminClient
//       .from("orders")
//       .select("id, buyer_id, status, cj_order_id, cj_fulfillment_status, integration_source")
//       .eq("id", orderId)
//       .single();

//     if (fetchErr || !order) return { success: false, error: "Order not found" };
//     if (order.buyer_id !== user.id) {
//       return { success: false, error: "Action restricted to order owner" };
//     }

//     const currentStatus = order.status;

//     if (newStatus === "completed") {
//       const res = await finalizeAndCompleteOrder(
//         orderId,
//         user.id,
//         "Buyer confirmed order completion."
//       );
//       return { success: res.success, error: res.error };
//     }

//     if (order.cj_order_id && newStatus === "delivered") {
//       return {
//         success: false,
//         error:
//           "Supplier orders update automatically once the carrier confirms delivery. Check your tracking number.",
//       };
//     }

//     const allowed =
//       (currentStatus === "shipped" && newStatus === "delivered") ||
//       (currentStatus === "pending" && newStatus === "cancelled") ||
//       (currentStatus === "confirmed" && newStatus === "cancelled");

//     if (!allowed) {
//       return {
//         success: false,
//         error: `Invalid transition: cannot move from ${currentStatus} to ${newStatus}`,
//       };
//     }

//     const { error: updateErr } = await adminClient
//       .from("orders")
//       .update({ status: newStatus, updated_at: new Date().toISOString() })
//       .eq("id", orderId);

//     if (updateErr) throw updateErr;

//     await adminClient.from("order_status_history").insert({
//       order_id: orderId,
//       user_id: user.id,
//       previous_status: currentStatus,
//       new_status: newStatus,
//       notes: `Buyer transitioned order to ${newStatus}`,
//     });

//     revalidatePath(`/orders/${orderId}`);
//     return { success: true };
//   } catch (error: any) {
//     console.error("Update order status error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DIRECT CHECKOUT  (bypasses cart — creates an order directly)
// // ─────────────────────────────────────────────────────────────────────────────

// export async function buyDirectCheckout(
//   productId: string,
//   vendorId: string,
//   quantity: number = 1,
//   variantId?: string | null
// ) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const uuidRe =
//       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

//     // ── Reads via user client — RLS gates visibility ─────────────────────────
//     const [productResult, variantResult] = await Promise.all([
//       supabase
//         .from("products")
//         .select(`
//           id, name, price, images, currency, source, source_metadata,
//           affiliate_enabled, affiliate_commission_rate,
//           product_type, pricing_type, billing_period, digital_file_url,
//           status, is_active
//         `)
//         .eq("id", productId)
//         .maybeSingle(),

//       variantId && uuidRe.test(variantId)
//         ? supabase
//           .from("product_variants")
//           .select("id, cj_vid, cj_pid, price, source_metadata, weight, source")
//           .eq("id", variantId)
//           .eq("product_id", productId)
//           .maybeSingle()
//         : Promise.resolve({ data: null, error: null }),
//     ]);

//     const product = productResult.data;
//     if (productResult.error || !product) {
//       return { success: false, error: "Product not found" };
//     }
//     if (product.status !== "active" || !product.is_active) {
//       return { success: false, error: "Product is unavailable" };
//     }

//     const productSource = normalizeProductSource(product.source);
//     const isCJ = isCJSource(productSource);
//     const productMeta = (product.source_metadata as CJProductMeta) ?? {};
//     const variant = variantResult.data;

//     let cjVid: string | null = null;
//     let cjPid: string | null = productMeta.cj_pid ?? null;
//     let variantWeight: number | null = null;

//     if (isCJ) {
//       if (variant) {
//         cjVid = (variant.source_metadata as any)?.cj_vid ?? variant.cj_vid ?? null;
//         cjPid = (variant.source_metadata as any)?.cj_pid ?? variant.cj_pid ?? cjPid;
//         variantWeight = variant.weight ?? null;
//       } else {
//         cjVid = productMeta.cj_vid ?? null;
//         variantWeight = productMeta.cj_weight ?? null;
//       }
//       if (!cjVid) {
//         return {
//           success: false,
//           error: "This supplier product is missing variant information. Please contact support.",
//         };
//       }
//     }

//     const effectivePrice =
//       variant && Number(variant.price) > 0
//         ? Number(variant.price)
//         : Number(product.price);

//     const totalAmount = effectivePrice * quantity;
//     const isFree = effectivePrice === 0;
//     const productType = product.product_type ?? (isCJ ? "physical" : "digital");
//     const productCurrency = product.currency?.toUpperCase() || "RWF";

//     const cookieStore = await cookies();
//     const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value ?? null;
//     const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

//     // ── Affiliate resolution — server-controlled, can't be spoofed by buyer ──
//     const affiliatesAllowed = supportsAffiliateCommission(
//       productSource,
//       product.affiliate_enabled ?? false,
//     );

//     let affiliateId: string | null = null;
//     let commissionRate: number =
//       !isFree && affiliatesAllowed
//         ? product.affiliate_commission_rate ??
//         (await getDefaultAffiliateCommissionPercent())
//         : 0;

//     if (refCode && affiliatesAllowed && !isFree) {
//       if (refCode.startsWith("LNK-")) {
//         const { data: link } = await supabase
//           .from("affiliate_links")
//           .select("affiliate_id, commission_rate")
//           .eq("link_code", refCode)
//           .maybeSingle();
//         if (link) {
//           affiliateId = link.affiliate_id;
//           commissionRate = link.commission_rate ?? commissionRate;
//         }
//       } else {
//         const { data: aff } = await supabase
//           .from("affiliates")
//           .select("id")
//           .eq("affiliate_code", refCode)
//           .maybeSingle();
//         if (aff) affiliateId = aff.id;
//       }
//     }

//     const isDigital =
//       productType === "digital" ||
//       productType === "course" ||
//       productType === "ebook" ||
//       productType === "software" ||
//       productType === "template";

//     // ── Writes via admin client — bypasses RLS, server-trusted ───────────────
//     const admin = getAdminDB();

//     const { data: order, error: createError } = await admin
//       .from("orders")
//       .insert({
//         buyer_id: user.id,
//         vendor_id: vendorId,
//         // Free orders skip the "pending" stage and land confirmed+paid.
//         // Paid orders sit at checkout_direct/pending until the payment webhook lands.
//         status: isFree ? "confirmed" : "checkout_direct",
//         payment_status: isFree ? "paid" : "pending",
//         paid_at: isFree ? new Date().toISOString() : null,
//         total_amount: totalAmount,
//         subtotal: totalAmount,
//         currency: productCurrency,
//         integration_source: isCJ ? "cj" : null,
//         metadata: {
//           is_direct_checkout: true,
//           ...(lastVideoId ? { video_id: lastVideoId } : {}),
//         },
//       })
//       .select()
//       .single();

//     if (createError) throw createError;

//     const lineSource = toOrderItemSource(product.source);
//     const commissionAmount = affiliateId ? (totalAmount * commissionRate) / 100 : 0;
//     const lineMeta: Record<string, unknown> = isCJ
//       ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
//       : { ...(productMeta as object) };

//     const { data: insertedItem, error: insertError } = await admin
//       .from("order_items")
//       .insert({
//         order_id: order.id,
//         product_id: productId,
//         variant_id: variantId ?? null,
//         vendor_id: vendorId,
//         product_type: productType,
//         product_name: product.name,
//         product_image: (product.images as string[])?.[0] ?? null,
//         quantity,
//         unit_price: effectivePrice,
//         total_price: totalAmount,
//         affiliate_id: affiliateId,
//         affiliate_commission_rate: commissionRate,
//         affiliate_commission_amount: commissionAmount,
//         product_source: lineSource,
//         source_metadata: lineMeta as Json,
//         pricing_type: product.pricing_type ?? "one_time",
//         billing_period: product.billing_period ?? null,
//         digital_download_url: !isCJ ? product.digital_file_url ?? null : null,
//         access_granted_at: isFree && !isCJ ? new Date().toISOString() : null,
//         metadata: { ...(lastVideoId ? { video_id: lastVideoId } : {}) },
//       })
//       .select()
//       .single();

//     if (insertError) {
//       // Roll back the order — orphan rows are worse than a failed checkout
//       await admin.from("orders").delete().eq("id", order.id);
//       throw insertError;
//     }

//     // Free digital products: grant access immediately
//     if (isFree && isDigital && !isCJ && insertedItem) {
//       await grantDigitalAccess({
//         userId: user.id,
//         productId,
//         orderItemId: insertedItem.id,
//         orderId: order.id,
//         accessUrl: product.digital_file_url ?? null,
//         subtype: productType !== "digital" ? productType : null,
//         pricingType: product.pricing_type ?? "one_time",
//         billingPeriod: product.billing_period ?? null,
//       });
//     }

//     return { success: true, orderId: order.id, isCJ };
//   } catch (error: any) {
//     console.error("Direct checkout error:", error);
//     return { success: false, error: error.message };
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PRODUCT VARIANTS
// // ─────────────────────────────────────────────────────────────────────────────

// export async function getProductVariants(productId: string) {
//   try {
//     const supabase = await createClient();
//     const { data, error } = await supabase
//       .from("product_variants")
//       .select(`
//         id,
//         name,
//         sku,
//         price,
//         compare_at_price,
//         inventory_quantity,
//         image_url,
//         options,
//         is_active,
//         source,
//         weight,
//         length,
//         width,
//         height,
//         volume,
//         affiliate_price,
//         affiliate_commission_rate,
//         cj_vid,
//         cj_pid
//       `)
//       .eq("product_id", productId)
//       .eq("is_active", true)
//       .order("created_at", { ascending: true });

//     if (error) throw error;
//     console.log(data);

//     return { success: true, variants: data ?? [] };
//   } catch (error: any) {
//     console.error("Get variants error:", error);
//     return { success: false, error: error.message, variants: [] };
//   }
// }
// export async function getFlashDeals() {
//   const supabase = await createClient();
//   const { data } = await supabase
//     .from("products")
//     .select(`
//       id, name, price, compare_at_price, discount_label,
//       images, category_id, shipping_from, delivery_time, product_type,
//       affiliate_commission_rate, sold_count, claimed_pct,
//       is_free_shipping, rating, review_count,
//       product_categories ( name, slug )
//     `)
//     .eq("is_flash_deal", true)
//     .eq("status", "active")
//     .eq("is_active", true)
//     .is("deleted_at", null)
//     .order("created_at", { ascending: false })
//     .limit(12);

//   return data ?? [];
// }

// type ProductTypeEnum =
//   | "physical" | "digital" | "subscription" | "course"
//   | "software" | "template" | "ebook" | "coaching"
//   | "community" | "bundle";

// export async function getTrendingProducts(filters?: {
//   category?: string;
//   product_type?: ProductTypeEnum;
// }) {
//   const supabase = await createClient();
//   let query = supabase
//     .from("products")
//     .select(`
//       id, name, price, compare_at_price, discount_label,
//       images, category_id, shipping_from, delivery_time, product_type,
//       affiliate_commission_rate, sale_count, rating, review_count,
//       is_free_shipping, is_flash_deal,
//       product_categories ( name, slug )
//     `)
//     .eq("status", "active")
//     .eq("is_active", true)
//     .is("deleted_at", null)
//     .order("view_count", { ascending: false })
//     .limit(24);

//   if (filters?.product_type) {
//     query = query.eq(
//       "product_type",
//       filters.product_type as
//         | "physical" | "digital" | "subscription" | "course"
//         | "software" | "template" | "ebook" | "coaching"
//         | "community" | "bundle",
//     );
//   }

//   const { data } = await query;

//   // Filter by category name after fetch since category is a join
//   if (filters?.category && filters.category !== "" && filters.category !== "Select category") {
//     return (data ?? []).filter((p) => {
//       const cat = Array.isArray(p.product_categories)
//         ? p.product_categories[0]
//         : p.product_categories;
//       return (cat as { name?: string } | null)?.name === filters.category;
//     });
//   }

//   return data ?? [];
// }

// export async function getShopCategories() {
//   const supabase = await createClient();
//   const { data } = await supabase
//     .from("product_categories")          // ← correct table name
//     .select("id, name, slug, product_count, image_url, tint_color, icon")
//     .eq("is_active", true)
//     .eq("visible", true)
//     .order("sort_order")
//     .limit(7);

//   return data ?? [];
// }

"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { finalizeAndCompleteOrder } from "./order-lifecycle";
import {
  normalizeProductSource,
  isCJSource,
  toOrderItemSource,
  supportsAffiliateCommission,
} from "@/lib/sources/product-source";
import { getProducts } from "@/services/db";
import { cookies } from "next/headers";
import { getDefaultAffiliateCommissionPercent } from "@/lib/platform-settings";
import { grantDigitalAccess } from "./digital-access";
import { Json } from "@/types/supabase";
import { getAdminDB } from "../supabase/admin";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";
import { resolvePurchaseLine } from "@/lib/products/resolve-purchase-line";
import { PLATFORM_CURRENCY, toPlatformUsd } from "@/lib/currency/platform";
import {
  buildLineAttribution,
  isSelfReferral,
  resolveReferralCode,
} from "@/lib/affiliate/attribution";

interface CJProductMeta {
  cj_pid?: string;
  cj_vid?: string;
  cj_weight?: number;
  pending_variant_selection?: boolean;
  [key: string]: unknown;
}

type AddToCartOptions = {
  allowPendingVariant?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
  return /fetch failed|ConnectTimeout|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|EAI_AGAIN/i.test(s);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKS
// ─────────────────────────────────────────────────────────────────────────────

export async function checkUserOwnsProduct(productId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("order_items")
    .select("id, orders!inner(buyer_id, status, payment_status)")
    .eq("product_id", productId)
    .eq("orders.buyer_id", user.id)
    .eq("orders.payment_status", "paid")
    .not("orders.status", "in", "(cancelled,refunded)")
    .limit(1)
    .maybeSingle();

  return !!data;
}

export async function getSearchSuggestions(query: string) {
  try {
    if (!query || query.length < 1) return { success: true, products: [] };

    const { products } = await getProducts({ search: query, limit: 6, sort: "trending" });

    return {
      success: true,
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images?.[0] || null,
        price: p.price,
        currency: p.currency,
        source: normalizeProductSource(p.source),
      })),
    };
  } catch (error: any) {
    console.error("Search suggestions error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR FOLLOWS
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleFollowVendor(vendorId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: existing } = await supabase
      .from("vendor_followers")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("vendor_followers")
        .delete()
        .eq("vendor_id", vendorId)
        .eq("user_id", user.id);
      if (error) throw error;
      return { success: true, action: "unfollowed" };
    } else {
      const { error } = await supabase
        .from("vendor_followers")
        .insert({ vendor_id: vendorId, user_id: user.id });
      if (error) throw error;
      return { success: true, action: "followed" };
    }
  } catch (error: any) {
    console.error("Toggle follow error:", error);
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

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export async function submitReview({
  productId,
  vendorId,
  rating,
  title,
  body,
  orderItemId,
  productSlug,
}: {
  productId?: string;
  vendorId?: string;
  rating: number;
  title?: string;
  body?: string;
  orderItemId?: string;
  productSlug?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    let isVerifiedPurchase = false;
    if (orderItemId) {
      const { data: item } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, orders!inner(buyer_id, payment_status)")
        .eq("id", orderItemId)
        .maybeSingle();
      const order = item?.orders as { buyer_id?: string; payment_status?: string } | null;
      if (
        item &&
        order?.buyer_id === user.id &&
        order.payment_status === "paid" &&
        (!productId || item.product_id === productId)
      ) {
        isVerifiedPurchase = true;
      }
    }

    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          product_id: productId || null,
          vendor_id: vendorId || null,
          buyer_id: user.id,
          rating,
          title,
          body,
          order_item_id: orderItemId || null,
          is_verified_purchase: isVerifiedPurchase,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id, buyer_id" }
      )
      .select()
      .single();

    if (error) throw error;

    let slug = productSlug;
    if (!slug && productId) {
      const { data: prod } = await supabase
        .from("products")
        .select("slug")
        .eq("id", productId)
        .maybeSingle();
      slug = prod?.slug ?? undefined;
    }

    if (slug) {
      try { revalidatePath(`/marketplace/${slug}`); } catch {}
    }
    try { revalidatePath("/marketplace"); } catch {}
    if (vendorId) {
      try { revalidatePath(`/vendors/${vendorId}`); } catch {}
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("Submit review error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR COUNTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getNavbarCounts() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { cartCount: 0, chatCount: 0 };

    const [cartResult, messageResult] = await Promise.all([
      supabase
        .from("carts")
        .select("item_count")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "message")
        .eq("is_read", false),
    ]);

    const cartCount = cartResult.data?.item_count ?? 0;
    const chatCount = messageResult.count ?? 0;

    return { cartCount, chatCount };
  } catch (err) {
    console.error("[getNavbarCounts] error:", err);
    return { cartCount: 0, chatCount: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD TO CART
// ─────────────────────────────────────────────────────────────────────────────

export async function addToCart(
  productId: string,
  vendorId: string,
  quantity: number = 1,
  variantId?: string | null,
  options?: AddToCartOptions,
) {
  try {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(productId) || !uuidRe.test(vendorId)) {
      return { success: false, error: "Invalid product or vendor ID" };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return { success: false, error: "Quantity must be between 1 and 999" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const [productResult, variantsResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          `id, name, price, images, currency, source, source_metadata,
           affiliate_enabled, affiliate_commission_rate,
           product_type, pricing_type, billing_period,
           status, is_active, track_inventory, inventory_quantity, allow_backorder`
        )
        .eq("id", productId)
        .single(),
      supabase
        .from("product_variants")
        .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source, options, is_active")
        .eq("product_id", productId)
        .eq("is_active", true),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) {
      return { success: false, error: "Product not found" };
    }
    if (product.status !== "active" || !product.is_active) {
      return { success: false, error: "Product is unavailable" };
    }

    const productSource = normalizeProductSource(product.source);
    const isCJ = isCJSource(productSource);
    const productMeta = (product.source_metadata as CJProductMeta) ?? {};
    const extraVariants = variantsResult.data ?? [];

    const resolved = resolvePurchaseLine({
      product,
      variants: extraVariants,
      selectedVariantId: variantId && uuidRe.test(variantId) ? variantId : null,
      allowPendingVariant: options?.allowPendingVariant,
    });
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const effectiveVariantId = resolved.variantId;
    const pendingVariantSelection = resolved.pendingVariantSelection;
    const cjVid = resolved.cjVid;
    const cjPid = resolved.cjPid;
    const variantWeight = resolved.variantWeight;
    const effectivePrice = toPlatformUsd(
      resolved.price,
      product.currency,
    );
    const inventoryQty = resolved.inventoryQty;

    if (
      !pendingVariantSelection &&
      product.track_inventory &&
      !product.allow_backorder &&
      inventoryQty < quantity
    ) {
      return { success: false, error: "Insufficient stock" };
    }

    const cookieStore = await cookies();
    const refCode =
      cookieStore.get("jimvio_ref")?.value ??
      cookieStore.get("_aff_ref")?.value ??
      null;

    let affiliateLinkId: string | null = null;
    const affiliatesAllowed = supportsAffiliateCommission(
      productSource,
      product.affiliate_enabled ?? false
    );

    if (refCode && affiliatesAllowed) {
      if (refCode.startsWith("LNK-")) {
        const { data: link } = await supabase
          .from("affiliate_links")
          .select("id")
          .eq("link_code", refCode)
          .maybeSingle();
        if (link) affiliateLinkId = link.id;
      }
    }

    const lineMeta: Record<string, unknown> = isCJ
      ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
      : { ...(productMeta as object) };

    if (pendingVariantSelection) {
      lineMeta.pending_variant_selection = true;
    }

    const lineSource = toOrderItemSource(product.source);

    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .upsert(
        { user_id: user.id, currency: PLATFORM_CURRENCY },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (cartError || !cart) throw cartError ?? new Error("Could not get or create cart");

    const existingQuery = supabase
      .from("cart_items")
      .select("id, quantity, variant_id, source_metadata")
      .eq("cart_id", cart.id)
      .eq("product_id", productId);

    let existingItem: {
      id: string;
      quantity: number;
      variant_id: string | null;
      source_metadata: Json;
    } | null = null;

    if (effectiveVariantId) {
      const { data } = await existingQuery
        .eq("variant_id", effectiveVariantId)
        .maybeSingle();
      existingItem = data;
    }

    if (!existingItem) {
      const { data } = await existingQuery.is("variant_id", null).maybeSingle();
      existingItem = data;
    }

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (
        !pendingVariantSelection &&
        product.track_inventory &&
        !product.allow_backorder &&
        inventoryQty < newQty
      ) {
        return { success: false, error: "Insufficient stock" };
      }

      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity: newQty,
          variant_id: effectiveVariantId,
          unit_price_at_add: effectivePrice,
          source_metadata: lineMeta as Json,
          ...(affiliateLinkId ? { affiliate_link_id: affiliateLinkId } : {}),
        })
        .eq("id", existingItem.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          cart_id: cart.id,
          product_id: productId,
          variant_id: effectiveVariantId,
          vendor_id: vendorId,
          quantity,
          unit_price_at_add: effectivePrice,
          currency_at_add: PLATFORM_CURRENCY,
          product_source: lineSource,
          source_metadata: lineMeta as Json,
          affiliate_link_id: affiliateLinkId,
        });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Add to cart error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CART
// ─────────────────────────────────────────────────────────────────────────────

export async function getCart() {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { cart: null, items: [], total: 0 };

      const { data: cart, error: cartError } = await supabase
        .from("carts")
        .select(`
          *,
          cart_items (
            *,
            products (
              id, name, slug, images, source, cj_last_synced_at,
              pricing_type, billing_period, product_type
            ),
            product_variants (
              id, name, options, image_url
            ),
            vendors (
              id, business_name, business_slug
            )
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cartError) throw cartError;
      if (!cart) return { cart: null, items: [], total: 0 };

      const items = (cart.cart_items as any[]) ?? [];
      const total = items.reduce(
        (sum, item) => sum + Number(item.unit_price_at_add) * Number(item.quantity),
        0
      );

      return { cart, items, total };
    } catch (error) {
      const canRetry = attempt < maxAttempts && isTransientNetworkError(error);
      if (canRetry) {
        await sleep(400 * attempt);
        continue;
      }
      if (isTransientNetworkError(error)) {
        console.warn("getCart: Supabase unreachable after retries. Returning empty cart.");
      } else {
        console.error("Get cart error:", error);
      }
      return { cart: null, items: [], total: 0 };
    }
  }
  return { cart: null, items: [], total: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// CART MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    if (quantity <= 0) return removeFromCart(itemId);

    const { data: item, error: iError } = await supabase
      .from("cart_items")
      .select("id, unit_price_at_add, carts!inner(user_id)")
      .eq("id", itemId)
      .eq("carts.user_id", user.id)
      .single();

    if (iError || !item) throw new Error("Item not found");

    const { error: uError } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId);

    if (uError) throw uError;

    return { success: true };
  } catch (error: any) {
    console.error("Update cart item error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCartItemVariant(cartItemId: string, variantId: string) {
  try {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(cartItemId) || !uuidRe.test(variantId)) {
      return { success: false, error: "Invalid item or variant ID" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: item, error: itemErr } = await supabase
      .from("cart_items")
      .select(`
        id, cart_id, product_id, variant_id, vendor_id, quantity, source_metadata, currency_at_add,
        carts!inner(user_id),
        products(id, source, source_metadata, price, currency, track_inventory, inventory_quantity, allow_backorder)
      `)
      .eq("id", cartItemId)
      .eq("carts.user_id", user.id)
      .single();

    if (itemErr || !item) return { success: false, error: "Item not found" };

    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    if (!product) return { success: false, error: "Product not found" };

    const { data: variant, error: vErr } = await supabase
      .from("product_variants")
      .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source")
      .eq("id", variantId)
      .eq("product_id", item.product_id)
      .single();

    if (vErr || !variant) return { success: false, error: "Variant not found" };

    const productSource = normalizeProductSource(product.source);
    const isCJ = isCJSource(productSource);
    const productMeta = (product.source_metadata as CJProductMeta) ?? {};

    let cjVid: string | null = null;
    let cjPid: string | null = productMeta.cj_pid ?? null;
    let variantWeight: number | null = null;

    if (isCJ) {
      cjVid = (variant.source_metadata as any)?.cj_vid ?? variant.cj_vid ?? null;
      cjPid = (variant.source_metadata as any)?.cj_pid ?? variant.cj_pid ?? cjPid;
      variantWeight = variant.weight ?? null;
      if (!cjVid) {
        return { success: false, error: "Selected option is unavailable. Please choose another." };
      }
    }

    const effectivePrice = toPlatformUsd(
      Number(variant.price) > 0 ? Number(variant.price) : Number(product.price),
      product.currency,
    );

    if (product.track_inventory && !product.allow_backorder) {
      const stock = variant.inventory_quantity ?? 0;
      if (stock < item.quantity) {
        return {
          success: false,
          error: stock === 0 ? "Out of stock" : `Only ${stock} available`,
        };
      }
    }

    const existingMeta = (item.source_metadata as Record<string, unknown>) ?? {};
    const lineMeta: Record<string, unknown> = isCJ
      ? { ...existingMeta, ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
      : { ...existingMeta };
    delete lineMeta.pending_variant_selection;

    const { data: duplicate } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", item.cart_id)
      .eq("product_id", item.product_id)
      .eq("variant_id", variantId)
      .neq("id", cartItemId)
      .maybeSingle();

    if (duplicate) {
      const { error: mergeError } = await supabase
        .from("cart_items")
        .update({
          quantity: duplicate.quantity + item.quantity,
          unit_price_at_add: effectivePrice,
          currency_at_add: PLATFORM_CURRENCY,
          source_metadata: lineMeta as Json,
        })
        .eq("id", duplicate.id);
      if (mergeError) throw mergeError;

      const { error: deleteError } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);
      if (deleteError) throw deleteError;
    } else {
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({
          variant_id: variantId,
          unit_price_at_add: effectivePrice,
          currency_at_add: PLATFORM_CURRENCY,
          source_metadata: lineMeta as Json,
        })
        .eq("id", cartItemId);
      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Update cart item variant error:", error);
    return { success: false, error: error.message };
  }
}

export async function removeFromCart(itemId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data: item, error: itemErr } = await supabase
      .from("cart_items")
      .select("id, cart_id, carts!inner(user_id)")
      .eq("id", itemId)
      .eq("carts.user_id", user.id)
      .single();

    if (itemErr || !item) throw new Error("Item not found");

    const { error: dError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (dError) throw dError;

    return { success: true };
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    return { success: false, error: error.message };
  }
}

export async function clearCart() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) return { success: true };

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Clear cart error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WISHLIST
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleWishlist(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

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
      revalidatePath("/marketplace");
      revalidatePath("/marketplace");
      return { success: true, inWishlist: false };
    } else {
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      revalidatePath("/marketplace");
      revalidatePath("/marketplace");
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

export async function getCartProductIds(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) return [];

    const { data } = await supabase
      .from("cart_items")
      .select("product_id")
      .eq("cart_id", cart.id);

    return (data ?? [])
      .map((r) => r.product_id)
      .filter((id): id is string => id !== null);
  } catch {
    return [];
  }
}

export async function checkProductInCart(
  productId: string
): Promise<{ inCart: boolean; itemId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { inCart: false };

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) return { inCart: false };

    const { data } = await supabase
      .from("cart_items")
      .select("id")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .limit(1);

    if (data && data.length > 0) return { inCart: true, itemId: data[0].id };
    return { inCart: false };
  } catch {
    return { inCart: false };
  }
}

export async function removeProductFromCart(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) return { success: false, error: "Item not in cart" };

    const { data: items } = await supabase
      .from("cart_items")
      .select("id")
      .eq("cart_id", cart.id)
      .eq("product_id", productId);

    if (!items?.length) return { success: false, error: "Item not in cart" };

    for (const item of items) {
      const result = await removeFromCart(item.id);
      if (!result.success) return result;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const adminClient = createServiceRoleClient();

    const { data: order, error: fetchErr } = await adminClient
      .from("orders")
      .select("id, buyer_id, status, cj_order_id, cj_fulfillment_status, integration_source")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) return { success: false, error: "Order not found" };
    if (order.buyer_id !== user.id) {
      return { success: false, error: "Action restricted to order owner" };
    }

    const currentStatus = order.status;

    if (newStatus === "completed") {
      const res = await finalizeAndCompleteOrder(
        orderId,
        user.id,
        "Buyer confirmed order completion."
      );
      return { success: res.success, error: res.error };
    }

    if (order.cj_order_id && newStatus === "delivered") {
      return {
        success: false,
        error:
          "This order's delivery is handled by our supplier and will update automatically when the carrier confirms delivery. Check your tracking number.",
      };
    }

    const allowed =
      (currentStatus === "shipped" && newStatus === "delivered") ||
      (currentStatus === "pending" && newStatus === "cancelled") ||
      (currentStatus === "confirmed" && newStatus === "cancelled");

    if (!allowed) {
      return {
        success: false,
        error: `Invalid transition: cannot move from ${currentStatus} to ${newStatus}`,
      };
    }

    const { error: updateErr } = await adminClient
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    await adminClient.from("order_status_history").insert({
      order_id: orderId,
      user_id: user.id,
      previous_status: currentStatus,
      new_status: newStatus,
      notes: `Buyer transitioned order to ${newStatus}`,
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order status error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function buyDirectCheckout(
  productId: string,
  vendorId: string,
  quantity: number = 1,
  variantId?: string | null
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const [productResult, variantsResult] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id, name, price, images, currency, source, source_metadata,
          affiliate_enabled, affiliate_commission_rate, affiliate_price,
          product_type, pricing_type, billing_period, digital_file_url,
          status, is_active, track_inventory, inventory_quantity, allow_backorder
        `)
        .eq("id", productId)
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source, options, is_active")
        .eq("product_id", productId)
        .eq("is_active", true),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) {
      return { success: false, error: "Product not found" };
    }
    if (product.status !== "active" || !product.is_active) {
      return { success: false, error: "Product is unavailable" };
    }

    const productSource = normalizeProductSource(product.source);
    const isCJ = isCJSource(productSource);
    const productMeta = (product.source_metadata as CJProductMeta) ?? {};
    const resolved = resolvePurchaseLine({
      product,
      variants: variantsResult.data ?? [],
      selectedVariantId: variantId && uuidRe.test(variantId) ? variantId : null,
    });
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const cjVid = resolved.cjVid;
    const cjPid = resolved.cjPid;
    const variantWeight = resolved.variantWeight;
    const effectiveVariantId = resolved.variantId;
    const effectivePrice = toPlatformUsd(resolved.price, product.currency);

    if (
      product.track_inventory &&
      !product.allow_backorder &&
      resolved.inventoryQty < quantity
    ) {
      return { success: false, error: "Insufficient stock" };
    }

    const totalAmount = Math.round(effectivePrice * quantity * 100) / 100;
    const isFree = effectivePrice === 0;
    const productType = product.product_type ?? (isCJ ? "physical" : "digital");
    const productCurrency = PLATFORM_CURRENCY;

    const cookieStore = await cookies();
    const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value ?? null;
    const refCode =
      cookieStore.get("jimvio_ref")?.value ??
      cookieStore.get("_aff_ref")?.value ??
      null;

    const affiliatesAllowed = supportsAffiliateCommission(
      productSource,
      product.affiliate_enabled ?? false,
    );

    let affiliateId: string | null = null;
    let commissionRate = 0;
    let commissionAmount = 0;

    if (refCode && affiliatesAllowed && !isFree) {
      const attribution = await buildLineAttribution({
        buyerUserId: user.id,
        productSource,
        affiliateEnabled: true,
        productCommissionRate: product.affiliate_commission_rate ?? null,
        affiliateFixedAmountUsd:
          product.affiliate_price != null && Number(product.affiliate_price) > 0
            ? toPlatformUsd(Number(product.affiliate_price), product.currency)
            : null,
        lineTotal: totalAmount,
        quantity,
        platformDefaultRate: await getDefaultAffiliateCommissionPercent(),
      });

      // Prefer explicit cookie code if buildLineAttribution used last-touch cookies;
      // when cookie resolves to a different inactive path, fall back to direct resolve.
      if (attribution) {
        affiliateId = attribution.affiliate_id;
        commissionRate = attribution.affiliate_commission_rate;
        commissionAmount = attribution.affiliate_commission_amount;
      } else {
        // buildLineAttribution already checked cookies; if null, try explicit ref
        // only when self-referral / window blocked it — do not invent rates client-side.
        const resolved = await resolveReferralCode(refCode);
        if (
          resolved &&
          !isSelfReferral(user.id, resolved.affiliateUserId)
        ) {
          // Cookie window may have expired; still no attribution.
        }
      }
    }

    const isDigital =
      productType === "digital" ||
      productType === "course" ||
      productType === "ebook" ||
      productType === "software" ||
      productType === "template";

    const admin = getAdminDB();

    const { data: order, error: createError } = await admin
      .from("orders")
      .insert({
        buyer_id: user.id,
        vendor_id: vendorId,
        status: isFree ? "confirmed" : "checkout_direct",
        payment_status: isFree ? "paid" : "pending",
        paid_at: isFree ? new Date().toISOString() : null,
        total_amount: totalAmount,
        subtotal: totalAmount,
        currency: productCurrency,
        integration_source: isCJ ? "cj" : null,
        referral_code: affiliateId && refCode ? refCode : null,
        affiliate_attributed_at: affiliateId ? new Date().toISOString() : null,
        metadata: {
          is_direct_checkout: true,
          ...(lastVideoId ? { video_id: lastVideoId } : {}),
          ...(affiliateId
            ? {
                affiliate_attribution: {
                  affiliate_id: affiliateId,
                  commission_rate: commissionRate,
                  commission_amount: commissionAmount,
                },
              }
            : {}),
        },
      })
      .select()
      .single();

    if (createError) throw createError;

    const lineSource = toOrderItemSource(product.source);
    const lineMeta: Record<string, unknown> = isCJ
      ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
      : { ...(productMeta as object) };

    const { data: insertedItem, error: insertError } = await admin
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: productId,
        variant_id: effectiveVariantId,
        vendor_id: vendorId,
        product_type: productType,
        product_name: product.name,
        product_image: (product.images as string[])?.[0] ?? null,
        quantity,
        unit_price: effectivePrice,
        total_price: totalAmount,
        affiliate_id: affiliateId,
        affiliate_commission_rate: commissionRate,
        affiliate_commission_amount: commissionAmount,
        product_source: lineSource,
        source_metadata: lineMeta as Json,
        pricing_type: product.pricing_type ?? "one_time",
        billing_period: product.billing_period ?? null,
        digital_download_url: !isCJ ? product.digital_file_url ?? null : null,
        access_granted_at: isFree && !isCJ ? new Date().toISOString() : null,
        metadata: { ...(lastVideoId ? { video_id: lastVideoId } : {}) },
      })
      .select()
      .single();

    if (insertError) {
      await admin.from("orders").delete().eq("id", order.id);
      throw insertError;
    }

    if (isFree && isDigital && !isCJ && insertedItem) {
      await grantDigitalAccess({
        userId: user.id,
        productId,
        orderItemId: insertedItem.id,
        orderId: order.id,
        accessUrl: product.digital_file_url ?? null,
        subtype: productType !== "digital" ? productType : null,
        pricingType: product.pricing_type ?? "one_time",
        billingPeriod: product.billing_period ?? null,
      });
    }

    return { success: true, orderId: order.id, isCJ };
  } catch (error: any) {
    console.error("Direct checkout error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductVariants(productId: string) {
  try {
    const supabase = await createClient();
    const [{ data: product }, { data, error }] = await Promise.all([
      supabase.from("products").select("track_inventory").eq("id", productId).maybeSingle(),
      supabase
        .from("product_variants")
        .select(`
          id, name, sku, price, compare_at_price,
          inventory_quantity, image_url, options, is_active,
          source, weight, length, width, height, volume,
          affiliate_price, affiliate_commission_rate,
          cj_vid, cj_pid
        `)
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ]);

    if (error) throw error;

    const trackInventory = Boolean(product?.track_inventory);
    const variants = filterStorefrontVariants(data ?? [], trackInventory);

    return { success: true, variants };
  } catch (error: any) {
    console.error("Get variants error:", error);
    return { success: false, error: error.message, variants: [] };
  }
}

export async function getFlashDeals() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, discount_label,
      images, category_id, shipping_from, delivery_time, product_type,
      affiliate_commission_rate, sold_count, claimed_pct,
      is_free_shipping, rating, review_count, vendor_id,
      vendors(id, verification_status),
      product_categories ( name, slug )
    `)
    .eq("is_flash_deal", true)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(12);

  return data ?? [];
}

type ProductTypeEnum =
  | "physical" | "digital" | "subscription" | "course"
  | "software" | "template" | "ebook" | "coaching"
  | "community" | "bundle";

export async function getTrendingProducts(filters?: {
  category?: string;
  product_type?: ProductTypeEnum;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, discount_label,
      images, category_id, shipping_from, delivery_time, product_type,
      affiliate_commission_rate, sale_count, rating, review_count,
      is_free_shipping, is_flash_deal, vendor_id,
      source, source_metadata, track_inventory,
      product_variants (
        id, name, price, image_url, options,
        is_active, inventory_quantity,
        cj_vid, cj_pid, source, source_metadata,
        weight, sku
      ),
      product_categories ( name, slug )
    `)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(24);

  if (filters?.product_type) {
    query = query.eq("product_type", filters.product_type);
  }

  const { data } = await query;

  const products = (data ?? []).map((p) => ({
    ...p,
    product_variants: filterStorefrontVariants(
      (p.product_variants ?? []).map((v: any) => ({
        ...v,
        cj_vid: v.cj_vid ?? v.source_metadata?.cj_vid ?? null,
        cj_pid: v.cj_pid ?? v.source_metadata?.cj_pid ?? null,
      })),
      Boolean(p.track_inventory)
    ),
  }));

  if (filters?.category && filters.category !== "" && filters.category !== "Select category") {
    return products.filter((p) => {
      const cat = Array.isArray(p.product_categories)
        ? p.product_categories[0]
        : p.product_categories;
      return (cat as { name?: string } | null)?.name === filters.category;
    });
  }

  return products;
}

export async function getShopCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name, slug, product_count, image_url, tint_color, icon")
    .eq("is_active", true)
    .eq("visible", true)
    .order("sort_order")
    .limit(7);

  return data ?? [];
}