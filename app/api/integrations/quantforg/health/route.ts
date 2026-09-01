import { NextResponse } from "next/server";
import { getQuantForgIntegrationStatus } from "@/lib/integrations/quantforg/publish-event";
import {
  QUANTFORG_COMMUNITY_SLUG,
  QUANTFORG_SPACE_SLUG,
} from "@/lib/integrations/quantforg/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/quantforg/health
 * Operational status for the QuantForg → Jimvio integration (no secrets).
 */
export async function GET() {
  try {
    const status = await getQuantForgIntegrationStatus();
    return NextResponse.json({
      ok: status.configured,
      service: "quantforg_integration",
      destination: {
        community_slug: QUANTFORG_COMMUNITY_SLUG,
        space_slug: QUANTFORG_SPACE_SLUG,
        ...status.destination,
      },
      last_event: status.last_event,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
