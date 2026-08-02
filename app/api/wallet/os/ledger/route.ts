import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsLedger } from "@/lib/wallet-os/ledger";
import { isKnownWalletSurface } from "@/lib/wallet-os/surfaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const surfaceParam = sp.get("surface");
  const surface = isKnownWalletSurface(surfaceParam) ? surfaceParam : null;
  const q = sp.get("q");
  const cursor = sp.get("cursor");
  const limit = Number(sp.get("limit") ?? 20);

  try {
    const page = await getWalletOsLedger(user.id, { surface, q, cursor, limit });
    return NextResponse.json(page);
  } catch (err) {
    console.error("GET /api/wallet/os/ledger failed", err);
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}
