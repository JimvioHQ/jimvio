import { NextResponse } from "next/server";

/** Placeholder — Part 2 (use `sync-status` or PawaPay GET /v2/deposits/:id until implemented). */
export async function GET(_req: Request, _ctx: { params: Promise<{ depositId: string }> }) {
  return NextResponse.json({ error: "Not implemented — Part 2" }, { status: 501 });
}
