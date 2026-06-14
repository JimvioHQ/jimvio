import { getAdminDB } from "@/services/base";
import { getAdminOverviewStats } from "@/services/platform";
import { isEmailEnabled } from "@/lib/email/config";
import { formatAdminMoneyTotals } from "@/lib/admin/format-money";

export type IntegrationCheck = {
    id: string;
    label: string;
    category: "core" | "payments" | "fulfillment" | "comms";
    status: "ok" | "missing" | "partial";
    detail: string;
};

export type CountRow = { key: string; count: number };

export type WebhookWindowStats = {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
    byProvider: Record<string, { total: number; failed: number }>;
};

export type SystemAnalysisData = {
    generatedAt: string;
    overview: Awaited<ReturnType<typeof getAdminOverviewStats>>;
    integrations: IntegrationCheck[];
    integrationsOk: number;
    integrationsTotal: number;
    orderStatusCounts: CountRow[];
    paymentStatusCounts: CountRow[];
    webhooks24h: WebhookWindowStats;
    webhooks7d: WebhookWindowStats;
    unresolvedFailedCredits: number;
    unresolvedFailedCreditsAmount: number;
    stuckPendingPayments: number;
    paidUnfulfilledOrders: number;
    cjOrdersActive: number;
    cjOrdersWithoutTracking: number;
    newUsers7d: number;
    orders30d: number;
    revenue30d: number;
    revenue30dDisplay: string;
    recentFailedWebhooks: Array<{
        id: string;
        provider: string;
        error: string | null;
        created_at: string;
        order_id: string | null;
    }>;
    recentFailedCredits: Array<{
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        reason: string | null;
        created_at: string;
        order_number: string | null;
    }>;
    healthScore: number;
    healthLabel: "healthy" | "degraded" | "critical";
};

function envPresent(...keys: string[]): boolean {
    return keys.some((k) => Boolean(process.env[k]?.trim()));
}

function buildIntegrations(): IntegrationCheck[] {
    const emailOk = isEmailEnabled();
    const emailFrom = Boolean(process.env.EMAIL_FROM?.trim());

    return [
        {
            id: "supabase",
            label: "Supabase",
            category: "core",
            status: envPresent("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") ? "ok" : "missing",
            detail: "Database & auth",
        },
        {
            id: "app_url",
            label: "App URL",
            category: "core",
            status: envPresent("NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL") ? "ok" : "missing",
            detail: process.env.NEXT_PUBLIC_APP_URL ?? "Not set",
        },
        {
            id: "email",
            label: "Transactional email",
            category: "comms",
            status: emailOk && emailFrom ? "ok" : emailOk || emailFrom ? "partial" : "missing",
            detail: emailOk ? process.env.EMAIL_FROM ?? "Resend configured" : "Set RESEND_API_KEY + EMAIL_FROM",
        },
        {
            id: "flutterwave",
            label: "Flutterwave",
            category: "payments",
            status: envPresent("FLW_SECRET_KEY") ? "ok" : "missing",
            detail: "Card & mobile money",
        },
        {
            id: "pesapal",
            label: "PesaPal",
            category: "payments",
            status: envPresent("PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET") ? "ok" : "missing",
            detail: "East Africa payments",
        },
        {
            id: "pawapay",
            label: "PawaPay",
            category: "payments",
            status: envPresent("PAWAPAY_API_TOKEN") ? "ok" : "missing",
            detail: "Mobile money",
        },
        {
            id: "nowpayments",
            label: "NowPayments",
            category: "payments",
            status: envPresent("NOWPAYMENTS_API_KEY") ? "ok" : "missing",
            detail: "Crypto checkout",
        },
        {
            id: "binance",
            label: "Binance Pay",
            category: "payments",
            status: envPresent("BINANCE_PAY_API_KEY", "BINANCE_PAY_API_SECRET") ? "ok" : "missing",
            detail: "Crypto & payouts",
        },
        {
            id: "paypal",
            label: "PayPal",
            category: "payments",
            status: envPresent("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET") ? "ok" : "missing",
            detail: "International cards",
        },
        {
            id: "cj",
            label: "CJ Dropshipping",
            category: "fulfillment",
            status: envPresent("CJ_API_KEY", "CJ_TOKEN_KEY") ? "ok" : "missing",
            detail: "Supplier API & webhooks",
        },
        {
            id: "shopify",
            label: "Shopify",
            category: "fulfillment",
            status: envPresent("SHOPIFY_ACCESS_TOKEN", "SHOPIFY_SHOP_DOMAIN") ? "ok" : "missing",
            detail: "Store sync & orders",
        },
        {
            id: "cron",
            label: "Cron secret",
            category: "core",
            status: envPresent("CRON_SECRET") ? "ok" : "missing",
            detail: "Background jobs",
        },
    ];
}

function aggregateWebhookStats(rows: Array<{ status: string; provider: string }>): WebhookWindowStats {
    const total = rows.length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const byProvider: Record<string, { total: number; failed: number }> = {};

    for (const row of rows) {
        if (!byProvider[row.provider]) {
            byProvider[row.provider] = { total: 0, failed: 0 };
        }
        byProvider[row.provider].total += 1;
        if (row.status === "failed") byProvider[row.provider].failed += 1;
    }

    return {
        total,
        completed,
        failed,
        successRate: total > 0 ? (completed / total) * 100 : 100,
        byProvider,
    };
}

async function countOrdersByField(
    admin: ReturnType<typeof getAdminDB>,
    field: "status" | "payment_status",
    values: string[],
    sinceIso?: string
): Promise<CountRow[]> {
    const results = await Promise.all(
        values.map(async (value) => {
            let q = admin
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq(field, value as never);
            if (sinceIso) q = q.gte("created_at", sinceIso);
            const { count } = await q;
            return { key: value, count: count ?? 0 };
        })
    );
    return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

function computeHealthScore(input: {
    webhookSuccessRate: number;
    unresolvedFailedCredits: number;
    stuckPendingPayments: number;
    paidUnfulfilledOrders: number;
    integrationsOk: number;
    integrationsTotal: number;
}): { score: number; label: SystemAnalysisData["healthLabel"] } {
    let score = 100;

    if (input.webhookSuccessRate < 95) score -= 15;
    if (input.webhookSuccessRate < 80) score -= 20;

    score -= Math.min(input.unresolvedFailedCredits * 8, 30);
    score -= Math.min(input.stuckPendingPayments * 3, 15);
    score -= Math.min(input.paidUnfulfilledOrders * 2, 10);

    const integrationRatio = input.integrationsTotal
        ? input.integrationsOk / input.integrationsTotal
        : 1;
    if (integrationRatio < 0.6) score -= 10;

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label: SystemAnalysisData["healthLabel"] =
        score >= 80 ? "healthy" : score >= 55 ? "degraded" : "critical";

    return { score, label };
}

export async function getSystemAnalysisData(): Promise<SystemAnalysisData> {
    const admin = getAdminDB();
    const now = Date.now();
    const since30d = new Date(now - 30 * 86400000).toISOString();
    const since7d = new Date(now - 7 * 86400000).toISOString();
    const since24h = new Date(now - 86400000).toISOString();
    const stalePaymentCutoff = new Date(now - 24 * 86400000).toISOString();

    const integrations = buildIntegrations();
    const integrationsOk = integrations.filter((i) => i.status === "ok").length;

    const [
        overview,
        orderStatusCounts,
        paymentStatusCounts,
        webhooks24hRes,
        webhooks7dRes,
        failedCreditsRes,
        stuckPendingRes,
        paidUnfulfilledRes,
        cjActiveRes,
        cjNoTrackingRes,
        newUsers7dRes,
        orders30dRes,
        revenue30dRes,
        recentFailedWebhooksRes,
        recentFailedCreditsRes,
    ] = await Promise.all([
        getAdminOverviewStats(),
        countOrdersByField(
            admin,
            "status",
            ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded", "checkout_direct"],
            since30d
        ),
        countOrdersByField(
            admin,
            "payment_status",
            ["pending", "processing", "completed", "paid", "failed", "cancelled", "refunded"],
            since30d
        ),
        admin.from("webhook_events").select("status, provider").gte("created_at", since24h),
        admin.from("webhook_events").select("status, provider").gte("created_at", since7d),
        admin.from("failed_wallet_credits").select("amount, currency, resolved").eq("resolved", false),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("payment_status", "pending")
            .lt("created_at", stalePaymentCutoff),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .in("payment_status", ["completed", "paid"])
            .in("status", ["pending", "confirmed", "processing"]),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .not("cj_order_id", "is", null)
            .not("status", "in", "(delivered,cancelled,refunded)"),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .not("cj_order_id", "is", null)
            .in("status", ["shipped", "processing", "confirmed"])
            .is("tracking_number", null),
        admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
        admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since30d),
        admin
            .from("orders")
            .select("total_amount, currency")
            .in("payment_status", ["completed", "paid"])
            .gte("created_at", since30d),
        admin
            .from("webhook_events")
            .select("id, provider, error, created_at, order_id")
            .eq("status", "failed")
            .order("created_at", { ascending: false })
            .limit(8),
        admin
            .from("failed_wallet_credits")
            .select("id, order_id, amount, currency, reason, created_at, orders(order_number)")
            .eq("resolved", false)
            .gt("amount", 0)
            .order("created_at", { ascending: false })
            .limit(8),
    ]);

    const webhooks24h = aggregateWebhookStats((webhooks24hRes.data ?? []) as Array<{ status: string; provider: string }>);
    const webhooks7d = aggregateWebhookStats((webhooks7dRes.data ?? []) as Array<{ status: string; provider: string }>);

    const failedCredits = (failedCreditsRes.data ?? []) as Array<{ amount: number; resolved: boolean }>;
    const unresolvedFailedCredits = failedCredits.length;
    const unresolvedFailedCreditsAmount = failedCredits.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0
    );

    const revenue30dRows = (revenue30dRes.data ?? []) as Array<{ total_amount: number; currency?: string | null }>;
    const revenue30d = revenue30dRows.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
    const revenue30dDisplay = formatAdminMoneyTotals(
        revenue30dRows.map((o) => ({ amount: o.total_amount, currency: o.currency })),
        "RWF"
    );

    const { score, label } = computeHealthScore({
        webhookSuccessRate: webhooks24h.successRate,
        unresolvedFailedCredits,
        stuckPendingPayments: stuckPendingRes.count ?? 0,
        paidUnfulfilledOrders: paidUnfulfilledRes.count ?? 0,
        integrationsOk,
        integrationsTotal: integrations.length,
    });

    return {
        generatedAt: new Date().toISOString(),
        overview,
        integrations,
        integrationsOk,
        integrationsTotal: integrations.length,
        orderStatusCounts,
        paymentStatusCounts,
        webhooks24h,
        webhooks7d,
        unresolvedFailedCredits,
        unresolvedFailedCreditsAmount,
        stuckPendingPayments: stuckPendingRes.count ?? 0,
        paidUnfulfilledOrders: paidUnfulfilledRes.count ?? 0,
        cjOrdersActive: cjActiveRes.count ?? 0,
        cjOrdersWithoutTracking: cjNoTrackingRes.count ?? 0,
        newUsers7d: newUsers7dRes.count ?? 0,
        orders30d: orders30dRes.count ?? 0,
        revenue30d,
        revenue30dDisplay,
        recentFailedWebhooks: (recentFailedWebhooksRes.data ?? []) as SystemAnalysisData["recentFailedWebhooks"],
        recentFailedCredits: ((recentFailedCreditsRes.data ?? []) as Array<{
            id: string;
            order_id: string;
            amount: number;
            currency: string;
            reason: string | null;
            created_at: string;
            orders: { order_number: string } | { order_number: string }[] | null;
        }>).map((row) => ({
            id: row.id,
            order_id: row.order_id,
            amount: row.amount,
            currency: row.currency,
            reason: row.reason,
            created_at: row.created_at,
            order_number: Array.isArray(row.orders)
                ? row.orders[0]?.order_number ?? null
                : row.orders?.order_number ?? null,
        })),
        healthScore: score,
        healthLabel: label,
    };
}
