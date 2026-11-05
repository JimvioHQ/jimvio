import { NextResponse } from "next/server";
import { health, PROVIDERS } from "@/lib/trust/intel-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/trust-checker/providers — which threat-intelligence sources are
 * configured and their last outcome on this server instance. Never returns
 * keys or values, only whether each one is set.
 */
export async function GET() {
  const env = process.env;
  const configured: Record<string, boolean> = {
    phishing_database: true,
    cert_pl: true,
    feodo: true,
    sslbl: true,
    urlhaus: Boolean(env.URLHAUS_AUTH_KEY?.trim()),
    phishtank: Boolean(env.PHISHTANK_APP_KEY?.trim() && env.PHISHTANK_USERNAME?.trim()),
    openphish: Boolean(env.OPENPHISH_FEED_URL?.trim()),
    google_web_risk: Boolean(env.WEB_RISK_API_KEY?.trim()),
  };
  const providers = Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    name: p.name,
    covers: p.covers,
    terms: p.terms,
    configured: configured[p.id] ?? false,
    last: health.get(p.id) ?? null,
  }));
  return NextResponse.json({ providers, note: "Last outcomes are per server instance and reset on deploy." }, { headers: { "cache-control": "no-store" } });
}
