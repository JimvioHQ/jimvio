import { createClient } from "@/lib/supabase/server";
import { getVendorOrderStats } from "@/services/vendors";

export interface AdminVendorDetail {
    id: string;
    user_id: string;
    business_name: string;
    business_slug: string;
    business_description: string | null;
    business_logo: string | null;
    business_banner: string | null;
    business_email: string | null;
    business_phone: string | null;
    business_address: string | null;
    business_country: string | null;
    business_type: string | null;
    product_categories: string | null;
    tax_id: string | null;
    website: string | null;
    verification_status: string;
    verification_notes: string | null;
    verified_at: string | null;
    rating: number;
    total_sales: number;
    total_revenue: number;
    commission_rate: number;
    affiliate_enabled: boolean;
    affiliate_commission_rate: number;
    payout_method: string | null;
    payout_account: string | null;
    is_featured: boolean;
    is_active: boolean;
    follower_count: number;
    response_time: string | null;
    created_at: string | null;
    updated_at: string | null;

    // owner profile
    owner_name: string | null;
    owner_email: string | null;
    owner_avatar: string | null;
    owner_two_factor: boolean;
    owner_is_verified: boolean;

    // stats
    products_count: number;
    active_products_count: number;
    draft_products_count: number;

    // shopify
    shopify_connected: boolean;
    shopify_domain: string | null;
    shopify_last_synced: string | null;

    // recent orders
    recent_orders: Array<{
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        total_amount: number;
        currency: string;
        created_at: string | null;
    }>;

    // recent products
    recent_products: Array<{
        id: string;
        name: string;
        status: string;
        price: number;
        currency: string;
        sale_count: number;
        rating: number;
        product_type: string;
        created_at: string | null;
    }>;
}

export async function getAdminVendorById(vendorId: string): Promise<AdminVendorDetail | null> {
    const supabase = await createClient();

    const [
        vendorRes,
        productsRes,
        shopifyRes,
        ordersRes,
        recentProductsRes,
    ] = await Promise.all([
        supabase
            .from("vendors")
            .select(`
                *,
                profiles!vendors_user_id_fkey (
                    full_name, email, avatar_url,
                    two_factor_enabled, is_verified
                )
            `)
            .eq("id", vendorId)
            .single(),

        supabase
            .from("products")
            .select("status", { count: "exact" })
            .eq("vendor_id", vendorId)
            .is("deleted_at", null),

        supabase
            .from("shopify_credentials")
            .select("shop_domain, last_synced_at, is_active")
            .eq("vendor_id", vendorId)
            .maybeSingle(),

        supabase
            .from("orders")
            .select("id, order_number, status, payment_status, total_amount, currency, created_at")
            .eq("vendor_id", vendorId)
            .order("created_at", { ascending: false })
            .limit(6),

        supabase
            .from("products")
            .select("id, name, status, price, currency, sale_count, rating, product_type, created_at")
            .eq("vendor_id", vendorId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    if (vendorRes.error || !vendorRes.data) return null;

    const v = vendorRes.data;
    const profile = (v as any).profiles as any;
    const allProducts = productsRes.data ?? [];
    const sh = shopifyRes.data;
    const orderStats = await getVendorOrderStats(vendorId);

    return {
        id: v.id,
        user_id: v.user_id,
        business_name: v.business_name,
        business_slug: v.business_slug,
        business_description: v.business_description ?? null,
        business_logo: v.business_logo ?? null,
        business_banner: v.business_banner ?? null,
        business_email: v.business_email ?? null,
        business_phone: v.business_phone ?? null,
        business_address: v.business_address ?? null,
        business_country: v.business_country ?? null,
        business_type: v.business_type ?? null,
        product_categories: v.product_categories ?? null,
        tax_id: v.tax_id ?? null,
        website: v.website ?? null,
        verification_status: (v.verification_status as string) ?? "pending",
        verification_notes: v.verification_notes ?? null,
        verified_at: v.verified_at ?? null,
        rating: Number(v.rating ?? 0),
        total_sales: orderStats.sales,
        total_revenue: orderStats.revenue,
        commission_rate: Number(v.commission_rate ?? 0),
        affiliate_enabled: v.affiliate_enabled ?? true,
        affiliate_commission_rate: Number(v.affiliate_commission_rate ?? 0),
        payout_method: v.payout_method ?? null,
        payout_account: v.payout_account ?? null,
        is_featured: v.is_featured ?? false,
        is_active: v.is_active ?? true,
        follower_count: Number(v.follower_count ?? 0),
        response_time: v.response_time ?? null,
        created_at: v.created_at ?? null,
        updated_at: v.updated_at ?? null,

        owner_name: profile?.full_name ?? null,
        owner_email: profile?.email ?? null,
        owner_avatar: profile?.avatar_url ?? null,
        owner_two_factor: profile?.two_factor_enabled ?? false,
        owner_is_verified: profile?.is_verified ?? false,

        products_count: productsRes.count ?? 0,
        active_products_count: allProducts.filter((p: any) => p.status === "active").length,
        draft_products_count: allProducts.filter((p: any) => p.status === "draft").length,

        shopify_connected: sh?.is_active ?? false,
        shopify_domain: sh?.shop_domain ?? null,
        shopify_last_synced: sh?.last_synced_at ?? null,

        recent_orders: (ordersRes.data ?? []).map((o) => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status as string,
            payment_status: o.payment_status as string,
            total_amount: Number(o.total_amount),
            currency: o.currency ?? "RWF",
            created_at: o.created_at ?? null,
        })),

        recent_products: (recentProductsRes.data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status as string,
            price: Number(p.price ?? 0),
            currency: p.currency ?? "RWF",
            sale_count: Number(p.sale_count ?? 0),
            rating: Number(p.rating ?? 0),
            product_type: p.product_type as string,
            created_at: p.created_at ?? null,
        })),
    };
}