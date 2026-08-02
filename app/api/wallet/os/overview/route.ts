import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsOverview } from "@/lib/wallet-os/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const overview = await getWalletOsOverview(user.id);
    return NextResponse.json({ overview });
  } catch (err) {
    console.error("GET /api/wallet/os/overview failed", err);
    return NextResponse.json({ error: "Failed to load wallet overview" }, { status: 500 });
  }
}
