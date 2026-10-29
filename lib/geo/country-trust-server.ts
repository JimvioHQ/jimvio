import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ipFactFromHeaders } from "@/lib/geo/location-resolution";
import { ensureJipIdentity } from "@/lib/identity/resolve";
import { readPreciseLocation } from "@/lib/geo/precise-location-store";
import { ALL_COUNTRY_CODES } from "@/lib/geo/timezone-country";
import {
  clockMatchesCountry,
  countryCodeFromName,
  countryToLock,
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
  const deviceCountry = await deviceLocationCountry(userId);
  await lockCountryIfNeeded(userId, countryToLock({ deviceCountry, ipCountry, anonymizer, clockMatches: matches }));
  return refreshVerifiedCountry(userId, deviceCountry);
}

/** Country from the person's shared device location (address), if any. */
async function deviceLocationCountry(userId: string): Promise<string | null> {
  try {
    const precise = await readPreciseLocation(userId);
    const part = precise?.components?.find((c) => /^country$/i.test(c.label));
    return countryCodeFromName(part?.value ?? null, ALL_COUNTRY_CODES);
  } catch {
    return null;
  }
}

/**
 * Writes the real country on the profile once and locks it. A device
 * location reading may correct an earlier network-only lock.
 */
async function lockCountryIfNeeded(
  userId: string,
  pick: { country: string; source: "device_location" | "network" } | null,
): Promise<void> {
  if (!pick) return;
  const store = db();
  const { data: profile } = await store
    .from("profiles")
    .select("country, country_locked_at, country_source")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;
  const locked = Boolean(profile.country_locked_at);
  const upgrade = locked && profile.country_source === "network" && pick.source === "device_location" && profile.country !== pick.country;
  if (locked && !upgrade) return;
  await store
    .from("profiles")
    .update({
      country: pick.country,
      country_locked_at: new Date().toISOString(),
      country_source: pick.source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export async function refreshVerifiedCountry(userId: string, deviceCountry: string | null = null): Promise<CountryDecision> {
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
  const network = decideCountry((rows ?? []) as CountrySignal[], {
    identityVerified: Boolean(identity?.identity_verified),
  });
  // Device location (address) is the strongest signal. A network country
  // that disagrees with it is treated as a VPN or proxy.
  const decision: CountryDecision = deviceCountry
    ? {
        ...network,
        country: deviceCountry,
        confidence: network.country === deviceCountry ? "high" : "medium",
        vpnSuspected: network.vpnSuspected || (network.country != null && network.country !== deviceCountry),
      }
    : network;
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
  locked: boolean;
  source: string | null;
  verified: string | null;
  confidence: "none" | "low" | "medium" | "high";
  vpnSuspected: boolean;
};

export async function loadAccountCountry(userId: string): Promise<AccountCountry> {
  const store = db();
  const [{ data: profile }, { data: identity }] = await Promise.all([
    store.from("profiles").select("country, country_locked_at, country_source").eq("id", userId).maybeSingle(),
    store
      .from("jip_identity")
      .select("verified_country, country_confidence, country_vpn_suspected")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return {
    declared: profile?.country ?? null,
    locked: Boolean(profile?.country_locked_at),
    source: profile?.country_source ?? null,
    verified: identity?.verified_country ?? null,
    confidence: (identity?.country_confidence as AccountCountry["confidence"]) ?? "none",
    vpnSuspected: Boolean(identity?.country_vpn_suspected),
  };
}

/** Called after the person shares device location: lock / correct the real country. */
export async function syncCountryFromDevice(userId: string): Promise<void> {
  const deviceCountry = await deviceLocationCountry(userId);
  if (!deviceCountry) return;
  await lockCountryIfNeeded(userId, { country: deviceCountry, source: "device_location" });
  await refreshVerifiedCountry(userId, deviceCountry);
}
