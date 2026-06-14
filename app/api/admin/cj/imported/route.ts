import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cj_product_map")
    .select("cj_pid, product_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.cj_pid && row.product_id) {
      map[row.cj_pid] = row.product_id;
    }
  }

  return NextResponse.json({ map });
}
