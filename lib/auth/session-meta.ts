import { ipFactFromHeaders } from "@/lib/geo/location-resolution";

export type NetworkSignal = "anonymizer" | "disagreement" | "none";

export type SessionRequestMeta = {
  userAgent: string;
  ip: string;
  country?: string;
  region?: string | null;
  city?: string | null;
  networkSignal?: NetworkSignal | null;
};

function networkSignalFromFact(
  note: string | null,
  uncertain: boolean,
  confidence: string,
  country: string | null,
): NetworkSignal | null {
  if (uncertain && /proxy|Tor|anonym/i.test(note ?? "")) return "anonymizer";
  if (uncertain && confidence === "low") return "disagreement";
  if (!uncertain && country) return "none";
  return null;
}

export function sessionMetaFromHeaders(
  headers: Headers | { get(name: string): string | null },
): SessionRequestMeta {
  const fact = ipFactFromHeaders(headers);
  return {
    userAgent: headers.get("user-agent") ?? "Unknown browser",
    ip:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      "Unknown IP",
    country: fact.country ?? undefined,
    region: fact.uncertain ? null : fact.region,
    city: fact.uncertain ? null : fact.city,
    networkSignal: networkSignalFromFact(fact.note, fact.uncertain, fact.confidence, fact.country),
  };
}
