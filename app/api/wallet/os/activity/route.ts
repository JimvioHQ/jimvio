import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { listWalletActivity } from "@/lib/wallet-os/activity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? 50);
  const cursor = sp.get("cursor");

  try {
    const rows = await listWalletActivity(user.id, { limit, cursor }, db);
    const activity = rows.map((row: {
      id: string;
      action: string;
      surface: string;
      amount: number | string | null;
      currency: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }) => ({
      id: row.id,
      action: row.action,
      surface: row.surface,
      amount: row.amount !== null ? Number(row.amount) : null,
      currency: row.currency ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }));
    const nextCursor = activity.length === limit ? activity[activity.length - 1]?.createdAt ?? null : null;
    return NextResponse.json({ activity, nextCursor });
  } catch (err) {
    console.error("GET /api/wallet/os/activity failed", err);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
