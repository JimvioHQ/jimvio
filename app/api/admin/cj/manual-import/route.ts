import { requireAdminSessionOrCron } from "@/lib/ops/admin-or-cron";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const gate = await requireAdminSessionOrCron(req);
    if (!gate.ok) return gate.error;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const pid = body?.pid;
    if (!pid) {
        return new Response(JSON.stringify({ error: "Missing pid" }), { status: 400 });
    }

    try {
        const { POST: cjImportPOST } = await import("../../../cj/import/route");

        const internalReq = new Request("/api/cj/import", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pid }),
        });

        const resp = await cjImportPOST(internalReq);
        const text = await resp.text();
        return new Response(text, { status: resp.status, headers: resp.headers });
    } catch (err: any) {
        console.error("[Admin CJ import] failed:", err?.message ?? err);
        return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
    }
}

export async function GET(req: Request) {
    const gate = await requireAdminSessionOrCron(req);
    if (!gate.ok) return gate.error;
    return new Response(JSON.stringify({ ok: true, info: "Admin manual CJ import endpoint" }));
}
