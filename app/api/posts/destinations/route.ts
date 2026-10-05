import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizedPostDestinations } from "@/lib/community/post-destinations";

export const dynamic = "force-dynamic";

/**
 * Authorized Create Post destinations for the signed-in user.
 * Unique communities only — no owner-membership fan-out.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const destinations = await getAuthorizedPostDestinations(supabase, user.id);
    return NextResponse.json({ destinations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load destinations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
