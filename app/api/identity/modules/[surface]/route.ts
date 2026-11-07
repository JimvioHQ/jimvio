import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getModuleSnapshots,
  modulePresenceFromSnapshots,
  toPublicModuleSlice,
} from "@/lib/identity/module-snapshots";

export const dynamic = "force-dynamic";

const SURFACES = new Set(["ugc", "affiliate", "marketplace", "community"]);

/**
 * GET /api/identity/modules/[surface]?userId=...|username=...
 * surface: ugc | affiliate | marketplace | community
 *
 * Always returns the public-safe slice for the Identity profile (owned-only
 * modules, no private financial metrics). Private dashboards use their own APIs.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;
  if (!SURFACES.has(surface)) {
    return NextResponse.json({ error: "Invalid surface" }, { status: 400 });
  }

  const userIdParam = req.nextUrl.searchParams.get("userId");
  const usernameParam = req.nextUrl.searchParams.get("username");
  const { user: viewer } = await requireUser();
  const db = createServiceRoleClient();

  let targetId = userIdParam;
  if (!targetId && usernameParam) {
    const { data: profileRow } = await db
      .from("profiles")
      .select("id")
      .ilike("username", usernameParam)
      .maybeSingle();
    targetId = profileRow?.id ?? null;
    if (!targetId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
  }
  if (!targetId) {
    if (!viewer) return NextResponse.json({ error: "userId or username is required" }, { status: 400 });
    targetId = viewer.id;
  }

  const isSelf = Boolean(viewer) && viewer!.id === targetId;
  const snapshots = await getModuleSnapshots(targetId);
  const slice = toPublicModuleSlice(
    surface as "ugc" | "affiliate" | "marketplace" | "community",
    snapshots,
  );
  const presence = modulePresenceFromSnapshots(snapshots);

  return NextResponse.json({
    surface,
    isOwner: isSelf,
    data: slice,
    presence,
    computedAt: snapshots.computedAt,
  });
}
