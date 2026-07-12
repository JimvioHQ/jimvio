import { NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/cj/premium-intelligence/super-admin-auth";
import {
  computeCatalogHealth,
  getLatestCatalogHealth,
} from "@/lib/cj/premium-intelligence/catalog-health";
import { getLatestRecommendations, generateAiRecommendations } from "@/lib/cj/premium-intelligence/ai-recommendations";

export async function GET(req: Request) {
  const auth = await assertAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const health = refresh
    ? await computeCatalogHealth()
    : (await getLatestCatalogHealth()) ?? (await computeCatalogHealth());

  const recommendations = refresh
    ? await generateAiRecommendations()
    : await getLatestRecommendations();

  return NextResponse.json({ success: true, health, recommendations });
}
