import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { decryptCredentials } from "@/lib/live/destinations/encryption";
import { TIKTOK_VIDEO_LIST_SCOPE } from "@/lib/live/destinations/adapters/tiktok";

export const dynamic = "force-dynamic";

type AccountState = { connected: boolean; canReadViews: boolean; name: string | null };

/**
 * Which accounts the signed-in creator has connected for real view checks.
 * Never returns tokens or ids.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { data } = await db
    .from("live_destinations")
    .select("platform, display_name, encrypted_credentials, last_connected_at")
    .eq("user_id", user.id)
    .in("platform", ["youtube", "tiktok"])
    .is("revoked_at", null)
    .order("last_connected_at", { ascending: false, nullsFirst: false });

  const accounts: Record<"youtube" | "tiktok", AccountState> = {
    youtube: { connected: false, canReadViews: false, name: null },
    tiktok: { connected: false, canReadViews: false, name: null },
  };
  for (const row of (data ?? []) as { platform: "youtube" | "tiktok"; display_name: string; encrypted_credentials: string | null }[]) {
    const slot = accounts[row.platform];
    if (!slot || slot.connected || !row.encrypted_credentials) continue;
    let scopes: string[] = [];
    try {
      scopes = decryptCredentials(row.encrypted_credentials).scopes ?? [];
    } catch {
      continue;
    }
    slot.connected = true;
    slot.name = row.display_name;
    slot.canReadViews = row.platform === "youtube" ? true : scopes.includes(TIKTOK_VIDEO_LIST_SCOPE);
  }
  return NextResponse.json({ accounts });
}
