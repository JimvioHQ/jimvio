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
// import { createServiceClient } from "../supabase/service";
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

// /** True when Node/undici could not reach Supabase (VPN, Wi‑Fi, or cold edge). */
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
//         // Expose source so UI can show "Ships from CJ" badge
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
//       supabase
//         .from("order_items")
//         .select("quantity, orders!inner(id, metadata)")
//         .eq("orders.buyer_id", user.id)
//         .eq("orders.status", "pending"),
//       supabase
//         .from("notifications")
//         .select("id", { count: "exact", head: true })
//         .eq("user_id", user.id)
//         .eq("is_read", false),
//     ]);

//     const totalItems =
//       cartResult.data
//         ?.filter((item) => !(item.orders as any)?.metadata?.is_direct_checkout)
//         ?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0;

//     const chatCount = notificationResult.count ?? 0;

//     return { cartCount: totalItems, chatCount };
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
//   /** Optional — pass the selected variant ID for CJ multi-variant products. */
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
//     const [productResult, variantResult, orderResult] = await Promise.all([
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

//       // Only fetch variant when variantId is provided (CJ multi-variant products)
//       variantId && uuidRe.test(variantId)
//         ? supabase
//           .from("product_variants")
//           .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source")
//           .eq("id", variantId)
//           .eq("product_id", productId) // safety: variant must belong to product
//           .single()
//         : Promise.resolve({ data: null, error: null }),

//       supabase
//         .from("orders")
//         .select("id, currency, metadata")
//         .eq("buyer_id", user.id)
//         .eq("vendor_id", vendorId)
//         .eq("status", "pending")
//         .not("metadata->>is_direct_checkout", "eq", "true")
//         .maybeSingle(),
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
//         // Multi-variant CJ product — use selected variant's cj_vid
//         const v = variantResult.data;
//         cjVid = (v.source_metadata as any)?.cj_vid ?? v.cj_vid ?? null;
//         cjPid = (v.source_metadata as any)?.cj_pid ?? v.cj_pid ?? cjPid;
//         variantWeight = v.weight ?? null;
//       } else {
//         // Single-variant CJ product — cj_vid stored on product's source_metadata
//         cjVid = productMeta.cj_vid ?? null;
//         variantWeight = productMeta.cj_weight ?? null;
//       }

//       if (!cjVid) {
//         return {
//           success: false,
//           error: "This CJ product is missing variant information. Please contact support.",
//         };
//       }
//     }

//     // ── Effective price: variant price overrides product price ───────────────
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

//     // ── Currency / pricing normalisation ────────────────────────────────────
//     const productCurrency = product.currency?.toUpperCase() || "RWF";
//     const pricingType =
//       product.pricing_type === "recurring" ? "recurring" : "one_time";
//     const billingPeriod =
//       pricingType === "recurring" ? (product.billing_period ?? "monthly") : null;

//     // ── Resolve or create a pending order ────────────────────────────────────
//     let order = orderResult.data;
//     if (order && order.currency !== productCurrency) order = null;

//     if (!order) {
//       const { data: newOrder, error: createError } = await supabase
//         .from("orders")
//         .insert({
//           buyer_id: user.id,
//           vendor_id: vendorId,
//           status: "pending",
//           total_amount: effectivePrice * quantity,
//           subtotal: effectivePrice * quantity,
//           currency: productCurrency,
//           // Tag CJ orders at creation for downstream fulfillment routing
//           integration_source: isCJ ? "cj" : null,
//         })
//         .select()
//         .single();

//       if (createError) throw createError;
//       order = newOrder;
//     }
//     if (!order) throw new Error("Could not retrieve or create order");
//     const orderId = order.id;

//     // ── Affiliate / referral resolution ──────────────────────────────────────
//     const cookieStore = await cookies();
//     const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value ?? null;
//     const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

//     let affiliateId: string | null = null;
//     // CJ products never earn affiliate commissions (platform absorbs margin)
//     const affiliatesAllowed = supportsAffiliateCommission(
//       productSource,
//       product.affiliate_enabled ?? false
//     );

//     let commissionRate: number = affiliatesAllowed
//       ? (product.affiliate_commission_rate ??
//         (await getDefaultAffiliateCommissionPercent()))
//       : 0;

//     // Attach video_id to order metadata once
//     if (lastVideoId && !(order.metadata as any)?.video_id) {
//       await supabase
//         .from("orders")
//         .update({ metadata: { ...((order.metadata as any) || {}), video_id: lastVideoId } })
//         .eq("id", orderId);
//     }

//     if (refCode && affiliatesAllowed) {
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

//     // ── Build source_metadata for order_items ────────────────────────────────
//     const videoMeta = lastVideoId ? { video_id: lastVideoId } : {};

//     // CJ items carry their variant reference so the fulfillment edge function
//     // knows exactly what to submit to CJ's createOrder API.
//     const lineMeta: Record<string, unknown> = isCJ
//       ? {
//         ...productMeta,
//         cj_pid: cjPid,
//         cj_vid: cjVid,
//         cj_weight: variantWeight,
//       }
//       : { ...(productMeta as object) };

//     const lineSource = toOrderItemSource(product.source);
//     let existingQuery = supabase
//       .from("order_items")
//       .select("id, quantity, metadata")
//       .eq("order_id", orderId)
//       .eq("product_id", productId);

//     if (variantId) {
//       existingQuery = existingQuery.eq("variant_id", variantId);
//     }

//     const { data: resolvedExisting } = await existingQuery.maybeSingle();

//     if (resolvedExisting) {
//       const newQty = resolvedExisting.quantity + quantity;

//       // Re-check inventory against combined quantity
//       if (
//         product.track_inventory &&
//         !product.allow_backorder &&
//         inventoryQty < newQty
//       ) {
//         return { success: false, error: "Insufficient stock" };
//       }

//       const newTotal = effectivePrice * newQty;
//       const newCommAmount = affiliateId ? (newTotal * commissionRate) / 100 : 0;

//       const { error: updateError } = await supabase
//         .from("order_items")
//         .update({
//           quantity: newQty,
//           unit_price: effectivePrice,
//           total_price: newTotal,
//           affiliate_id: affiliateId,
//           affiliate_commission_rate: commissionRate,
//           affiliate_commission_amount: newCommAmount,
//           product_source: lineSource,
//           source_metadata: lineMeta as Json,
//           metadata: { ...((resolvedExisting.metadata as any) || {}), ...videoMeta },
//         })
//         .eq("id", resolvedExisting.id);

//       if (updateError) throw updateError;
//     } else {
//       const totalPrice = effectivePrice * quantity;
//       const initialCommAmount = affiliateId
//         ? (totalPrice * commissionRate) / 100
//         : 0;

//       const { error: insertError } = await supabase.from("order_items").insert({
//         order_id: orderId,
//         product_id: productId,
//         variant_id: variantId ?? null,
//         vendor_id: vendorId,
//         product_type: product.product_type ?? "physical",
//         product_name: product.name,
//         product_image: (product.images as string[])?.[0] ?? null,
//         quantity,
//         unit_price: effectivePrice,
//         total_price: totalPrice,
//         affiliate_id: affiliateId,
//         affiliate_commission_rate: commissionRate,
//         affiliate_commission_amount: initialCommAmount,
//         product_source: lineSource,
//         source_metadata: lineMeta as Json,
//         pricing_type: pricingType,
//         billing_period: billingPeriod,
//         metadata: videoMeta,
//       });

//       if (insertError) throw insertError;
//     }

//     // Order totals updated automatically by tr_update_order_totals trigger.
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
//       if (!user) return { orders: [], total: 0 };

//       const { data: orders, error } = await supabase
//         .from("orders")
//         .select(`
//           *,
//           vendors (id, business_name, business_slug),
//           order_items (
//             *,
//             products (source, cj_last_synced_at)
//           )
//         `)
//         .eq("buyer_id", user.id)
//         .eq("status", "pending")
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       const list = (orders || []).filter((order) => {
//         if ((order.metadata as any)?.is_direct_checkout === true) return false;
//         const items = order.order_items as unknown[] | undefined;
//         return Array.isArray(items) && items.length > 0;
//       });

//       const total = list.reduce((sum, order) => {
//         const items = order.order_items as { total_price: number }[] | undefined;
//         const lineSum =
//           items?.reduce((s, i) => s + Number(i.total_price), 0) ??
//           Number(order.total_amount);
//         return sum + lineSum;
//       }, 0);

//       return { orders: list, total };
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
//       return { orders: [], total: 0 };
//     }
//   }
//   return { orders: [], total: 0 };
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

//     const { data: item, error: iError } = await supabase
//       .from("order_items")
//       .select("*, orders!inner(buyer_id, status)")
//       .eq("id", itemId)
//       .eq("orders.buyer_id", user.id)
//       .eq("orders.status", "pending")
//       .single();

//     if (iError || !item) throw new Error("Item not found");

//     const newTotalPrice = Number(item.unit_price) * quantity;

//     const { error: uError } = await supabase
//       .from("order_items")
//       .update({ quantity, total_price: newTotalPrice })
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
//     // anon client — auth + ownership checks only
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) throw new Error("Authentication required");

//     const { data: line, error: lineErr } = await supabase
//       .from("order_items")
//       .select("id, order_id")
//       .eq("id", itemId)
//       .maybeSingle();

//     if (lineErr || !line) throw new Error("Item not found");

//     const { data: ord, error: ordErr } = await supabase
//       .from("orders")
//       .select("id, buyer_id, status")
//       .eq("id", line.order_id)
//       .single();

//     if (
//       ordErr ||
//       !ord ||
//       ord.buyer_id !== user.id ||
//       ord.status !== "pending"
//     ) {
//       throw new Error("Item not found");
//     }


//     const service = getAdminDB();

//     const { data: removed, error: dError } = await service
//       .from("order_items")
//       .delete()
//       .eq("id", itemId)
//       .eq("order_id", line.order_id)
//       .select("id");

//     if (dError) throw dError;
//     if (!removed?.length) throw new Error("Could not remove item. Please try again.");

//     // Check remaining items and delete empty order if needed
//     const { data: remainingItems } = await service
//       .from("order_items")
//       .select("id")
//       .eq("order_id", line.order_id);

//     if (!remainingItems || remainingItems.length === 0) {
//       const { error: delOrdErr } = await service
//         .from("orders")
//         .delete()
//         .eq("id", line.order_id);

//       if (delOrdErr) {
//         console.warn("removeFromCart: could not delete empty pending order:", delOrdErr);
//       }
//     }

//     return { success: true };
//   } catch (error: any) {
//     console.error("Remove from cart error:", error);
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
//       revalidatePath("/dashboard/wishlist");
//       revalidatePath("/dashboard/marketplace");
//       return { success: true, inWishlist: false };
//     } else {
//       const { error } = await supabase
//         .from("wishlists")
//         .insert({ user_id: user.id, product_id: productId });
//       if (error) throw error;
//       revalidatePath("/dashboard/wishlist");
//       revalidatePath("/dashboard/marketplace");
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

//     const { data } = await supabase
//       .from("order_items")
//       .select("product_id, orders!inner(buyer_id, status, metadata)")
//       .eq("orders.buyer_id", user.id)
//       .eq("orders.status", "pending")
//       .not("orders.metadata->>is_direct_checkout", "eq", "true");

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

//     const { data } = await supabase
//       .from("order_items")
//       .select("id, orders!inner(buyer_id, status)")
//       .eq("product_id", productId)
//       .eq("orders.buyer_id", user.id)
//       .eq("orders.status", "pending")
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

//     const { data: item } = await supabase
//       .from("order_items")
//       .select("id, orders!inner(buyer_id, status)")
//       .eq("product_id", productId)
//       .eq("orders.buyer_id", user.id)
//       .eq("orders.status", "pending")
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

//     // Delegate completed transition to lifecycle handler
//     if (newStatus === "completed") {
//       const res = await finalizeAndCompleteOrder(
//         orderId,
//         user.id,
//         "Buyer confirmed order completion."
//       );
//       return { success: res.success, error: res.error };
//     }

//     // CJ orders: block manual delivered transition — driven by CJ sync
//     if (order.cj_order_id && newStatus === "delivered") {
//       return {
//         success: false,
//         error:
//           "CJ orders update automatically once the carrier confirms delivery. Check your tracking number.",
//       };
//     }

//     // Buyer state machine
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

//     revalidatePath(`/dashboard/orders/${orderId}`);
//     return { success: true };
//   } catch (error: any) {
//     console.error("Update order status error:", error);
//     return { success: false, error: error.message };
//   }
// }


// export async function buyDirectCheckout(
//   productId: string,
//   vendorId: string,
//   quantity: number = 1,
//   /** Optional — pass the selected variant ID for CJ multi-variant products. */
//   variantId?: string | null
// ) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return { success: false, error: "Authentication required" };

//     const uuidRe =
//       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

//     // ── Parallel fetches ─────────────────────────────────────────────────────
//     const [productResult, variantResult] = await Promise.all([
//       supabase
//         .from("products")
//         .select(`
//           id, name, price, images, currency, source, source_metadata,
//           affiliate_enabled, affiliate_commission_rate,
//           product_type, pricing_type, billing_period, digital_file_url
//         `)
//         .eq("id", productId)
//         .single(),

//       variantId && uuidRe.test(variantId)
//         ? supabase
//           .from("product_variants")
//           .select("id, cj_vid, cj_pid, price, source_metadata, weight, source")
//           .eq("id", variantId)
//           .eq("product_id", productId)
//           .single()
//         : Promise.resolve({ data: null, error: null }),
//     ]);

//     const product = productResult.data;
//     if (productResult.error || !product) throw new Error("Product not found");

//     // ── CJ variant resolution ────────────────────────────────────────────────
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
//           error: "This CJ product is missing variant information. Please contact support.",
//         };
//       }
//     }

//     // ── Effective price ──────────────────────────────────────────────────────
//     const effectivePrice =
//       variant && Number(variant.price) > 0
//         ? Number(variant.price)
//         : Number(product.price);

//     const totalAmount = effectivePrice * quantity;
//     const isFree = effectivePrice === 0;
//     // CJ products are always physical — never default to "digital"
//     const productType = product.product_type ?? (isCJ ? "physical" : "digital");
//     const productCurrency = product.currency?.toUpperCase() || "RWF";

//     // ── Affiliate resolution ─────────────────────────────────────────────────
//     const cookieStore = await cookies();
//     const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value ?? null;
//     const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

//     const affiliatesAllowed = supportsAffiliateCommission(
//       productSource,
//       product.affiliate_enabled ?? false
//     );

//     let affiliateId: string | null = null;
//     let commissionRate: number =
//       !isFree && affiliatesAllowed
//         ? (product.affiliate_commission_rate ??
//           (await getDefaultAffiliateCommissionPercent()))
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

//     // ── Create order ─────────────────────────────────────────────────────────
//     const { data: order, error: createError } = await supabase
//       .from("orders")
//       .insert({
//         buyer_id: user.id,
//         vendor_id: vendorId,
//         status: isFree ? "confirmed" : "pending",
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

//     // ── Build order item source_metadata ─────────────────────────────────────
//     const lineSource = toOrderItemSource(product.source);
//     const commissionAmount = affiliateId
//       ? (totalAmount * commissionRate) / 100
//       : 0;

//     const lineMeta: Record<string, unknown> = isCJ
//       ? {
//         ...productMeta,
//         cj_pid: cjPid,
//         cj_vid: cjVid,
//         cj_weight: variantWeight,
//       }
//       : { ...(productMeta as object) };

//     // ── Insert order item ────────────────────────────────────────────────────
//     const { data: insertedItem, error: insertError } = await supabase
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
//         digital_download_url: !isCJ ? (product.digital_file_url ?? null) : null,
//         access_granted_at: isFree && !isCJ ? new Date().toISOString() : null,
//         metadata: { ...(lastVideoId ? { video_id: lastVideoId } : {}) },
//       })
//       .select()
//       .single();

//     if (insertError) throw insertError;

//     // ── Grant digital access (non-CJ free products only) ────────────────────
//     const isDigital = productType === "digital" || productType === "course" ||
//       productType === "ebook" || productType === "software" ||
//       productType === "template";

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


// export async function getProductVariants(productId: string) {
//   try {
//     const supabase = await createClient();
//     const { data, error } = await supabase
//       .from("product_variants")
//       .select(`
//         id, name, sku, price, compare_at_price,
//         inventory_quantity, image_url, options, is_active
//       `)
//       .eq("product_id", productId)
//       .eq("is_active", true)
//       .order("created_at", { ascending: true });

//     if (error) throw error;
//     return { success: true, variants: data ?? [] };
//   } catch (error: any) {
//     console.error("Get variants error:", error);
//     return { success: false, error: error.message, variants: [] };
//   }
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

interface CJProductMeta {
  cj_pid?: string;
  cj_vid?: string;
  cj_weight?: number;
  [key: string]: unknown;
}

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
    if (!user) return { success: false, error: "Authentication required" };

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
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id, buyer_id" }
      )
      .select()
      .single();

    if (error) throw error;
    if (productId) revalidatePath("/marketplace");
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

    const [cartResult, notificationResult] = await Promise.all([
      // Use the carts table — item_count is maintained by the recompute_cart_totals trigger
      supabase
        .from("carts")
        .select("item_count")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    const cartCount = cartResult.data?.item_count ?? 0;
    const chatCount = notificationResult.count ?? 0;

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
  variantId?: string | null
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

    // ── Parallel fetches ─────────────────────────────────────────────────────
    const [productResult, variantResult] = await Promise.all([
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

      variantId && uuidRe.test(variantId)
        ? supabase
          .from("product_variants")
          .select("id, cj_vid, cj_pid, price, inventory_quantity, source_metadata, weight, source")
          .eq("id", variantId)
          .eq("product_id", productId)
          .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) {
      return { success: false, error: "Product not found" };
    }
    if (product.status !== "active" || !product.is_active) {
      return { success: false, error: "Product is unavailable" };
    }

    // ── CJ-specific: resolve cj_vid from variant or product metadata ─────────
    const productSource = normalizeProductSource(product.source);
    const isCJ = isCJSource(productSource);
    const productMeta = (product.source_metadata as CJProductMeta) ?? {};

    let cjVid: string | null = null;
    let cjPid: string | null = productMeta.cj_pid ?? null;
    let variantWeight: number | null = null;

    if (isCJ) {
      if (variantResult.data) {
        const v = variantResult.data;
        cjVid = (v.source_metadata as any)?.cj_vid ?? v.cj_vid ?? null;
        cjPid = (v.source_metadata as any)?.cj_pid ?? v.cj_pid ?? cjPid;
        variantWeight = v.weight ?? null;
      } else {
        cjVid = productMeta.cj_vid ?? null;
        variantWeight = productMeta.cj_weight ?? null;
      }

      if (!cjVid) {
        return {
          success: false,
          error: "This CJ product is missing variant information. Please contact support.",
        };
      }
    }

    // ── Effective price ───────────────────────────────────────────────────────
    const variant = variantResult.data;
    const effectivePrice =
      variant && Number(variant.price) > 0
        ? Number(variant.price)
        : Number(product.price);

    // ── Inventory check ───────────────────────────────────────────────────────
    const inventoryQty = variant
      ? (variant.inventory_quantity ?? 0)
      : (product.inventory_quantity ?? 0);

    if (
      product.track_inventory &&
      !product.allow_backorder &&
      inventoryQty < quantity
    ) {
      return { success: false, error: "Insufficient stock" };
    }

    // ── Affiliate / referral resolution ──────────────────────────────────────
    const cookieStore = await cookies();
    const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

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

    // ── Build source_metadata for cart_items ─────────────────────────────────
    const lineMeta: Record<string, unknown> = isCJ
      ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
      : { ...(productMeta as object) };

    const lineSource = toOrderItemSource(product.source);

    // ── Get or create the user's cart ─────────────────────────────────────────
    // The add_to_cart DB function handles this atomically, but we use the
    // client-side path here so we can pass the full source_metadata.
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .upsert(
        { user_id: user.id, currency: product.currency?.toUpperCase() || "RWF" },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (cartError || !cart) throw cartError ?? new Error("Could not get or create cart");

    // ── Check for existing line item ──────────────────────────────────────────
    // Must match on variant_id exactly (null vs non-null are different lines).
    const existingQuery = supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId);

    const { data: existingItem } = variantId
      ? await existingQuery.eq("variant_id", variantId).maybeSingle()
      : await existingQuery.is("variant_id", null).maybeSingle();

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      // Re-check inventory against combined quantity
      if (
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
          unit_price_at_add: effectivePrice,
          source_metadata: lineMeta as Json,
        })
        .eq("id", existingItem.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert({
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId ?? null,
          vendor_id: vendorId,
          quantity,
          unit_price_at_add: effectivePrice,
          currency_at_add: product.currency?.toUpperCase() || "RWF",
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

    // Verify ownership via cart join
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

export async function removeFromCart(itemId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Verify the item belongs to this user's cart
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
      .maybeSingle();

    if (data) return { inCart: true, itemId: data.id };
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

    const { data: item } = await supabase
      .from("cart_items")
      .select("id")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (!item) return { success: false, error: "Item not in cart" };
    return removeFromCart(item.id);
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
          "CJ orders update automatically once the carrier confirms delivery. Check your tracking number.",
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

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order status error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT CHECKOUT  (bypasses cart — creates an order directly)
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

    const [productResult, variantResult] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id, name, price, images, currency, source, source_metadata,
          affiliate_enabled, affiliate_commission_rate,
          product_type, pricing_type, billing_period, digital_file_url,
          status, is_active
        `)
        .eq("id", productId)
        .single(),

      variantId && uuidRe.test(variantId)
        ? supabase
          .from("product_variants")
          .select("id, cj_vid, cj_pid, price, source_metadata, weight, source")
          .eq("id", variantId)
          .eq("product_id", productId)
          .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const product = productResult.data;
    if (productResult.error || !product) throw new Error("Product not found");
    if (product.status !== "active" || !product.is_active) {
      return { success: false, error: "Product is unavailable" };
    }

    const productSource = normalizeProductSource(product.source);
    const isCJ = isCJSource(productSource);
    const productMeta = (product.source_metadata as CJProductMeta) ?? {};
    const variant = variantResult.data;

    let cjVid: string | null = null;
    let cjPid: string | null = productMeta.cj_pid ?? null;
    let variantWeight: number | null = null;

    if (isCJ) {
      if (variant) {
        cjVid = (variant.source_metadata as any)?.cj_vid ?? variant.cj_vid ?? null;
        cjPid = (variant.source_metadata as any)?.cj_pid ?? variant.cj_pid ?? cjPid;
        variantWeight = variant.weight ?? null;
      } else {
        cjVid = productMeta.cj_vid ?? null;
        variantWeight = productMeta.cj_weight ?? null;
      }

      if (!cjVid) {
        return {
          success: false,
          error: "This CJ product is missing variant information. Please contact support.",
        };
      }
    }

    const effectivePrice =
      variant && Number(variant.price) > 0
        ? Number(variant.price)
        : Number(product.price);

    const totalAmount = effectivePrice * quantity;
    const isFree = effectivePrice === 0;
    const productType = product.product_type ?? (isCJ ? "physical" : "digital");
    const productCurrency = product.currency?.toUpperCase() || "RWF";

    const cookieStore = await cookies();
    const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value ?? null;
    const refCode = cookieStore.get("jimvio_ref")?.value ?? null;

    const affiliatesAllowed = supportsAffiliateCommission(
      productSource,
      product.affiliate_enabled ?? false
    );

    let affiliateId: string | null = null;
    let commissionRate: number =
      !isFree && affiliatesAllowed
        ? (product.affiliate_commission_rate ??
          (await getDefaultAffiliateCommissionPercent()))
        : 0;

    if (refCode && affiliatesAllowed && !isFree) {
      if (refCode.startsWith("LNK-")) {
        const { data: link } = await supabase
          .from("affiliate_links")
          .select("affiliate_id, commission_rate")
          .eq("link_code", refCode)
          .maybeSingle();
        if (link) {
          affiliateId = link.affiliate_id;
          commissionRate = link.commission_rate ?? commissionRate;
        }
      } else {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id")
          .eq("affiliate_code", refCode)
          .maybeSingle();
        if (aff) affiliateId = aff.id;
      }
    }

    const { data: order, error: createError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        vendor_id: vendorId,
        status: isFree ? "confirmed" : "pending",
        payment_status: isFree ? "paid" : "pending",
        paid_at: isFree ? new Date().toISOString() : null,
        total_amount: totalAmount,
        subtotal: totalAmount,
        currency: productCurrency,
        integration_source: isCJ ? "cj" : null,
        metadata: {
          is_direct_checkout: true,
          ...(lastVideoId ? { video_id: lastVideoId } : {}),
        },
      })
      .select()
      .single();

    if (createError) throw createError;

    const lineSource = toOrderItemSource(product.source);
    const commissionAmount = affiliateId
      ? (totalAmount * commissionRate) / 100
      : 0;

    const lineMeta: Record<string, unknown> = isCJ
      ? { ...productMeta, cj_pid: cjPid, cj_vid: cjVid, cj_weight: variantWeight }
      : { ...(productMeta as object) };

    const { data: insertedItem, error: insertError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: productId,
        variant_id: variantId ?? null,
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
        digital_download_url: !isCJ ? (product.digital_file_url ?? null) : null,
        access_granted_at: isFree && !isCJ ? new Date().toISOString() : null,
        metadata: { ...(lastVideoId ? { video_id: lastVideoId } : {}) },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const isDigital =
      productType === "digital" || productType === "course" ||
      productType === "ebook" || productType === "software" ||
      productType === "template";

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
    const { data, error } = await supabase
      .from("product_variants")
      .select(`
        id, name, sku, price, compare_at_price,
        inventory_quantity, image_url, options, is_active
      `)
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, variants: data ?? [] };
  } catch (error: any) {
    console.error("Get variants error:", error);
    return { success: false, error: error.message, variants: [] };
  }
}