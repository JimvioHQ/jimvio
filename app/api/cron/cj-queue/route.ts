import { NextResponse } from "next/server";
import { processCJQueue } from "@/lib/cj/cj-order-queue";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
    if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const result = await processCJQueue();
        return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}