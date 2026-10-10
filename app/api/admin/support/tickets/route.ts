import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { staffListTickets } from "@/lib/support/store";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const result = await staffListTickets({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 40),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ tickets: result.tickets });
}
