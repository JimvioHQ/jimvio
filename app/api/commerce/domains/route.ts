import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

function normalizeHostname(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!raw || raw.length > 253) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(raw)) {
    return null;
  }
  return raw;
}

export async function GET(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json(
      { error: "storeId query parameter is required." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data, error } = await cosTable(db, "jimvio_store_domains")
    .select(
      "id, hostname, kind, is_primary, verification_status, ssl_status, dns_instructions, verified_at, created_at"
    )
    .eq("store_id", storeId)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list domains." },
      { status: 500 }
    );
  }

  return NextResponse.json({ domains: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    hostname?: string;
  } | null;

  if (!body?.storeId || !body?.hostname) {
    return NextResponse.json(
      { error: "storeId and hostname are required." },
      { status: 400 }
    );
  }

  const hostname = normalizeHostname(body.hostname);
  if (!hostname) {
    return NextResponse.json(
      { error: "Enter a valid domain (e.g. shop.example.com)." },
      { status: 400 }
    );
  }

  if (hostname.endsWith(".jimvio.com")) {
    return NextResponse.json(
      { error: "Jimvio subdomains are provisioned automatically — add a custom domain instead." },
      { status: 400 }
    );
  }

  const db = cosAdminDb();
  const owned = await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId);
  if (!owned) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  // Never claim verified/SSL active — pending until real DNS + platform verification.
  const { data, error } = await cosTable(db, "jimvio_store_domains")
    .insert({
      store_id: body.storeId,
      vendor_id: auth.vendorId,
      hostname,
      kind: "custom",
      is_primary: false,
      verification_status: "pending",
      ssl_status: "pending",
      dns_instructions: {
        note: "Point a CNAME (or A record) to Jimvio hosting. Verification and SSL stay pending until DNS is confirmed.",
        suggestedCname: "stores.jimvio.com",
      },
    })
    .select(
      "id, hostname, kind, is_primary, verification_status, ssl_status, dns_instructions, created_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to add domain." },
      { status: error?.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({ domain: data }, { status: 201 });
}
