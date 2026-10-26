import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/lib/supabase/admin";
import { hasActiveTwoFactorSecret } from "@/lib/auth/repair-broken-2fa";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { listStoredSessions } from "@/lib/auth/user-sessions";
import { awaitQueryResult } from "@/lib/admin/await-query";
import { adminUserDetailDecision } from "@/lib/admin/user-detail-access";
import { buildAdminUserLocationView, type AdminUserLocationView } from "@/lib/admin/user-location-view";
import { lookupCheckoutPoint, readPreciseLocation, refreshPreciseAddress } from "@/lib/geo/precise-location-store";
import { writeAuditEvent } from "@/services/ops/audit";
import type { AccountStatus } from "@/lib/users/account-status";
import { isDeletedAccountEmail } from "@/lib/users/account-status";

export type TwoFactorAdminStatus = "disabled" | "enabled" | "broken" | "pending_setup";

export function resolveTwoFactorAdminStatus(input: {
    two_factor_enabled: boolean;
    secret: string | null | undefined;
    pending_secret: string | null | undefined;
}): TwoFactorAdminStatus {
    const hasSecret = hasActiveTwoFactorSecret(input.secret);
    const hasPending = hasActiveTwoFactorSecret(input.pending_secret);

    if (input.two_factor_enabled && hasSecret) return "enabled";
    if (input.two_factor_enabled && !hasSecret) return "broken";
    if (!input.two_factor_enabled && hasPending) return "pending_setup";
    if (!input.two_factor_enabled && hasSecret) return "enabled";
    return "disabled";
}

export interface AdminUserRow {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    is_verified: boolean;
    is_active: boolean;
    account_status: AccountStatus | "inactive";
    backup_email: string | null;
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

    if (status === "deleted") {
        query = query.ilike("email", `%@removed.jimvio`);
    } else {
        query = query.not("email", "ilike", `%@removed.jimvio`);
    }

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
            account_status: isDeletedAccountEmail(p.email)
                ? "deleted"
                : (p.is_active ?? true) ? "active" : "inactive",
            backup_email: null,
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

    // Hide platform admins from the default list — show only when role=admin is selected
    if (role !== "admin") {
        rows = rows.filter((u) => !u.roles.includes("admin"));
    }

    // Client-side role filter (Supabase can't easily filter on joined arrays)
    if (role) {
        rows = rows.filter((u) => u.roles.includes(role));
    }

    return { users: rows, total: role ? rows.length : (count ?? 0) };
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
    account_status: AccountStatus;
    moderation_reason: string | null;
    moderated_at: string | null;
    moderated_by: string | null;
    deleted_at: string | null;
    backup_email: string | null;
    backup_full_name: string | null;
    pending_reports: number;
    two_factor_enabled: boolean;
    two_factor_status: TwoFactorAdminStatus;
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
    location: AdminUserLocationView;
    activity: {
        membershipCount: number | null;
        publishedPostCount: number | null;
        listingCount: number | null;
        tickets: Array<{
            publicRef: string;
            subject: string;
            status: string;
            createdAt: string | null;
        }> | null;
    };
}

async function countPendingReportsForInfluencer(influencerId: string): Promise<number> {
    const admin = getAdminDB();
    const { data: submissions } = await admin
        .from("ugc_submissions")
        .select("id")
        .eq("influencer_id", influencerId);

    const submissionIds = (submissions ?? []).map((s) => s.id);
    if (submissionIds.length === 0) return 0;

    const { count } = await admin
        .from("ugc_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in("submission_id", submissionIds);

    return count ?? 0;
}

async function countOrNull(
    query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
    try {
        const { count, error } = await query;
        if (error) return null;
        return count ?? 0;
    } catch {
        return null;
    }
}

export async function getAdminUserById(userId: string): Promise<AdminUserDetail | null> {
    const auth = await assertPlatformAdmin();
    const decision = adminUserDetailDecision({ ok: auth.ok }, userId);
    if (!auth.ok || decision !== "allow") {
        await writeAuditEvent({
            actorId: auth.ok ? auth.user.id : null,
            action: "admin.user_detail.view",
            entityType: "profile",
            entityId: decision === "invalid_id" ? null : userId,
            metadata: { outcome: decision },
        });
        return null;
    }

    const supabase = await createClient();
    const admin = getAdminDB();

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
        authRes,
        mfaRes,
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
            .select("id, order_number, status, payment_status, total_amount, currency, created_at, shipping_address")
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

        admin.auth.admin.getUserById(userId),

        admin
            .from("user_2fa_secrets")
            .select("secret, pending_secret")
            .eq("user_id", userId)
            .maybeSingle(),
    ]);

    if (profileRes.error || !profileRes.data) {
        await writeAuditEvent({
            actorId: auth.user.id,
            action: "admin.user_detail.view",
            entityType: "profile",
            entityId: userId,
            metadata: { outcome: "not_found" },
        });
        return null;
    }

    const p = profileRes.data;
    const v = vendorRes.data;
    const a = affiliateRes.data;
    const inf = influencerRes.data;
    const w = walletRes.data;

    const authMeta = (authRes.data?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const accountStatus = (authMeta.account_status as AccountStatus | undefined)
        ?? (isDeletedAccountEmail(p.email) ? "deleted" : ((p.is_active ?? true) ? "active" : "suspended"));

    const pendingReports = inf?.id
        ? await countPendingReportsForInfluencer(inf.id)
        : 0;

    const mfaRow = mfaRes.data;
    const twoFactorStatus = resolveTwoFactorAdminStatus({
        two_factor_enabled: p.two_factor_enabled ?? false,
        secret: mfaRow?.secret ?? null,
        pending_secret: mfaRow?.pending_secret ?? null,
    });

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
        account_status: accountStatus,
        moderation_reason: (authMeta.moderation_reason as string | null) ?? null,
        moderated_at: (authMeta.moderated_at as string | null) ?? null,
        moderated_by: (authMeta.moderated_by as string | null) ?? null,
        deleted_at: (authMeta.deleted_at as string | null) ?? null,
        backup_email: (authMeta.backup_email as string | null) ?? null,
        backup_full_name: (authMeta.backup_full_name as string | null) ?? null,
        pending_reports: pendingReports,
        two_factor_enabled: p.two_factor_enabled ?? false,
        two_factor_status: twoFactorStatus,
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
        location: buildAdminUserLocationView({
            country: p.country ?? null,
            city: p.city ?? null,
            createdAt: p.created_at ?? null,
            updatedAt: p.updated_at ?? null,
            phone: p.phone ?? null,
            fullName: p.full_name ?? null,
            username: p.username ?? null,
            avatarUrl: p.avatar_url ?? null,
            bio: p.bio ?? null,
            emailConfirmedAt: authRes.data?.user?.email_confirmed_at ?? null,
            lastSignInAt: authRes.data?.user?.last_sign_in_at ?? null,
            sessions: [],
            orders: (ordersRes.data ?? []).map((order) => ({
                shippingAddress: order.shipping_address,
                paymentStatus: order.payment_status,
                createdAt: order.created_at,
            })),
            includeCheckoutStreet: true,
            latestIpCountry: null,
            latestIpAt: null,
        }),
        activity: {
            membershipCount: null,
            publishedPostCount: null,
            listingCount: null,
            tickets: [],
        },
    };

    const [sessions, membershipCount, publishedPostCount, listingCount, ticketResult, preciseLocation] = await Promise.all([
        listStoredSessions(userId).catch(() => []),
        countOrNull(
            admin.from("community_memberships").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
        ),
        countOrNull(
            admin.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("is_published", true),
        ),
        v?.id
            ? countOrNull(
                admin.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
            )
            : Promise.resolve(0),
        awaitQueryResult(
            (admin as unknown as {
                from: (table: string) => {
                    select: (columns: string) => {
                        eq: (column: string, value: string) => {
                            order: (column: string, options: { ascending: boolean }) => {
                                limit: (count: number) => PromiseLike<{
                                    data: Array<{
                                        public_ref: string;
                                        subject: string;
                                        status: string;
                                        created_at: string | null;
                                    }> | null;
                                    error: { message: string } | null;
                                }>;
                            };
                        };
                    };
                };
            })
                .from("support_tickets")
                .select("public_ref, subject, status, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(5),
        ),
        readPreciseLocation(userId),
    ]);

    let precise = preciseLocation;
    try {
        if (precise) precise = await refreshPreciseAddress(userId, precise);
    } catch {
        precise = preciseLocation;
    }
    const checkoutOrders = (ordersRes.data ?? []).map((order) => ({
        shippingAddress: order.shipping_address,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
    }));
    const checkoutPoint = await lookupCheckoutPoint(checkoutOrders).catch(() => null);
    const latestSession = sessions[0];
    result.location = buildAdminUserLocationView({
        country: p.country ?? null,
        city: p.city ?? null,
        createdAt: p.created_at ?? null,
        updatedAt: p.updated_at ?? null,
        phone: p.phone ?? null,
        fullName: p.full_name ?? null,
        username: p.username ?? null,
        avatarUrl: p.avatar_url ?? null,
        bio: p.bio ?? null,
        emailConfirmedAt: authRes.data?.user?.email_confirmed_at ?? null,
        lastSignInAt: authRes.data?.user?.last_sign_in_at ?? null,
        sessions,
        orders: checkoutOrders,
        includeCheckoutStreet: true,
        latestIpCountry: latestSession?.location ?? null,
        latestIpAt: latestSession?.lastActivity ?? null,
        precise,
        checkoutPoint,
    });
    result.activity = {
        membershipCount,
        publishedPostCount,
        listingCount,
        tickets: ticketResult.error
            ? null
            : (ticketResult.data ?? []).map((ticket) => ({
                publicRef: ticket.public_ref,
                subject: ticket.subject,
                status: ticket.status,
                createdAt: ticket.created_at,
            })),
    };

    await writeAuditEvent({
        actorId: auth.user.id,
        action: "admin.user_detail.view",
        entityType: "profile",
        entityId: userId,
        metadata: {
            outcome: "ok",
            preciseLocationShared: Boolean(precise?.permission === "granted" && precise.latitude != null),
        },
    });

    return result;
}