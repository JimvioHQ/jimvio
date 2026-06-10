export const runtime = "nodejs";

export async function POST(req: Request) {
    // Require a bearer token for safety (use CRON_SECRET or admin key)
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

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
        // Import handler lives at app/api/cj/import/route.ts — call it directly
        const { POST: cjImportPOST } = await import("../../../cj/import/route");

        const internalReq = new Request("/api/cj/import", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pid }),
        });

        const resp = await cjImportPOST(internalReq);
        const text = await resp.text();
        // Mirror response
        return new Response(text, { status: resp.status, headers: resp.headers });
    } catch (err: any) {
        console.error("[Admin CJ import] failed:", err?.message ?? err);
        return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
    }
}

export async function GET() {
    return new Response(JSON.stringify({ ok: true, info: "Admin manual CJ import endpoint" }));
}
