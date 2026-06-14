import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCJToken } from "@/lib/cj/client";
import { refreshCJProductStockBatch } from "@/lib/cj/sync-inventory";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    let offset = 0;
    let limit = 8;

    try {
        const body = (await req.json()) as { offset?: number; limit?: number };
        if (typeof body.offset === "number" && body.offset >= 0) offset = body.offset;
        if (typeof body.limit === "number" && body.limit >= 1 && body.limit <= 20) {
            limit = body.limit;
        }
    } catch {
        // empty body is fine — start from beginning
    }

    try {
        const admin = createAdminClient();
        const token = await getCJToken(admin);
        const result = await refreshCJProductStockBatch(admin, token, offset, limit);

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Stock refresh failed";
        console.error("[CJ refresh-stock]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
