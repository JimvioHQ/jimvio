import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ipFactFromHeaders } from "@/lib/geo/location-resolution";
import { ensureJipIdentity } from "@/lib/identity/resolve";
import {
  clockMatchesCountry,
  decideCountry,
  validCountryCode,
  type CountryDecision,
  type CountrySignal,
} from "@/lib/geo/country-trust";

// Tables added after the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any };

function db(): Db {
  return createServiceRoleClient() as unknown as Db;
}

const WINDOW_DAYS = 30;

/** Records today's network country and device clock for a signed-in user. */
export async function recordCountrySignal(
  userId: string,
  headers: Headers,
  client: { offsetMinutes?: unknown; timeZone?: unknown },
): Promise<CountryDecision> {
  const fact = ipFactFromHeaders(headers);
  const anonymizer = fact.uncertain && /proxy|Tor|anonym/i.test(fact.note ?? "");
  const ipCountry = fact.uncertain ? null : validCountryCode(fact.country);
  const offset = Number(client.offsetMinutes);
  const browserOffset = Number.isFinite(offset) && Math.abs(offset) <= 14 * 60 ? Math.round(offset) : null;
  const timeZone = typeof client.timeZone === "string" ? client.timeZone.slice(0, 64) : null;
  const matches = clockMatchesCountry(ipCountry, browserOffset);
  const day = new Date().toISOString().slice(0, 10);
  const store = db();

  const lookup = store
    .from("user_country_signals")
    .select("id, seen_count")
    .eq("user_id", userId)
    .eq("day", day);
  const { data: existingRow } = await (ipCountry ? lookup.eq("ip_country", ipCountry) : lookup.is("ip_country", null))
    .limit(1)
    .maybeSingle();

  const row = {
    browser_offset_minutes: browserOffset,
    time_zone: timeZone,
    offset_matches: matches,
    anonymizer,
    updated_at: new Date().toISOString(),
  };
  if (existingRow?.id) {
    await store
      .from("user_country_signals")
      .update({ ...row, seen_count: Number(existingRow.seen_count ?? 1) + 1 })
      .eq("id", existingRow.id);
  } else {
    await store.from("user_country_signals").insert({ ...row, user_id: userId, day, ip_country: ipCountry });
  }
  await ensureJipIdentity(userId).catch(() => undefined);
  return refreshVerifiedCountry(userId);
}

export async function refreshVerifiedCountry(userId: string): Promise<CountryDecision> {
  const store = db();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [{ data: rows }, { data: identity }] = await Promise.all([
    store
      .from("user_country_signals")
      .select("day, ip_country, offset_matches, anonymizer")
      .eq("user_id", userId)
      .gte("day", since)
      .limit(200),
    store.from("jip_identity").select("user_id, identity_verified").eq("user_id", userId).maybeSingle(),
  ]);
  const decision = decideCountry((rows ?? []) as CountrySignal[], {
    identityVerified: Boolean(identity?.identity_verified),
  });
  if (identity?.user_id) {
    await store
      .from("jip_identity")
      .update({
        verified_country: decision.country,
        country_confidence: decision.confidence,
        country_vpn_suspected: decision.vpnSuspected,
        country_checked_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }
  return decision;
}

export type AccountCountry = {
  declared: string | null;
  verified: string | null;
  confidence: "none" | "low" | "medium" | "high";
  vpnSuspected: boolean;
};

export async function loadAccountCountry(userId: string): Promise<AccountCountry> {
  const store = db();
  const [{ data: profile }, { data: identity }] = await Promise.all([
    store.from("profiles").select("country").eq("id", userId).maybeSingle(),
    store
      .from("jip_identity")
      .select("verified_country, country_confidence, country_vpn_suspected")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return {
    declared: profile?.country ?? null,
    verified: identity?.verified_country ?? null,
    confidence: (identity?.country_confidence as AccountCountry["confidence"]) ?? "none",
    vpnSuspected: Boolean(identity?.country_vpn_suspected),
  };
}
