import { getAdminDB } from "@/services/base";
import { isEmailEnabled } from "@/lib/email/config";
import { buildChartSlices, type ChartSlice } from "@/lib/admin/chart-slices";
import {
    ADMIN_PRIMARY_CURRENCY,
    formatAdminMoneyTotals,
    formatAdminPeriodChange,
    sumAdminMoneyForCurrency,
} from "@/lib/admin/format-money";

export type DashboardAttentionItem = {
    id: string;
    label: string;
    detail: string;
    count: number;
    href: string;
    severity: "critical" | "warn" | "info";
};

export type DashboardRecentOrder = {
    id: string;
    order_number: string;
    buyer_name: string;
    vendor_name: string | null;
    total_amount: number;
    currency: string;
    status: string;
    payment_status: string;
    created_at: string;
};

export type DashboardPendingVendor = {
    id: string;
    business_name: string;
    business_country: string | null;
    created_at: string | null;
};

export type DashboardChartPoint = {
    month: string;
    year: number;
    revenue: number;
    orders: number;
    prevRevenue: number;
    prevOrders: number;
};

export type AdminDashboardData = {
    generatedAt: string;
    totalUsers: number;
    newUsers7d: number;
    totalVendors: number;
    verifiedVendors: number;
    totalProducts: number;
    activeProducts: number;
    orders30d: number;
    revenue30d: number;
    revenue30dDisplay: string;
    revenuePrev30d: number;
    revenue30dDeltaLabel: string;
    revenue30dDeltaPositive: boolean | null;
    pendingVerifications: number;
    pendingPayouts: number;
    awaitingPayment: number;
    toFulfill: number;
    failedPayments30d: number;
    lowStockProducts: number;
    cjWithoutTracking: number;
    unresolvedFailedCredits: number;
    webhookFailures24h: number;
    webhookSuccess24h: number;
    healthScore: number;
    healthLabel: "healthy" | "degraded" | "critical";
    emailEnabled: boolean;
    revenueChart: DashboardChartPoint[];
    paymentStatusChart: ChartSlice[];
    fulfillmentStatusChart: ChartSlice[];
    orderSourceChart: ChartSlice[];
    recentOrders: DashboardRecentOrder[];
    pendingVendors: DashboardPendingVendor[];
    attentionItems: DashboardAttentionItem[];
};

function envPresent(...keys: string[]): boolean {
    return keys.some((k) => Boolean(process.env[k]?.trim()));
}

function computeHealthScore(input: {
    webhookSuccessRate: number;
    unresolvedFailedCredits: number;
    stuckPendingPayments: number;
    paidUnfulfilledOrders: number;
}): { score: number; label: AdminDashboardData["healthLabel"] } {
    let score = 100;

    if (input.webhookSuccessRate < 95) score -= 15;
    if (input.webhookSuccessRate < 80) score -= 20;
    score -= Math.min(input.unresolvedFailedCredits * 8, 30);
    score -= Math.min(input.stuckPendingPayments * 3, 15);
    score -= Math.min(input.paidUnfulfilledOrders * 2, 10);

    if (!envPresent("RESEND_API_KEY") || !process.env.EMAIL_FROM?.trim()) score -= 5;

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label: AdminDashboardData["healthLabel"] =
        score >= 80 ? "healthy" : score >= 55 ? "degraded" : "critical";

    return { score, label };
}

function buildRevenueChart(
    rows: Array<{ total_amount: number; created_at: string; currency?: string | null }>,
    currency = ADMIN_PRIMARY_CURRENCY
): DashboardChartPoint[] {
    const normalizedCurrency = currency.toUpperCase();
    const filteredRows = rows.filter(
        (row) => (row.currency ?? ADMIN_PRIMARY_CURRENCY).toUpperCase() === normalizedCurrency
    );
    const now = new Date();
    const buckets: DashboardChartPoint[] = [];
    let priorBucket = { revenue: 0, orders: 0 };

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            month: d.toLocaleDateString("en-US", { month: "short" }),
            year: d.getFullYear(),
            revenue: 0,
            orders: 0,
            prevRevenue: 0,
            prevOrders: 0,
        });
    }

    for (const row of filteredRows) {
        const d = new Date(row.created_at);
        const monthsAgo =
            (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        const amount = Number(row.total_amount ?? 0);

        if (monthsAgo === 12) {
            priorBucket.revenue += amount;
            priorBucket.orders += 1;
            continue;
        }

        if (monthsAgo < 0 || monthsAgo > 11) continue;
        const idx = 11 - monthsAgo;
        buckets[idx].revenue += amount;
        buckets[idx].orders += 1;
    }

    buckets[0].prevRevenue = priorBucket.revenue;
    buckets[0].prevOrders = priorBucket.orders;
    for (let i = 1; i < buckets.length; i++) {
        buckets[i].prevRevenue = buckets[i - 1].revenue;
        buckets[i].prevOrders = buckets[i - 1].orders;
    }

    return buckets;
}

function buildAttentionItems(input: {
    pendingVerifications: number;
    pendingPayouts: number;
    awaitingPayment: number;
    toFulfill: number;
    failedPayments30d: number;
    lowStockProducts: number;
    cjWithoutTracking: number;
    unresolvedFailedCredits: number;
    webhookFailures24h: number;
    stuckPendingPayments: number;
}): DashboardAttentionItem[] {
    const items: DashboardAttentionItem[] = [];

    if (input.unresolvedFailedCredits > 0) {
        items.push({
            id: "failed-credits",
            label: "Failed wallet credits",
            detail: "Buyer balances not credited after payment",
            count: input.unresolvedFailedCredits,
            href: "/admin/payments/failed-credits",
            severity: "critical",
        });
    }
    if (input.webhookFailures24h > 0) {
        items.push({
            id: "webhooks",
            label: "Webhook failures (24h)",
            detail: "Payment or supplier callbacks failing",
            count: input.webhookFailures24h,
            href: "/admin/payments/webhooks",
            severity: "critical",
        });
    }
    if (input.stuckPendingPayments > 0) {
        items.push({
            id: "stuck-payments",
            label: "Stale unpaid checkouts",
            detail: "Pending payment for over 24 hours",
            count: input.stuckPendingPayments,
            href: "/admin/orders?payment=pending",
            severity: "warn",
        });
    }
    if (input.toFulfill > 0) {
        items.push({
            id: "fulfill",
            label: "Paid · not shipped",
            detail: "Orders waiting on vendor or CJ fulfillment",
            count: input.toFulfill,
            href: "/admin/orders?status=confirmed",
            severity: "warn",
        });
    }
    if (input.pendingVerifications > 0) {
        items.push({
            id: "verifications",
            label: "Vendor applications",
            detail: "New stores waiting for review",
            count: input.pendingVerifications,
            href: "/admin/verifications?tab=vendors",
            severity: "warn",
        });
    }
    if (input.pendingPayouts > 0) {
        items.push({
            id: "payouts",
            label: "Pending payouts",
            detail: "Vendor or affiliate transfers queued",
            count: input.pendingPayouts,
            href: "/admin/payments",
            severity: "info",
        });
    }
    if (input.failedPayments30d > 0) {
        items.push({
            id: "failed-payments",
            label: "Failed payments (30d)",
            detail: "Checkout attempts that did not complete",
            count: input.failedPayments30d,
            href: "/admin/orders?payment=failed",
            severity: "info",
        });
    }
    if (input.cjWithoutTracking > 0) {
        items.push({
            id: "cj-tracking",
            label: "CJ · no tracking",
            detail: "Supplier orders shipped without tracking number",
            count: input.cjWithoutTracking,
            href: "/admin/orders?source=cj",
            severity: "info",
        });
    }
    if (input.lowStockProducts > 0) {
        items.push({
            id: "low-stock",
            label: "Low stock SKUs",
            detail: "Tracked inventory at or below threshold",
            count: input.lowStockProducts,
            href: "/admin/products",
            severity: "info",
        });
    }

    const rank = { critical: 0, warn: 1, info: 2 };
    return items.sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
}

async function countOrders30d(
    admin: ReturnType<typeof getAdminDB>,
    field: "payment_status" | "status" | "integration_source",
    values: string[],
    sinceIso: string
): Promise<Array<{ key: string; count: number }>> {
    const results = await Promise.all(
        values.map(async (value) => {
            const { count } = await admin
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq(field, value as never)
                .gte("created_at", sinceIso);
            return { key: value, count: count ?? 0 };
        })
    );
    return results;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    const admin = getAdminDB();
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);
    const since30d = new Date(nowMs - 30 * 86400000).toISOString();
    const since60d = new Date(nowMs - 60 * 86400000).toISOString();
    const since12mo = new Date(nowMs - 365 * 86400000).toISOString();
    const since13mo = new Date(nowDate.getFullYear(), nowDate.getMonth() - 12, 1).toISOString();
    const since24h = new Date(nowMs - 86400000).toISOString();
    const stalePaymentCutoff = new Date(nowMs - 24 * 86400000).toISOString();

    const [
        usersRes,
        newUsers7dRes,
        vendorsRes,
        verifiedVendorsRes,
        productsRes,
        activeProductsRes,
        orders30dRes,
        revenue30dRes,
        revenuePrev30dRes,
        pendingVerificationsRes,
        pendingPayoutsRes,
        awaitingPaymentRes,
        toFulfillRes,
        failedPayments30dRes,
        lowStockRes,
        cjNoTrackingRes,
        failedCreditsRes,
        webhooks24hRes,
        stuckPendingRes,
        chartOrdersRes,
        recentOrdersRes,
        pendingVendorsRes,
        paymentCountsRes,
        fulfillmentCountsRes,
        sourceCountsRes,
    ] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(nowMs - 7 * 86400000).toISOString()),
        admin.from("vendors").select("id", { count: "exact", head: true }),
        admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        admin.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
        admin.from("products").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
        admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since30d),
        admin
            .from("orders")
            .select("total_amount, currency")
            .in("payment_status", ["paid", "completed"])
            .gte("created_at", since30d),
        admin
            .from("orders")
            .select("total_amount, currency")
            .in("payment_status", ["paid", "completed"])
            .gte("created_at", since60d)
            .lt("created_at", since30d),
        admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        admin.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
        admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled"),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .in("payment_status", ["paid", "completed"])
            .in("status", ["confirmed", "processing"]),
        admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed").gte("created_at", since30d),
        admin
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("track_inventory", true)
            .eq("status", "active")
            .is("deleted_at", null)
            .lte("inventory_quantity", 5),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .not("cj_order_id", "is", null)
            .in("status", ["shipped", "processing", "confirmed"])
            .is("tracking_number", null),
        admin.from("failed_wallet_credits").select("id", { count: "exact", head: true }).eq("resolved", false).gt("amount", 0),
        admin.from("webhook_events").select("status").gte("created_at", since24h),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("payment_status", "pending")
            .lt("created_at", stalePaymentCutoff),
        admin
            .from("orders")
            .select("total_amount, currency, created_at")
            .in("payment_status", ["paid", "completed"])
            .gte("created_at", since13mo),
        admin
            .from("orders")
            .select(
                `id, order_number, total_amount, currency, status, payment_status, created_at,
                 profiles!orders_buyer_id_fkey(full_name, email),
                 vendors(business_name)`
            )
            .order("created_at", { ascending: false })
            .limit(10),
        admin
            .from("vendors")
            .select("id, business_name, business_country, created_at")
            .eq("verification_status", "pending")
            .order("created_at", { ascending: true })
            .limit(6),
        countOrders30d(
            admin,
            "payment_status",
            ["pending", "processing", "paid", "completed", "failed", "refunded", "cancelled"],
            since30d
        ),
        countOrders30d(
            admin,
            "status",
            ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
            since30d
        ),
        countOrders30d(
            admin,
            "integration_source",
            ["vendor", "cj", "shopify", "community"],
            since30d
        ),
    ]);

    const revenue30dRows = (revenue30dRes.data ?? []) as Array<{ total_amount: number; currency?: string | null }>;
    const revenuePrev30dRows = (revenuePrev30dRes.data ?? []) as Array<{ total_amount: number; currency?: string | null }>;
    const primaryCurrency = ADMIN_PRIMARY_CURRENCY;
    const revenue30dMoneyRows = revenue30dRows.map((o) => ({ amount: o.total_amount, currency: o.currency }));
    const revenuePrev30dMoneyRows = revenuePrev30dRows.map((o) => ({ amount: o.total_amount, currency: o.currency }));
    const revenue30d = sumAdminMoneyForCurrency(revenue30dMoneyRows, primaryCurrency, primaryCurrency);
    const revenue30dDisplay = formatAdminMoneyTotals(revenue30dMoneyRows, primaryCurrency);
    const revenuePrev30d = sumAdminMoneyForCurrency(revenuePrev30dMoneyRows, primaryCurrency, primaryCurrency);
    const revenueDelta = formatAdminPeriodChange(revenue30d, revenuePrev30d, {
        currency: primaryCurrency,
        periodLabel: "prior 30d",
    });

    const webhookRows = (webhooks24hRes.data ?? []) as Array<{ status: string }>;
    const webhookTotal = webhookRows.length;
    const webhookFailures24h = webhookRows.filter((r) => r.status === "failed").length;
    const webhookCompleted = webhookRows.filter((r) => r.status === "completed").length;
    const webhookSuccess24h = webhookTotal > 0 ? (webhookCompleted / webhookTotal) * 100 : 100;

    const unresolvedFailedCredits = failedCreditsRes.count ?? 0;
    const stuckPendingPayments = stuckPendingRes.count ?? 0;
    const toFulfill = toFulfillRes.count ?? 0;

    const { score, label } = computeHealthScore({
        webhookSuccessRate: webhookSuccess24h,
        unresolvedFailedCredits,
        stuckPendingPayments,
        paidUnfulfilledOrders: toFulfill,
    });

    const pendingVerifications = pendingVerificationsRes.count ?? 0;
    const pendingPayouts = pendingPayoutsRes.count ?? 0;

    const recentOrders: DashboardRecentOrder[] = ((recentOrdersRes.data ?? []) as any[]).map((o) => {
        const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        const vendor = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
        return {
            id: o.id,
            order_number: o.order_number,
            buyer_name: buyer?.full_name || buyer?.email || "Unknown buyer",
            vendor_name: vendor?.business_name ?? null,
            total_amount: Number(o.total_amount ?? 0),
            currency: o.currency ?? "RWF",
            status: o.status ?? "pending",
            payment_status: o.payment_status ?? "pending",
            created_at: o.created_at,
        };
    });

    const attentionItems = buildAttentionItems({
        pendingVerifications,
        pendingPayouts,
        awaitingPayment: awaitingPaymentRes.count ?? 0,
        toFulfill,
        failedPayments30d: failedPayments30dRes.count ?? 0,
        lowStockProducts: lowStockRes.count ?? 0,
        cjWithoutTracking: cjNoTrackingRes.count ?? 0,
        unresolvedFailedCredits,
        webhookFailures24h,
        stuckPendingPayments,
    });

    return {
        generatedAt: new Date().toISOString(),
        totalUsers: usersRes.count ?? 0,
        newUsers7d: newUsers7dRes.count ?? 0,
        totalVendors: vendorsRes.count ?? 0,
        verifiedVendors: verifiedVendorsRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        activeProducts: activeProductsRes.count ?? 0,
        orders30d: orders30dRes.count ?? 0,
        revenue30d,
        revenue30dDisplay,
        revenuePrev30d,
        revenue30dDeltaLabel: revenueDelta.label,
        revenue30dDeltaPositive: revenueDelta.positive,
        pendingVerifications,
        pendingPayouts,
        awaitingPayment: awaitingPaymentRes.count ?? 0,
        toFulfill,
        failedPayments30d: failedPayments30dRes.count ?? 0,
        lowStockProducts: lowStockRes.count ?? 0,
        cjWithoutTracking: cjNoTrackingRes.count ?? 0,
        unresolvedFailedCredits,
        webhookFailures24h,
        webhookSuccess24h,
        healthScore: score,
        healthLabel: label,
        emailEnabled: isEmailEnabled() && Boolean(process.env.EMAIL_FROM?.trim()),
        revenueChart: buildRevenueChart(
            (chartOrdersRes.data ?? []) as Array<{ total_amount: number; currency?: string | null; created_at: string }>,
            primaryCurrency
        ),
        paymentStatusChart: buildChartSlices(paymentCountsRes, {
            paid: "paid",
            completed: "paid",
        }),
        fulfillmentStatusChart: buildChartSlices(fulfillmentCountsRes),
        orderSourceChart: buildChartSlices(sourceCountsRes),
        recentOrders,
        pendingVendors: (pendingVendorsRes.data ?? []) as DashboardPendingVendor[],
        attentionItems,
    };
}
