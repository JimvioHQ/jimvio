import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { generateApiKey, type ApiScope, API_SCOPES } from "@/lib/dropshipping/api/idempotency";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = dsAdminDb();
  const { data, error } = await db
    .from("ds_api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, created_at, revoked_at, expires_at")
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    scopes?: string[];
  } | null;

  const scopes = (body?.scopes ?? []).filter((s): s is ApiScope =>
    (API_SCOPES as readonly string[]).includes(s)
  );
  if (!scopes.length) {
    return NextResponse.json(
      { error: "Select at least one valid API scope." },
      { status: 400 }
    );
  }

  const generated = generateApiKey();
  const db = dsAdminDb();
  const { data, error } = await db
    .from("ds_api_keys")
    .insert({
      vendor_id: auth.vendorId,
      name: body?.name?.trim() || "Merchant API",
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      scopes,
    })
    .select("id, name, key_prefix, scopes, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create API key." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      key: data,
      secret: generated.raw,
    },
    { status: 201 }
  );
}
