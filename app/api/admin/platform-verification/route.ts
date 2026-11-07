import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/cj/premium-intelligence/super-admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/platform-verification
 * Admin-only list of platform verification grants (status metadata, no evidence paths).
 */
export async function GET(req: NextRequest) {
  const auth = await assertAdminAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));

  const db = createServiceClient();
  let query = db
    .from("platform_verification_grants")
    .select(
      "id, entity_type, entity_id, category, status, reason, reviewer_id, decided_at, expires_at, revocation_reason, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);
  if (category && category !== "all") query = query.eq("category", category);
  if (q) {
    // UUID search only — never expose evidence via text search.
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
    if (uuid) query = query.or(`entity_id.eq.${q},id.eq.${q}`);
  }

  const { data, error } = await query;
  if (error) {
    // Table may not exist until migration is applied.
    return NextResponse.json(
      { error: error.message, code: "MIGRATION_REQUIRED", grants: [] },
      { status: error.code === "42P01" ? 503 : 500 },
    );
  }

  return NextResponse.json({ grants: data ?? [] });
}
