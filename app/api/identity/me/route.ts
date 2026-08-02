import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getIdentityByUserId } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

/**
 * GET /api/identity/me
 * Returns the unified `IdentityProfilePayload` for the current authenticated user.
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const identity = await getIdentityByUserId(user.id, user.id);
  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  return NextResponse.json(identity);
}
