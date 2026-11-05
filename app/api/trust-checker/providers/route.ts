import { NextResponse } from "next/server";
import { health, PROVIDERS } from "@/lib/trust/intel-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/trust-checker/providers — the threat-intelligence sources Jimvio
 * actually queries (all free forever, no credentials) and their last outcome
 * on this server instance. Nothing secret is involved or returned.
 */
export async function GET() {
  const providers = Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    name: p.name,
    covers: p.covers,
    terms: p.terms,
    credentials: "none",
    last: health.get(p.id) ?? null,
  }));
  return NextResponse.json(
    {
      providers,
      count: providers.length,
      malwareUrlDatabase: false,
      note: "No eligible free-forever malware-URL database is available; malware checks report that gap instead of a result. Last outcomes are per server instance and reset on deploy.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
