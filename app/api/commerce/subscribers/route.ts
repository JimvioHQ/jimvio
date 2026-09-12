import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
  loadPublishedStoreByHandle,
} from "@/lib/commerce-os";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public subscribe — store must be published; writes via service role after validation. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    storeHandle?: string;
    email?: string;
    sectionId?: string;
  } | null;

  const handle = (body?.storeHandle || "").trim().toLowerCase();
  const email = (body?.email || "").trim().toLowerCase();
  if (!handle || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A valid email and store are required." },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const gate = rateLimit(`store-sub:${handle}:${ip}`, 8, 60_000);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Too many subscription attempts. Try again shortly." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const db = cosAdminDb();
  const { error } = await cosTable(db, "jimvio_store_subscribers").upsert(
    {
      store_id: store.id,
      email,
      source: "storefront_newsletter",
      section_id:
        typeof body?.sectionId === "string" ? body.sectionId.slice(0, 80) : null,
    },
    { onConflict: "store_id,email" }
  );

  if (error) {
    // Table may not be migrated yet — soft fail with clear message
    if (/does not exist|relation/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            "Newsletter capture is not enabled yet. Contact support or try again later.",
          code: "subscribers_unavailable",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Merchant list — ownership required. */
export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_store_subscribers")
    .select("id, email, source, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ subscribers: [], warning: error.message });
  }

  return NextResponse.json({ subscribers: data ?? [] });
}
