import { NextResponse } from "next/server";

/** Placeholder — Part 2 */
export async function POST(_req: Request, _ctx: { params: Promise<{ depositId: string }> }) {
  return NextResponse.json({ error: "Not implemented — Part 2" }, { status: 501 });
}
