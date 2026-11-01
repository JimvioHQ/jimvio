/**
 * Local, explainable URL and page checks. No outside service is needed.
 * Each signal says exactly what was seen so people can judge it themselves.
 */
import { getDomain, getSubdomain, getPublicSuffix } from "tldts";
import type { CheckerResult, Finding } from "./types";

export const BRANDS: { name: string; domains: string[] }[] = [
  { name: "youtube", domains: ["youtube.com", "youtu.be", "youtube-nocookie.com"] },
  { name: "x", domains: ["x.com", "twitter.com", "t.co"] },
  { name: "threads", domains: ["threads.net", "threads.com"] },
  { name: "paypal", domains: ["paypal.com", "paypal.me"] },
  { name: "google", domains: ["google.com", "gmail.com", "goo.gl", "g.co", "googleusercontent.com", "googleapis.com", "gstatic.com", "googlevideo.com", "ytimg.com", "google.co.rw"] },
  { name: "facebook", domains: ["facebook.com", "fb.com", "fb.me", "meta.com", "fbcdn.net", "facebook.net"] },
  { name: "instagram", domains: ["instagram.com", "cdninstagram.com"] },
  { name: "whatsapp", domains: ["whatsapp.com", "wa.me"] },
  { name: "tiktok", domains: ["tiktok.com", "tiktokcdn.com", "tiktokv.com"] },
  { name: "apple", domains: ["apple.com", "icloud.com", "apple.co", "mzstatic.com"] },
  { name: "microsoft", domains: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com"] },
  { name: "amazon", domains: ["amazon.com", "amazon.co.uk", "amzn.to", "amazonaws.com", "media-amazon.com", "amazon.de", "amazon.fr"] },
  { name: "netflix", domains: ["netflix.com"] },
  { name: "binance", domains: ["binance.com"] },
  { name: "coinbase", domains: ["coinbase.com"] },
  { name: "metamask", domains: ["metamask.io"] },
  { name: "telegram", domains: ["telegram.org", "t.me"] },
  { name: "mtn", domains: ["mtn.com", "mtn.co.rw", "mtn.ng", "mtn.co.ug", "mtn.co.za", "mtn.com.gh"] },
  { name: "airtel", domains: ["airtel.com", "airtel.africa", "airtel.co.rw", "airtel.in"] },
  { name: "mpesa", domains: ["safaricom.co.ke"] },
  { name: "jimvio", domains: ["jimvio.com"] },
  { name: "dhl", domains: ["dhl.com"] },
  { name: "western union", domains: ["westernunion.com"] },
];

const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "rb.gy", "is.gd", "cutt.ly", "ow.ly", "buff.ly", "shorturl.at", "tiny.cc", "s.id", "rebrand.ly", "t.ly"]);
const RISKY_TLDS = new Set(["zip", "mov", "top", "xyz", "click", "link", "cfd", "sbs", "buzz", "rest", "icu", "gq", "tk", "ml", "cf", "ga", "work", "support", "cam", "lol"]);
const BAIT_WORDS = /(log-?in|sign-?in|verify|verification|secure|update|unlock|suspend|wallet|seed|airdrop|claim|bonus|giveaway|free-?(gift|money|crypto)|reward|recover|kyc)/i;
const RISKY_DOWNLOAD = /\.(exe|scr|msi|bat|cmd|com|pif|vbs|js|jar|apk|dmg|pkg|ps1|hta|iso|img)(\?|$)/i;

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function officialFor(registrable: string): string | null {
  for (const b of BRANDS) if (b.domains.includes(registrable)) return b.name;
  return null;
}

export type UrlFacts = {
  host: string;
  registrable: string | null;
  suffix: string | null;
  isIp: boolean;
};

export function urlFacts(u: URL): UrlFacts {
  const host = u.hostname.toLowerCase();
  return {
    host,
    registrable: getDomain(host) ?? null,
    suffix: getPublicSuffix(host) ?? null,
    isIp: /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":"),
  };
}

/** Signals from the address alone. */
export function urlSignals(u: URL): Finding[] {
  const f: Finding[] = [];
  const { host, registrable, suffix, isIp } = urlFacts(u);
  const src = "URL analysis";
  if (u.protocol === "http:") f.push({ tone: "warn", title: "Not encrypted (http)", detail: "Anything typed on this page can be read in transit.", source: src });
  if (isIp) f.push({ tone: "warn", title: "Uses a raw IP address", detail: "Real brands use names, not bare IP addresses.", source: src });
  if (host.split(".").some((l) => l.startsWith("xn--"))) {
    f.push({ tone: "warn", title: "Uses look-alike characters (punycode)", detail: `The address is really "${host}".`, source: src });
  }
  if (u.toString().includes("@")) f.push({ tone: "warn", title: "Contains “@” in the link", detail: "This trick hides the real destination.", source: src });
  const sub = getSubdomain(host) ?? "";
  if (sub.split(".").filter(Boolean).length >= 4) f.push({ tone: "warn", title: "Unusually many subdomains", detail: host, source: src });
  if (u.toString().length > 200) f.push({ tone: "info", title: "Very long link", detail: "Long links can hide where they really go.", source: src });
  if (registrable && SHORTENERS.has(registrable)) f.push({ tone: "info", title: "Link shortener", detail: "The real destination is hidden until opened; Jimvio follows it safely.", source: src });
  if (suffix && RISKY_TLDS.has(suffix)) f.push({ tone: "warn", title: `Ending .${suffix} is often abused`, detail: "Many legitimate sites use it too — it is one signal, not proof.", source: src });
  if (BAIT_WORDS.test(`${sub} ${u.pathname}`)) f.push({ tone: "warn", title: "Bait words in the link", detail: "Words like login, verify, wallet, claim or bonus are common in phishing links.", source: src });
  if (RISKY_DOWNLOAD.test(u.pathname)) f.push({ tone: "bad", title: "Direct download of a program or app", detail: "Opening it can install software on your device.", source: src });

  // Brand impersonation: brand name in the address but not the brand's own domain.
  if (registrable && !officialFor(registrable)) {
    const label = registrable.split(".")[0];
    for (const b of BRANDS) {
      const token = b.name.replace(/\s+/g, "");
      if (token.length < 3) continue;
      const labels = host.split(/[-.]/);
      const named = token.length >= 5 ? host.replace(/[-.]/g, "").includes(token) : labels.includes(token);
      if (named) {
        f.push({
          tone: "bad",
          title: `Uses the name “${b.name}” on a domain that isn't theirs`,
          detail: `${b.name}'s real sites are ${b.domains.slice(0, 3).join(", ")}. This one is ${registrable}.`,
          source: src,
        });
        break;
      }
      if (token.length >= 5 && levenshtein(label, token) === 1) {
        f.push({
          tone: "bad",
          title: `Looks like “${b.domains[0]}” but is spelled differently`,
          detail: `${registrable} is one letter away from ${b.name}.`,
          source: src,
        });
        break;
      }
    }
  }
  return f;
}

/** Signals from the page Jimvio safely downloaded. */
export function pageSignals(html: string, finalUrl: URL, contentType: string): Finding[] {
  const f: Finding[] = [];
  const src = "Page content";
  const finalReg = getDomain(finalUrl.hostname) ?? finalUrl.hostname;
  if (/application\/(x-msdownload|x-msi|vnd\.android\.package-archive|x-sh|x-executable)/i.test(contentType)) {
    f.push({ tone: "bad", title: "The link downloads a program", detail: contentType, source: "HTTP headers" });
    return f;
  }
  if (!/text\/html|application\/xhtml/i.test(contentType)) return f;
  const lower = html.slice(0, 600_000).toLowerCase();
  const title = /<title[^>]*>([^<]{0,200})<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  if (/type=["']?password/.test(lower)) {
    const actions = [...lower.matchAll(/<form[^>]*action=["']([^"']+)["']/g)].map((m) => m[1]);
    const offsite = actions.find((a) => {
      try {
        const t = new URL(a, finalUrl);
        return (getDomain(t.hostname) ?? t.hostname) !== finalReg;
      } catch {
        return false;
      }
    });
    f.push(
      offsite
        ? { tone: "bad", title: "Password form sends to another website", detail: `Typed passwords go to ${offsite}.`, source: src }
        : { tone: "info", title: "The page asks for a password", detail: "Only type it if this is the real site.", source: src },
    );
  }
  if (/(seed phrase|recovery phrase|secret phrase|12[- ]word|24[- ]word|private key)/.test(lower)) {
    f.push({ tone: "bad", title: "Asks for a wallet recovery phrase", detail: "No real service ever asks for this. It gives full control of the wallet.", source: src });
  }
  if (/(double your (crypto|bitcoin|money)|guaranteed (profit|returns)|send .{0,20} (btc|usdt|eth) .{0,30}receive)/.test(lower)) {
    f.push({ tone: "bad", title: "Money-doubling or guaranteed-profit promise", detail: "A classic investment scam pattern.", source: src });
  }
  if (/(your account (will be|has been) (suspended|locked|closed)|verify within \d+ (hours|minutes)|act now)/.test(lower)) {
    f.push({ tone: "warn", title: "Urgent threat to your account", detail: "Pressure to act fast is a common scam tactic.", source: src });
  }
  if (title && !officialFor(finalReg)) {
    const t = title.toLowerCase();
    const b = BRANDS.find((x) => x.name.length >= 4 && new RegExp(`\\b${x.name}\\b`).test(t));
    if (b && /(log ?in|sign ?in|verify|account|wallet|payment)/.test(t)) {
      f.push({ tone: "bad", title: `Page titled as ${b.name} on a different domain`, detail: `“${title}” is shown on ${finalReg}.`, source: src });
    }
  }
  return f;
}

/** Signals from the redirect path. */
export function redirectSignals(hops: { url: string; status: number }[]): Finding[] {
  const f: Finding[] = [];
  if (hops.length <= 1) return f;
  const domains = [...new Set(hops.map((h) => getDomain(new URL(h.url).hostname) ?? h.url))];
  if (domains.length >= 3) {
    f.push({ tone: "warn", title: `Bounces through ${domains.length} different domains`, detail: domains.join(" → "), source: "Redirect chain" });
  } else if (domains.length === 2) {
    f.push({ tone: "info", title: "Redirects to another domain", detail: domains.join(" → "), source: "Redirect chain" });
  }
  return f;
}


/** A clean verdict needs both a successful page fetch and a reputation-source response. */
export function decideLinkStatus(findings: Finding[], knownThreat: boolean, fetched: boolean, reputationChecked: boolean): CheckerResult["status"] {
  if (knownThreat) return "known_threat";
  const bad = findings.filter((finding) => finding.tone === "bad").length;
  const warn = findings.filter((finding) => finding.tone === "warn").length;
  if (bad >= 2 || (bad >= 1 && warn >= 2)) return "high_risk";
  if (bad >= 1 || warn >= 2) return "suspicious";
  if (!fetched || !reputationChecked) return "inconclusive";
  return "low_risk";
}
