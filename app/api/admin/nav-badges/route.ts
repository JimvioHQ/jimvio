import { NextResponse } from "next/server";
import { getAdminDB } from "@/services/base";

export const dynamic = "force-dynamic";

/** Lightweight counts for admin sidebar / mobile nav badges. */
export async function GET() {
    try {
        const admin = getAdminDB();

        const [verifications, toFulfill, awaiting, failedCredits] = await Promise.all([
            admin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
            admin
                .from("orders")
                .select("id", { count: "exact", head: true })
                .in("payment_status", ["paid", "completed"])
                .in("status", ["confirmed", "processing"]),
            admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled"),
            admin.from("failed_wallet_credits").select("id", { count: "exact", head: true }).eq("resolved", false).gt("amount", 0),
        ]);

        const ordersBadge = (toFulfill.count ?? 0) + (awaiting.count ?? 0);

        return NextResponse.json({
            "/admin/verifications": verifications.count ?? 0,
            "/admin/orders": ordersBadge,
            "/admin/payments/failed-credits": failedCredits.count ?? 0,
        });
    } catch {
        return NextResponse.json({});
    }
}
