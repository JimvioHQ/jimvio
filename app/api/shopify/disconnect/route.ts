import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireVendorOwnerOrAdmin } from "@/lib/auth/api-helpers";
import { previewPrivilegedForbidden } from "@/lib/ops/preview-guard";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export async function POST(req: NextRequest) {
  const blocked = previewPrivilegedForbidden();
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  if (!vendorId) {
    return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
  }

  const gate = await requireVendorOwnerOrAdmin(vendorId);
  if ("error" in gate) return gate.error;

  const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("shopify_credentials")
    .delete()
    .eq("vendor_id", vendorId);

  if (error) {
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
