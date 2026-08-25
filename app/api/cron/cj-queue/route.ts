import { NextResponse } from "next/server";
import { processCJQueue } from "@/lib/cj/cj-order-queue";
import { assertCronAuthorized } from "@/lib/ops/cron-auth";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
    const denied = assertCronAuthorized(req);
    if (denied) return denied;
    try {
        const result = await processCJQueue();
        return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}