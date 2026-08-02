import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUsername } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

/**
 * GET /api/identity/[username]
 * Public identity lookup, privacy-gated. Viewer (if authenticated) gets
 * extra detail when they are the owner, an admin, or otherwise permitted.
 * Returns the `IdentityProfilePayload` directly (unwrapped) — this is the
 * client-side fallback source for `IdentityPublicProfileClient`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identity = await getIdentityByUsername(decodeURIComponent(username), user?.id ?? null);
  if (!identity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(identity);
}
