import { NextResponse } from "next/server";
import { getAdminDB } from "@/services/base";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";

export const dynamic = "force-dynamic";

/** Lightweight counts for admin sidebar / mobile nav badges. */
export async function GET() {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;
    try {
        const admin = getAdminDB();

        const [verifications, toFulfill, awaiting, failedCredits, openDisputes] = await Promise.all([
            admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
            admin
                .from("orders")
                .select("id", { count: "exact", head: true })
                .in("payment_status", ["paid", "completed"])
                .in("status", ["confirmed", "processing"]),
            admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled"),
            admin.from("failed_wallet_credits").select("id", { count: "exact", head: true }).eq("resolved", false).gt("amount", 0),
            admin
                .from("orders")
                .select("id, cj_dispute_id, payment_status, status, metadata")
                .or("cj_dispute_id.not.is.null,payment_status.eq.refunded,status.eq.refunded")
                .limit(200),
        ]);

        const disputeRows = openDisputes.data ?? [];
        const openDisputeCount = disputeRows.filter((o: { metadata?: unknown }) => {
            const meta = (o.metadata && typeof o.metadata === "object" ? o.metadata : {}) as Record<string, unknown>;
            const block = meta.admin_dispute as { status?: string } | undefined;
            return block?.status !== "resolved";
        }).length;

        const ordersBadge = (toFulfill.count ?? 0) + (awaiting.count ?? 0);

        return NextResponse.json({
            "/admin/verifications": verifications.count ?? 0,
            "/admin/orders": ordersBadge,
            "/admin/payments/failed-credits": failedCredits.count ?? 0,
            "/admin/disputes": openDisputeCount,
        });
    } catch {
        return NextResponse.json({});
    }
}
