import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsEscrowSnapshot } from "@/lib/wallet-os/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const escrow = await getWalletOsEscrowSnapshot(user.id);
    return NextResponse.json({ escrow });
  } catch (err) {
    console.error("GET /api/wallet/os/escrow failed", err);
    return NextResponse.json({ error: "Failed to load escrow" }, { status: 500 });
  }
}
