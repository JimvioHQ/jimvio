import { NextRequest, NextResponse } from "next/server";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const db = dsAdminDb();
  const { data, error } = await db
    .from("ds_price_rules")
    .select("*")
    .eq("vendor_id", auth.vendorId)
    .order("priority", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    markup_type?: "percent" | "fixed";
    markup_value?: number;
    priority?: number;
  } | null;

  if (
    body?.markup_value == null ||
    typeof body.markup_value !== "number" ||
    body.markup_value < 0
  ) {
    return NextResponse.json(
      { error: "markup_value must be a non-negative number." },
      { status: 400 }
    );
  }

  const db = dsAdminDb();
  const { data, error } = await db
    .from("ds_price_rules")
    .insert({
      vendor_id: auth.vendorId,
      name: body.name?.trim() || "Default",
      markup_type: body.markup_type === "fixed" ? "fixed" : "percent",
      markup_value: body.markup_value,
      priority: body.priority ?? 100,
      is_active: true,
    })
    .select(
      "id, name, markup_type, markup_value, min_profit, max_price, rounding_rule, currency, priority, is_active, store_id, product_id"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create price rule." },
      { status: 500 }
    );
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}
