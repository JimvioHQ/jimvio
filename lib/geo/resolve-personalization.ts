import { cache } from "react";
import { headers } from "next/headers";
import { getDB } from "@/services/base";
import {
  accountCountryFact,
  choosePersonalizationCountry,
  hashIpForCache,
  ipFactFromHeaders,
  readCachedIpCountry,
  rememberIpCountry,
  type LocationFact,
} from "@/lib/geo/location-resolution";

function requestIp(source: Headers): string | null {
  const forwarded = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || source.get("x-real-ip") || source.get("cf-connecting-ip");
  if (!ip || ip === "Unknown IP") return null;
  return ip;
}

function factFromCache(
  cached: NonNullable<ReturnType<typeof readCachedIpCountry>>,
): LocationFact & { uncertain: boolean } {
  if (!cached.country) {
    return {
      sourceLabel: cached.uncertain ? "IP-estimated" : "Not available",
      country: null,
      region: cached.region,
      city: cached.city,
      value: "Not available",
      confidence: cached.confidence,
      updatedAt: null,
      note: "Cached unknown IP country.",
      useForPersonalization: false,
      uncertain: true,
    };
  }
  const place = [cached.city, cached.region, cached.country].filter(Boolean).join(", ");
  return {
    sourceLabel: "IP-estimated",
    country: cached.country,
    region: cached.region,
    city: cached.city,
    value: place,
    confidence: cached.confidence,
    updatedAt: null,
    note: "Estimated from the request network. This is not a street address.",
    useForPersonalization: cached.confidence !== "low" && !cached.uncertain,
    uncertain: cached.uncertain,
  };
}

/**
 * Account country wins when the user has actually declared one.
 * Otherwise a single confident edge-country estimate is used.
 * Missing headers, proxy codes, and provider disagreement return null.
 */
export const resolvePersonalizationCountry = cache(async (): Promise<string | null> => {
  try {
    const source = await headers();
    const ip = requestIp(source);
    const ipHash = ip ? hashIpForCache(ip) : null;
    const cached = ipHash ? readCachedIpCountry(ipHash) : undefined;
    const ipFact = cached ? factFromCache(cached) : ipFactFromHeaders(source);
    if (ipHash && !cached) {
      rememberIpCountry(ipHash, {
        country: ipFact.country,
        region: ipFact.region,
        city: ipFact.city,
        confidence: ipFact.confidence,
        uncertain: ipFact.uncertain,
      });
    }

    let account: LocationFact = accountCountryFact({
      country: null,
      city: null,
      createdAt: null,
      updatedAt: null,
    });
    try {
      const db = await getDB();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (user) {
        const { data: profile } = await db
          .from("profiles")
          .select("country, city, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle();
        account = accountCountryFact({
          country: profile?.country ?? null,
          city: profile?.city ?? null,
          createdAt: profile?.created_at ?? null,
          updatedAt: profile?.updated_at ?? null,
        });
      }
    } catch {
      account = accountCountryFact({
        country: null,
        city: null,
        createdAt: null,
        updatedAt: null,
      });
    }

    return choosePersonalizationCountry(account, ipFact);
  } catch {
    return null;
  }
});
