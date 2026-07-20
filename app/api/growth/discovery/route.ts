import { NextResponse } from "next/server";
import { getDiscoveryShelves } from "@/services/growth/discovery";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDiscoveryShelves());
}
