import { NextResponse } from "next/server";
import { runAutoPublishWorker } from "@/lib/cj/premium-intelligence/auto-publish-worker";
import { getCatalogDB } from "@/lib/cj/premium-intelligence/db";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret
  );
}

async function isWorkerSchemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_auto_publish_queue").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Every 2 minutes — autonomous Auto Publish Worker */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await isWorkerSchemaReady())) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: "Auto publish queue schema not ready — apply migration 068+",
      });
    }

    const result = await runAutoPublishWorker();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
