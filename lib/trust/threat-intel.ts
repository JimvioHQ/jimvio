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

const PHISH_LIST_URL = "https://phish.co.za/latest/phishing-domains-ACTIVE.txt";
const LIST_TTL_MS = 6 * 60 * 60 * 1000;
export const WEB_RISK_DAILY_CAP = 3000; // ≈ 90k/month, under the 100k free tier.

let phishCache: { at: number; domains: Set<string> } | null = null;
let phishLoading: Promise<Set<string> | null> | null = null;

async function loadPhishList(): Promise<Set<string> | null> {
  if (phishCache && Date.now() - phishCache.at < LIST_TTL_MS) return phishCache.domains;
  if (phishLoading) return phishLoading;
  phishLoading = (async () => {
    try {
      const res = await fetch(PHISH_LIST_URL, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (!res.ok) return phishCache?.domains ?? null;
      const text = await res.text();
      if (text.length > 40_000_000) return phishCache?.domains ?? null;
      const set = new Set<string>();
      for (const line of text.split("\n")) {
        const d = line.trim().toLowerCase();
        if (d && !d.startsWith("#")) set.add(d);
      }
      phishCache = { at: Date.now(), domains: set };
      return set;
    } catch {
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

export type WebRiskResult = { status: "match" | "clean" | "unavailable"; threats: string[]; note?: string };

export async function webRiskLookup(url: string): Promise<WebRiskResult> {
  const key = process.env.WEB_RISK_API_KEY?.trim();
  if (!key) return { status: "unavailable", threats: [], note: "Google Web Risk is not configured." };
  if (!(await takeQuota("google_web_risk", WEB_RISK_DAILY_CAP))) {
    return { status: "unavailable", threats: [], note: "Today's free Web Risk allowance is used up." };
  }
  const qs = new URLSearchParams({ uri: url, key });
  for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]) qs.append("threatTypes", t);
  try {
    const res = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${qs}`, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return { status: "unavailable", threats: [], note: `Web Risk answered ${res.status}.` };
    const json = (await res.json().catch(() => ({}))) as { threat?: { threatTypes?: string[] } };
    const threats = json.threat?.threatTypes ?? [];
    return threats.length ? { status: "match", threats } : { status: "clean", threats: [] };
  } catch {
    return { status: "unavailable", threats: [], note: "Web Risk did not answer in time." };
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

export type DomainAge = { registeredAt: string | null; ageDays: number | null; registrar: string | null; source: string | null };

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
    };
    const reg = json.events?.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    const registrarEntity = json.entities?.find((e) => e.roles?.includes("registrar"));
    const fn = registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ?? null;
    const ageDays = reg ? Math.floor((Date.now() - Date.parse(reg)) / 86_400_000) : null;
    return { registeredAt: reg, ageDays, registrar: typeof fn === "string" ? fn : null, source: "RDAP" };
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
