import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";
import { generateApiKey } from "@/lib/dropshipping/api/idempotency";
import { apiKeyAuditMetadata, parseApiKeyName, parseRequestedScopes } from "@/lib/dropshipping/api/keys";
import { rateLimit } from "@/lib/ops/rate-limit";

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
    return NextResponse.json({ error: "API keys could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limited = rateLimit(`api-key-create:${auth.userId}`, 8, 60 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many API keys were created. Try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    scopes?: unknown;
  } | null;

  const name = parseApiKeyName(body?.name);
  if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });
  const scopes = parseRequestedScopes(body?.scopes);
  if (!scopes.ok) return NextResponse.json({ error: scopes.error }, { status: 400 });

  const generated = generateApiKey();
  const db = dsAdminDb();
  const { data, error } = await db
    .from("ds_api_keys")
    .insert({
      vendor_id: auth.vendorId,
      name: name.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      scopes: scopes.scopes,
    })
    .select("id, name, key_prefix, scopes, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "The key could not be created." }, { status: 500 });
  }

  try {
    await db.from("ds_integration_logs").insert({
      vendor_id: auth.vendorId,
      operation: "api_key.created",
      status: "success",
      metadata: apiKeyAuditMetadata({
        keyId: data.id,
        prefix: data.key_prefix,
        scopes: scopes.scopes,
      }),
    });
  } catch {
    // The key already exists. A log failure must not hide the one-time secret.
  }

  return NextResponse.json(
    {
      key: data,
      secret: generated.raw,
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Choose a key to revoke." }, { status: 400 });
  }

  const db = dsAdminDb();
  const { data: existing, error: readError } = await db
    .from("ds_api_keys")
    .select("id, key_prefix, scopes, revoked_at")
    .eq("id", id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: "The key could not be revoked." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 });
  }
  if (!existing.revoked_at) {
    const { error } = await db
      .from("ds_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("vendor_id", auth.vendorId);
    if (error) {
      return NextResponse.json({ error: "The key could not be revoked." }, { status: 500 });
    }
  }

  try {
    await db.from("ds_integration_logs").insert({
      vendor_id: auth.vendorId,
      operation: "api_key.revoked",
      status: "success",
      metadata: apiKeyAuditMetadata({
        keyId: existing.id,
        prefix: existing.key_prefix,
        scopes: existing.scopes ?? [],
      }),
    });
  } catch {
    // The key is already revoked. Keep the response successful.
  }

  return NextResponse.json({ revoked: true });
}
