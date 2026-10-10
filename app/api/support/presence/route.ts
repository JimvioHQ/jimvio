import { NextResponse } from "next/server";
import { availableAgentCount } from "@/lib/support/conversations";

export async function GET() {
  const count = await availableAgentCount();
  return NextResponse.json({ available: count > 0 });
}
