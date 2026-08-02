import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getModuleSnapshots } from "@/lib/identity/module-snapshots";

export const dynamic = "force-dynamic";

const SURFACES = new Set(["ugc", "affiliate", "marketplace", "community"]);

/**
 * GET /api/identity/modules/[surface]?userId=...
 * surface: ugc | affiliate | marketplace | community
 * Returns the matching slice of `getModuleSnapshots` for the target user
 * (defaults to the authenticated user). Financial slices (affiliate,
 * marketplace revenue) are only returned to the owner or an admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;
  if (!SURFACES.has(surface)) {
    return NextResponse.json({ error: "Invalid surface" }, { status: 400 });
  }

  const userIdParam = req.nextUrl.searchParams.get("userId");
  const { user: viewer } = await requireUser();

  let targetId = userIdParam;
  if (!targetId) {
    if (!viewer) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    targetId = viewer.id;
  }

  const isSelf = Boolean(viewer) && viewer!.id === targetId;
  let isAdmin = false;
  if (viewer && !isSelf) {
    const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: roleRow } = await db
      .from("user_roles")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();
    isAdmin = Boolean(roleRow);
  }

  const snapshots = await getModuleSnapshots(targetId);
  const slice = snapshots[surface as "ugc" | "affiliate" | "marketplace" | "community"];

  const isFinancialSurface = surface === "affiliate" || surface === "marketplace";
  if (isFinancialSurface && !isSelf && !isAdmin) {
    return NextResponse.json({ error: "Not authorized to view this data" }, { status: 403 });
  }

  return NextResponse.json({ surface, isOwner: isSelf, data: slice, computedAt: snapshots.computedAt });
}
