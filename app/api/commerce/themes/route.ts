import { NextResponse } from "next/server";
import { requireCommerceMerchant, cosAdminDb } from "@/lib/commerce-os";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = cosAdminDb();
  const { data, error } = await cosTable(db, "jimvio_themes")
    .select(
      "id, code, name, description, category, preview_image, default_settings, templates, is_active"
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to list themes." },
      { status: 500 }
    );
  }

  return NextResponse.json({ themes: data ?? [] });
}
