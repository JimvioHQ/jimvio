import "server-only";
import tls from "node:tls";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Free, commercially permitted sources only:
 * - Phishing.Database (MIT licence) active phishing domain list.
 * - Google Web Risk Lookup API (commercial; first 100,000 calls/month free),
 *   only when WEB_RISK_API_KEY is set, hard-capped below the free allowance.
 * - IANA RDAP bootstrap + registry RDAP servers for domain age.
 * Google Safe Browsing, VirusTotal public, OpenPhish community and abuse.ch
 * community feeds are non-commercial and are deliberately NOT used.
 */

// The project's own host went offline; the same MIT list is published on GitHub.
const PHISH_LIST_URLS = [
  "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt",
  "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt",
  "https://phish.co.za/latest/phishing-domains-ACTIVE.txt",
];
const LIST_TTL_MS = 6 * 60 * 60 * 1000;
export const WEB_RISK_DAILY_CAP = 3000; // ≈ 90k/month, under the 100k free tier.

let phishCache: { at: number; domains: Set<string> } | null = null;
let phishLoading: Promise<Set<string> | null> | null = null;

async function loadPhishList(): Promise<Set<string> | null> {
  if (phishCache && Date.now() - phishCache.at < LIST_TTL_MS) return phishCache.domains;
  if (phishLoading) return phishLoading;
  phishLoading = (async () => {
    try {
      for (const url of PHISH_LIST_URLS) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
          if (!res.ok) continue;
          const text = await res.text();
          if (text.length < 1000 || text.length > 60_000_000) continue;
          const set = new Set<string>();
          for (const line of text.split("\n")) {
            const d = line.trim().toLowerCase();
            if (d && !d.startsWith("#")) set.add(d);
          }
          phishCache = { at: Date.now(), domains: set };
          return set;
        } catch {
          /* try the next mirror */
        }
      }
      console.warn("[trust] phishing list unavailable from every mirror");
      return phishCache?.domains ?? null;
    } finally {
      phishLoading = null;
    }
  })();
  return phishLoading;
}

/** Exact host or any parent domain on the Phishing.Database active list. */
export async function phishingListMatch(host: string): Promise<{ checked: boolean; match: string | null }> {
  const list = await loadPhishList();
  if (!list) return { checked: false, match: null };
  const parts = host.toLowerCase().split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (list.has(candidate)) return { checked: true, match: candidate };
  }
  return { checked: true, match: null };
}

export async function takeQuota(provider: string, dailyLimit: number): Promise<boolean> {
  try {
    const db = createServiceRoleClient() as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    };
    const { data, error } = await db.rpc("trust_take_quota", { p_provider: provider, p_daily_limit: dailyLimit });
    return !error && data === true;
  } catch {
    return false;
  }
}

export type WebRiskResult = {
  status: "match" | "clean" | "unavailable";
  threats: string[];
  note?: string;
  /** Why it was unavailable, without secrets. */
  reason?: "not_configured" | "quota" | "forbidden" | "invalid_key" | "provider_error" | "timeout";
};

export async function webRiskLookup(url: string): Promise<WebRiskResult> {
  const key = process.env.WEB_RISK_API_KEY?.trim();
  if (!key) return { status: "unavailable", threats: [], note: "Google Web Risk is not configured.", reason: "not_configured" };
  if (!(await takeQuota("google_web_risk", WEB_RISK_DAILY_CAP))) {
    return { status: "unavailable", threats: [], note: "Today's free Web Risk allowance is used up.", reason: "quota" };
  }
  const qs = new URLSearchParams({ uri: url, key });
  for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]) qs.append("threatTypes", t);
  try {
    const res = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${qs}`, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason: WebRiskResult["reason"] =
        res.status === 429 ? "quota" : res.status === 400 && /API key not valid/i.test(body) ? "invalid_key" : res.status === 403 ? "forbidden" : "provider_error";
      // Log the provider's reason (never the key) so the misconfiguration can be fixed.
      console.warn(`[trust] Web Risk ${res.status}: ${body.replace(/key=[^&\s"]+/g, "key=***").slice(0, 200)}`);
      const note =
        reason === "forbidden"
          ? "Google Web Risk refused the request (403): the Web Risk API is not enabled or billing is not set up for this key's project."
          : reason === "invalid_key"
            ? "Google Web Risk rejected the API key."
            : reason === "quota"
              ? "Google Web Risk quota is exhausted."
              : `Google Web Risk answered ${res.status}.`;
      return { status: "unavailable", threats: [], note, reason };
    }
    const json = (await res.json().catch(() => ({}))) as { threat?: { threatTypes?: string[] } };
    const threats = json.threat?.threatTypes ?? [];
    return threats.length ? { status: "match", threats } : { status: "clean", threats: [] };
  } catch {
    return { status: "unavailable", threats: [], note: "Google Web Risk did not answer in time.", reason: "timeout" };
  }
}

export type NetworkInfo = { network: string | null; org: string | null; country: string | null; range: string | null; source: string | null };

/** Who operates an IP address, from the regional internet registry's public RDAP. */
export async function ipNetwork(ip: string): Promise<NetworkInfo> {
  const empty: NetworkInfo = { network: null, org: null, country: null, range: null, source: null };
  if (!/^[0-9a-f:.]+$/i.test(ip)) return empty;
  try {
    const res = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return { ...empty, source: "RDAP (IP)" };
    const j = (await res.json()) as {
      name?: string; country?: string; startAddress?: string; endAddress?: string;
      entities?: { roles?: string[]; vcardArray?: [string, [string, unknown, string, unknown][]] }[];
    };
    const ent = j.entities?.find((e) => e.roles?.some((r) => r === "registrant" || r === "administrative")) ?? j.entities?.[0];
    const fn = ent?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3];
    return {
      network: typeof j.name === "string" ? j.name.slice(0, 80) : null,
      org: typeof fn === "string" ? fn.slice(0, 80) : null,
      country: typeof j.country === "string" ? j.country.toUpperCase().slice(0, 2) : null,
      range: j.startAddress && j.endAddress ? `${j.startAddress} – ${j.endAddress}` : null,
      source: "RDAP (IP)",
    };
  } catch {
    return { ...empty, source: "RDAP (IP)" };
  }
}

let rdapBootstrap: { at: number; map: Map<string, string> } | null = null;

async function rdapBase(tld: string): Promise<string | null> {
  if (!rdapBootstrap || Date.now() - rdapBootstrap.at > 24 * 3600_000) {
    try {
      const res = await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(8_000), cache: "no-store" });
      const json = (await res.json()) as { services?: [string[], string[]][] };
      const map = new Map<string, string>();
      for (const [tlds, urls] of json.services ?? []) for (const t of tlds) if (urls[0]) map.set(t.toLowerCase(), urls[0]);
      rdapBootstrap = { at: Date.now(), map };
    } catch {
      return null;
    }
  }
  return rdapBootstrap.map.get(tld.toLowerCase()) ?? null;
}

export type DomainAge = { registeredAt: string | null; ageDays: number | null; registrar: string | null; source: string | null; nameservers?: string[] };

export async function domainAge(registrable: string): Promise<DomainAge> {
  const tld = registrable.split(".").pop() ?? "";
  const base = await rdapBase(tld);
  if (!base) return { registeredAt: null, ageDays: null, registrar: null, source: null };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/domain/${encodeURIComponent(registrable)}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return { registeredAt: null, ageDays: null, registrar: null, source: "RDAP" };
    const json = (await res.json()) as {
      events?: { eventAction?: string; eventDate?: string }[];
      entities?: { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] }[];
      nameservers?: { ldhName?: string }[];
    };
    const nameservers = (json.nameservers ?? []).map((n) => String(n.ldhName ?? "").toLowerCase()).filter(Boolean).slice(0, 6);
    const reg = json.events?.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    const registrarEntity = json.entities?.find((e) => e.roles?.includes("registrar"));
    const fn = registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ?? null;
    const ageDays = reg ? Math.floor((Date.now() - Date.parse(reg)) / 86_400_000) : null;
    return { registeredAt: reg, ageDays, registrar: typeof fn === "string" ? fn : null, source: "RDAP", nameservers };
  } catch {
    return { registeredAt: null, ageDays: null, registrar: null, source: "RDAP" };
  }
}

export type TlsInfo = { ok: boolean; issuer: string | null; validTo: string | null; daysLeft: number | null; error?: string };

/** Reads the certificate from an already validated public IP. */
export function tlsInfo(host: string, ip: string): Promise<TlsInfo> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: ip, port: 443, servername: host, timeout: 6_000, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const validTo = cert?.valid_to ? new Date(cert.valid_to).toISOString() : null;
      const issuer = (cert?.issuer?.O as string | undefined) ?? (cert?.issuer?.CN as string | undefined) ?? null;
      socket.end();
      resolve({
        ok: authorized,
        issuer,
        validTo,
        daysLeft: validTo ? Math.floor((Date.parse(validTo) - Date.now()) / 86_400_000) : null,
        error: authorized ? undefined : String(socket.authorizationError ?? "Certificate not trusted"),
      });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, issuer: null, validTo: null, daysLeft: null, error: "TLS timeout" });
    });
    socket.on("error", (e) => resolve({ ok: false, issuer: null, validTo: null, daysLeft: null, error: e.message }));
  });
}
