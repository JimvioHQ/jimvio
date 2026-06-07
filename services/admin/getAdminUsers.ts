import { createClient } from "@/lib/supabase/server";
import { VerificationStatus } from "@/types/db";

export interface AdminUserRow {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    is_verified: boolean;
    is_active: boolean;
    two_factor_enabled: boolean;
    created_at: string | null;
    roles: string[];
    vendor_id: string | null;
    vendor_name: string | null;
    vendor_status: string | null;
    affiliate_code: string | null;
    influencer_name: string | null;
}

export async function getAdminUsers(
    q?: string,
    role?: string,
    status?: string,
    limit = 100,
    offset = 0,
): Promise<{ users: AdminUserRow[]; total: number }> {
    const supabase = await createClient();

    let query = supabase
        .from("profiles")
        .select(
            `
            id,
            email,
            full_name,
            avatar_url,
            country,
            is_verified,
            is_active,
            two_factor_enabled,
            created_at,
            user_roles ( role, is_active ),
            vendors ( id, business_name, verification_status ),
            affiliates ( affiliate_code ),
            influencers ( display_name )
            `,
            { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (q) {
        query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    if (status === "active") {
        query = query.eq("is_active", true);
    } else if (status === "inactive") {
        query = query.eq("is_active", false);
    } else if (status === "verified") {
        query = query.eq("is_verified", true);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    let rows: AdminUserRow[] = (data ?? []).map((p: any) => {
        const activeRoles: string[] = (p.user_roles ?? [])
            .filter((r: any) => r.is_active)
            .map((r: any) => r.role as string);

        if (p.vendors?.length > 0 && !activeRoles.includes("vendor")) {
            activeRoles.push("vendor");
        }
        if (p.affiliates?.length > 0 && !activeRoles.includes("affiliate")) {
            activeRoles.push("affiliate");
        }
        if (p.influencers?.length > 0 && !activeRoles.includes("influencer")) {
            activeRoles.push("influencer");
        }
        if (activeRoles.length === 0) activeRoles.push("buyer");

        const vendor = p.vendors?.[0] ?? null;
        const affiliate = p.affiliates?.[0] ?? null;
        const influencer = p.influencers?.[0] ?? null;

        return {
            id: p.id,
            email: p.email,
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
            country: p.country ?? null,
            is_verified: p.is_verified ?? false,
            is_active: p.is_active ?? true,
            two_factor_enabled: p.two_factor_enabled ?? false,
            created_at: p.created_at ?? null,
            roles: activeRoles,
            vendor_id: vendor?.id ?? null,
            vendor_name: vendor?.business_name ?? null,
            vendor_status: vendor?.verification_status ?? null,
            affiliate_code: affiliate?.affiliate_code ?? null,
            influencer_name: influencer?.display_name ?? null,
        };
    });

    // Client-side role filter (Supabase can't easily filter on joined arrays)
    if (role) {
        rows = rows.filter((u) => u.roles.includes(role));
    }

    return { users: rows, total: count ?? 0 };
}


export interface AdminUserDetail {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    bio: string | null;
    website: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
    timezone: string | null;
    language: string | null;
    is_verified: boolean;
    is_active: boolean;
    two_factor_enabled: boolean;
    created_at: string | null;
    updated_at: string | null;

    roles: Array<{ role: string; is_active: boolean; activated_at: string | null }>;

    vendor: {
        id: string;
        business_name: string;
        business_slug: string;
        business_email: string | null;
        business_phone: string | null;
        business_country: string | null;
        verification_status: string;
        rating: number;
        total_sales: number;
        total_revenue: number;
        commission_rate: number;
        affiliate_commission_rate: number;
        is_featured: boolean;
        is_active: boolean;
        follower_count: number;
        payout_method: string | null;
        created_at: string | null;
    } | null;

    affiliate: {
        id: string;
        affiliate_code: string;
        tier: string;
        total_clicks: number;
        total_conversions: number;
        total_earnings: number;
        available_balance: number;
        pending_earnings: number;
        conversion_rate: number;
        is_active: boolean;
        payout_method: string | null;
        created_at: string | null;
    } | null;

    influencer: {
        id: string;
        display_name: string;
        total_followers: number;
        engagement_rate: number;
        total_campaigns: number;
        total_earnings: number;
        available_balance: number;
        is_verified: boolean;
        is_featured: boolean;
        is_active: boolean;
        created_at: string | null;
    } | null;

    wallet: {
        available_balance: number;
        pending_balance: number;
        total_earned: number;
        total_paid: number;
        currency: string;
    } | null;

    recent_orders: Array<{
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        total_amount: number;
        currency: string;
        created_at: string | null;
    }>;

    recent_transactions: Array<{
        id: string;
        type: string;
        direction: string;
        amount: number;
        currency: string;
        status: string;
        provider: string | null;
        created_at: string | null;
    }>;

    unread_notifications: number;
}

export async function getAdminUserById(userId: string): Promise<AdminUserDetail | null> {
    const supabase = await createClient();

    const [
        profileRes,
        rolesRes,
        vendorRes,
        affiliateRes,
        influencerRes,
        walletRes,
        ordersRes,
        txRes,
        notifRes,
    ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),

        supabase
            .from("user_roles")
            .select("role, is_active, activated_at")
            .eq("user_id", userId),

        supabase
            .from("vendors")
            .select("id, business_name, business_slug, business_email, business_phone, business_country, verification_status, rating, total_sales, total_revenue, commission_rate, affiliate_commission_rate, is_featured, is_active, follower_count, payout_method, created_at")
            .eq("user_id", userId)
            .maybeSingle(),

        supabase
            .from("affiliates")
            .select("id, affiliate_code, tier, total_clicks, total_conversions, total_earnings, available_balance, pending_earnings, conversion_rate, is_active, payout_method, created_at")
            .eq("user_id", userId)
            .maybeSingle(),

        supabase
            .from("influencers")
            .select("id, display_name, total_followers, engagement_rate, total_campaigns, total_earnings, available_balance, is_verified, is_featured, is_active, created_at")
            .eq("user_id", userId)
            .maybeSingle(),

        supabase
            .from("wallets")
            .select("available_balance, pending_balance, total_earned, total_paid, currency")
            .eq("user_id", userId)
            .maybeSingle(),

        supabase
            .from("orders")
            .select("id, order_number, status, payment_status, total_amount, currency, created_at")
            .eq("buyer_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),

        supabase
            .from("transactions")
            .select("id, type, direction, amount, currency, status, provider, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),

        supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false),
    ]);

    if (profileRes.error || !profileRes.data) return null;

    const p = profileRes.data;
    const v = vendorRes.data;
    const a = affiliateRes.data;
    const inf = influencerRes.data;
    const w = walletRes.data;

    const result: AdminUserDetail = {
        id: p.id,
        email: p.email,
        full_name: p.full_name ?? null,
        avatar_url: p.avatar_url ?? null,
        username: p.username ?? null,
        bio: p.bio ?? null,
        website: p.website ?? null,
        phone: p.phone ?? null,
        country: p.country ?? null,
        city: p.city ?? null,
        timezone: p.timezone ?? null,
        language: p.language ?? null,
        is_verified: p.is_verified ?? false,
        is_active: p.is_active ?? true,
        two_factor_enabled: p.two_factor_enabled ?? false,
        created_at: p.created_at ?? null,
        updated_at: p.updated_at ?? null,

        roles: (rolesRes.data ?? []).map((r) => ({
            role: r.role as string,
            is_active: r.is_active ?? false,
            activated_at: r.activated_at ?? null,
        })),

        vendor: v ? {
            id: v.id,
            business_name: v.business_name,
            business_slug: v.business_slug,
            business_email: v.business_email ?? null,
            business_phone: v.business_phone ?? null,
            business_country: v.business_country ?? null,
            verification_status: (v.verification_status as string) ?? "pending",
            rating: Number(v.rating ?? 0),
            total_sales: Number(v.total_sales ?? 0),
            total_revenue: Number(v.total_revenue ?? 0),
            commission_rate: Number(v.commission_rate ?? 0),
            affiliate_commission_rate: Number(v.affiliate_commission_rate ?? 0),
            is_featured: v.is_featured ?? false,
            is_active: v.is_active ?? true,
            follower_count: Number(v.follower_count ?? 0),
            payout_method: v.payout_method ?? null,
            created_at: v.created_at ?? null,
        } : null,

        affiliate: a ? {
            id: a.id,
            affiliate_code: a.affiliate_code,
            tier: (a.tier as string) ?? "bronze",
            total_clicks: Number(a.total_clicks ?? 0),
            total_conversions: Number(a.total_conversions ?? 0),
            total_earnings: Number(a.total_earnings ?? 0),
            available_balance: Number(a.available_balance ?? 0),
            pending_earnings: Number(a.pending_earnings ?? 0),
            conversion_rate: Number(a.conversion_rate ?? 0),
            is_active: a.is_active ?? true,
            payout_method: a.payout_method ?? null,
            created_at: a.created_at ?? null,
        } : null,

        influencer: inf ? {
            id: inf.id,
            display_name: inf.display_name,
            total_followers: Number(inf.total_followers ?? 0),
            engagement_rate: Number(inf.engagement_rate ?? 0),
            total_campaigns: Number(inf.total_campaigns ?? 0),
            total_earnings: Number(inf.total_earnings ?? 0),
            available_balance: Number(inf.available_balance ?? 0),
            is_verified: inf.is_verified ?? false,
            is_featured: inf.is_featured ?? false,
            is_active: inf.is_active ?? true,
            created_at: inf.created_at ?? null,
        } : null,

        wallet: w ? {
            available_balance: Number(w.available_balance ?? 0),
            pending_balance: Number(w.pending_balance ?? 0),
            total_earned: Number(w.total_earned ?? 0),
            total_paid: Number(w.total_paid ?? 0),
            currency: w.currency ?? "RWF",
        } : null,

        recent_orders: (ordersRes.data ?? []).map((o) => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status as string,
            payment_status: o.payment_status as string,
            total_amount: Number(o.total_amount),
            currency: o.currency ?? "RWF",
            created_at: o.created_at ?? null,
        })),

        recent_transactions: (txRes.data ?? []).map((t) => ({
            id: t.id,
            type: t.type,
            direction: t.direction,
            amount: Number(t.amount),
            currency: t.currency,
            status: t.status as string,
            provider: t.provider ?? null,
            created_at: t.created_at ?? null,
        })),

        unread_notifications: notifRes.count ?? 0,
    };

    return result;
}