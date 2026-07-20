import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";
import { getPlatformOperations } from "@/services/ops/platform-ops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getPlatformOperations());
}
