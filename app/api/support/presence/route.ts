import { NextResponse } from "next/server";
import { readAgentAvailability } from "@/lib/support/conversations";

export async function GET() {
  const presence = await readAgentAvailability();
  if (!presence.ok) {
    return NextResponse.json({ available: false, status: "error" }, { status: 503 });
  }
  return NextResponse.json({ available: presence.count > 0, status: "ok" });
}
