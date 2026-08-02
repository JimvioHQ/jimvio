import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsAnalytics } from "@/lib/wallet-os/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const analytics = await getWalletOsAnalytics(user.id);
    return NextResponse.json({ analytics });
  } catch (err) {
    console.error("GET /api/wallet/os/analytics failed", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
