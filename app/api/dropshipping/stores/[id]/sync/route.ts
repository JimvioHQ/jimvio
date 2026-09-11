import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { enqueueSyncJob, type SyncJobType } from "@/lib/dropshipping/sync/engine";

export const dynamic = "force-dynamic";

const ALLOWED: SyncJobType[] = [
  "INVENTORY_SYNC",
  "PRICE_SYNC",
  "PRODUCT_UPDATE",
  "ORDER_SYNC",
  "FULFILLMENT_SYNC",
  "TRACKING_SYNC",
  "CONNECTION_TEST",
];

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    jobType?: SyncJobType;
  };

  const jobType = body.jobType ?? "INVENTORY_SYNC";
  if (!ALLOWED.includes(jobType)) {
    return NextResponse.json(
      { error: `Unsupported jobType. Allowed: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const db = dsAdminDb();
  const { data: store } = await db
    .from("merchant_stores")
    .select("id, status")
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  if (store.status === "disconnected") {
    return NextResponse.json(
      { error: "Store is disconnected. Reconnect before syncing." },
      { status: 400 }
    );
  }

  try {
    const job = await enqueueSyncJob(db, {
      vendorId: auth.vendorId,
      storeId: id,
      jobType,
      metadata: { source: "merchant_dashboard" },
    });
    return NextResponse.json({
      jobId: job.jobId,
      deduped: job.deduped,
      jobType,
      status: "pending",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enqueue sync job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
