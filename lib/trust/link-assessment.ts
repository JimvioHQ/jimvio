/**
 * The single authoritative verdict for Scam & Malicious Link Detection.
 * Pure (no network): the scanner computes it once and stores it with the
 * report; the page renders it. Hero, risk score, counts and check rows all
 * come from this object, so they cannot contradict each other.
 *
 * Three separate dimensions:
 * - Risk score: credible threat evidence found (0–100).
 * - Coverage: share of the checks that actually completed.
 * - Confidence: how reliable the result is, given which sources answered.
 * Nothing that did not run (NOT_CHECKED, UNAVAILABLE, FAILED, INCONCLUSIVE)
 * ever counts as clean.
 */
import type { AssessmentState, CheckExecution, Finding, LinkAssessment, LinkDetails, SecurityCheck } from "./types";

export const LINK_MODEL = "link-risk-v2 (Nov 2026)";

const DONE: CheckExecution[] = ["CLEAN", "THREAT_DETECTED", "SUSPICIOUS"];

/** Points per check (the strongest finding in a check counts once). */
const POINTS = {
  providerThreat: 90, // a threat-intelligence listing is close to conclusive on its own
  contentThreat: 35, // dangerous page behaviour (credential theft, wallet phrase, fake download)
  suspicious: 14, // phishing-like content, cross-domain redirect bouncing, look-alike names
  weakSuspicious: 7, // supporting signals only: new domain, no HTTPS, risky TLD
} as const;

const text = (f: Finding) => `${f.title} ${f.detail ?? ""}`;
const any = (fs: Finding[], re: RegExp) => fs.filter((f) => re.test(text(f)));
const worst = (fs: Finding[]) => (fs.some((f) => f.tone === "bad") ? "bad" : fs.some((f) => f.tone === "warn") ? "warn" : null);

export function riskClass(score: number): LinkAssessment["riskClass"] {
  return score >= 80 ? "Critical Risk" : score >= 60 ? "High Risk" : score >= 40 ? "Moderate Risk" : score >= 20 ? "Low Observed Risk" : "Very Low Observed Risk";
}

/** Login walls, errors and blocks: the page that was fetched is not the content a visitor would judge. */
export function contentBlock(d: Pick<LinkDetails, "pageFetched" | "httpStatus" | "finalUrl" | "contentType">, html: string | null): string | null {
  if (!d.pageFetched) return "The destination could not be reached.";
  const status = d.httpStatus ?? 0;
  if (status === 401 || status === 403 || status === 999 || status === 429) return `The site refused automated access (HTTP ${status}).`;
  if (status >= 400) return `The site answered HTTP ${status}.`;
  try {
    const path = d.finalUrl ? new URL(d.finalUrl).pathname.toLowerCase() : "";
    if (/(^|\/)(login|log-in|signin|sign-in|authwall|uas\/login|checkpoint|accounts\/login|auth)(\/|$|\?)/.test(path)) return "The link opens a sign-in page, so the content behind it could not be inspected.";
  } catch {
    /* ignore */
  }
  if (d.contentType && !/html|xml|text\/plain/i.test(d.contentType)) return null; // files are judged by download checks
  if (html != null && html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length < 200) return "The page returned almost no readable content (it may load everything with scripts).";
  return null;
}

type Input = { findings: Finding[]; details: LinkDetails; /** true when the scan itself crashed. */ failed?: boolean };

export function assessLink({ findings: f, details: d, failed = false }: Input): LinkAssessment {
  const fetched = d.pageFetched;
  // Page-content findings prove the page was read, whatever the length heuristic said.
  const inspected = (d.contentInspected ?? (fetched && !d.contentBlockedReason)) || (fetched && f.some((x) => /page content/i.test(x.source) && x.tone !== "good"));
  const wr = d.webRisk.status;
  const pl = d.phishingList.status;
  const providerHits: string[] = [];
  if (wr === "match") providerHits.push(`Google Web Risk lists it (${d.webRisk.threats.join(", ").toLowerCase().replace(/_/g, " ")})`);
  if (pl === "match") providerHits.push(`Phishing.Database lists ${d.phishingList.match}`);

  const urlF = f.filter((x) => x.source === "URL analysis" && x.tone !== "good" && x.tone !== "info");
  const brandF = any(f, /uses the name|looks like “|page titled as/i);
  const redirectF = f.filter((x) => x.source === "Redirect chain");
  const pageF = f.filter((x) => /page content/i.test(x.source));
  const downloadF = any(f, /downloads a program|direct download of a program/i);
  const phishContentF = any(pageF, /password form sends|recovery phrase/i);
  const malwareListed = d.webRisk.threats.some((t) => /MALWARE|UNWANTED/i.test(t));
  const seListed = d.webRisk.threats.some((t) => /SOCIAL_ENGINEERING/i.test(t));

  const c = (id: string, name: string, critical: boolean, source: string, status: CheckExecution, explanation: string, evidence: string[] = [], severity: SecurityCheck["severity"] = "none"): SecurityCheck => ({
    id, name, critical, source, status, explanation, evidence, severity: status === "THREAT_DETECTED" ? (severity === "none" ? "high" : severity) : status === "SUSPICIOUS" ? (severity === "none" ? "medium" : severity) : "none",
  });
  const ev = (fs: Finding[]) => fs.map((x) => (x.detail ? `${x.title} — ${x.detail}` : x.title));

  const checks: SecurityCheck[] = [
    c("url", "URL Validation", false, "URL analysis",
      urlF.some((x) => x.tone === "bad") ? "THREAT_DETECTED" : urlF.length ? "SUSPICIOUS" : "CLEAN",
      urlF.length ? "The address itself has deceptive or risky features." : "The address has no deceptive structure (encoding tricks, raw IP, embedded credentials).", ev(urlF), urlF.length ? "low" : "none"),
    c("redirects", "Redirect Chain Analysis", false, "Safe page fetch",
      !fetched ? (d.redirects.length ? "INCONCLUSIVE" : "FAILED") : redirectF.some((x) => x.tone === "warn") ? "SUSPICIOUS" : "CLEAN",
      !fetched ? "The redirect chain could not be followed to the end." : d.redirects.length ? `${d.redirects.length} redirect${d.redirects.length > 1 ? "s" : ""} followed to the final page.` : "No redirects.",
      [...d.redirects.map((h) => `${h.status} → ${h.url}`), ...ev(redirectF)]),
    c("malware", "Malicious Code / Malware Detection", true, "Google Web Risk",
      malwareListed ? "THREAT_DETECTED" : wr === "clean" ? "CLEAN" : "UNAVAILABLE",
      malwareListed ? "Listed for malware or unwanted software." : wr === "clean" ? "Not on Google's malware or unwanted-software lists." : (d.webRisk.note ?? "Google Web Risk did not answer."), [], "critical"),
    c("phishing", "Phishing Detection", true, "Phishing.Database · Google Web Risk · page content",
      pl === "match" || seListed || phishContentF.length ? "THREAT_DETECTED"
        : (pl === "clean" || wr === "clean") && inspected ? "CLEAN"
          : pl === "unavailable" && wr === "unavailable" && !inspected ? "UNAVAILABLE" : "INCONCLUSIVE",
      pl === "match" || seListed ? "Listed as an active phishing destination." : phishContentF.length ? "The page asks for credentials in a dangerous way." : (pl === "clean" || wr === "clean") && inspected ? "Not on the phishing lists that answered, and the page shows no credential theft." : "Not every phishing source could be checked.",
      [...providerHits, ...ev(phishContentF)], "critical"),
    c("reputation", "Domain Reputation", false, "URL analysis · RDAP",
      urlF.some((x) => /abused|bait/i.test(text(x))) ? "SUSPICIOUS" : "CLEAN",
      d.officialPlatform ? `${d.officialPlatform}'s own domain.` : "Checked the domain name for abused endings and bait words.", ev(urlF.filter((x) => /abused|bait/i.test(text(x)))), "low"),
    c("brand", "Brand Impersonation", false, "URL analysis · page content",
      brandF.some((x) => x.tone === "bad") ? "THREAT_DETECTED" : brandF.length ? "SUSPICIOUS" : inspected ? "CLEAN" : "INCONCLUSIVE",
      brandF.length ? "Uses a well-known brand on a domain that isn't theirs." : inspected ? "No look-alike brand name in the address or page title." : "The address was checked, but the page could not be read for brand misuse.", ev(brandF), "high"),
    c("blocklist", "Blacklist / Threat Intelligence", true, "Google Web Risk · Phishing.Database",
      providerHits.length ? "THREAT_DETECTED" : wr === "clean" && pl === "clean" ? "CLEAN" : wr === "clean" || pl === "clean" ? "INCONCLUSIVE" : "UNAVAILABLE",
      providerHits.length ? "Listed by a threat-intelligence source." : `${[wr, pl].filter((s) => s === "clean").length} of 2 threat-intelligence sources answered.`,
      [...providerHits, ...(wr === "unavailable" && d.webRisk.note ? [d.webRisk.note] : []), ...(pl === "unavailable" ? ["The phishing list could not be loaded."] : [])], "critical"),
    c("tls", "SSL / HTTPS", false, "TLS certificate",
      d.tls.status === "valid" ? "CLEAN" : d.tls.status === "invalid" || d.tls.status === "not_https" ? "SUSPICIOUS" : fetched ? "NOT_CHECKED" : "FAILED",
      d.tls.status === "valid" ? `Valid certificate${d.tls.issuer ? ` from ${d.tls.issuer}` : ""}${d.tls.daysLeft != null ? `, ${d.tls.daysLeft} days left` : ""}. A valid certificate doesn't make a site trustworthy.` : d.tls.status === "invalid" ? "The certificate is not trusted." : d.tls.status === "not_https" ? "The page is not encrypted." : "The certificate could not be read.", [], "low"),
    c("registration", "Domain Registration Information", false, "RDAP",
      d.ageDays == null ? "UNAVAILABLE" : d.ageDays < 30 ? "SUSPICIOUS" : "CLEAN",
      d.ageDays == null ? "The registry did not share registration data." : d.ageDays < 30 ? `Registered only ${d.ageDays} days ago. New domains are common for scams, but this alone proves nothing.` : `Registered ${Math.floor(d.ageDays / 365) || "<1"} year(s) ago. Age is supporting evidence, not proof of safety.`,
      [d.registrar ? `Registrar: ${d.registrar}` : "", ...(d.nameservers ?? []).map((n) => `Nameserver: ${n}`)].filter(Boolean), "low"),
    c("dns", "DNS & Network Intelligence", false, "DNS · RDAP (IP)",
      d.ip ? "CLEAN" : fetched ? "NOT_CHECKED" : "FAILED",
      d.ip ? `Resolves to ${d.ip}${d.network?.org || d.network?.network ? `, operated by ${d.network.org ?? d.network.network}` : ""}${d.network?.country ? ` (${d.network.country})` : ""}.` : "The address could not be resolved to a public server.",
      [d.network?.range ? `Network range: ${d.network.range}` : ""].filter(Boolean)),
    c("content", "Website Content Analysis", true, "Safe page fetch · page heuristics",
      !fetched ? "UNAVAILABLE" : !inspected ? "INCONCLUSIVE" : worst(pageF) === "bad" ? "THREAT_DETECTED" : worst(pageF) === "warn" ? "SUSPICIOUS" : "CLEAN",
      !fetched ? (d.fetchError ?? "The page could not be fetched.") : !inspected ? (d.contentBlockedReason ?? "The page could not be fully inspected.") : pageF.length ? "The page shows scam or pressure patterns." : "Read the page safely (no scripts run) and found no scam patterns.",
      ev(pageF), "high"),
    c("downloads", "Dangerous Downloads", false, "HTTP headers · URL analysis",
      downloadF.length ? "THREAT_DETECTED" : fetched ? "CLEAN" : "NOT_CHECKED",
      downloadF.length ? "The link downloads a program or app." : fetched ? "The link does not start a program download." : "Could not check what the link downloads.", ev(downloadF), "critical"),
  ];

  // Risk: strongest finding per check, counted once.
  let score = 0;
  for (const k of checks) {
    if (k.status === "THREAT_DETECTED") score += ["blocklist", "malware"].includes(k.id) || (k.id === "phishing" && (pl === "match" || seListed)) ? 0 : POINTS.contentThreat;
    else if (k.status === "SUSPICIOUS") score += ["tls", "registration", "reputation", "url"].includes(k.id) ? POINTS.weakSuspicious : POINTS.suspicious;
  }
  if (providerHits.length) score = Math.max(score, POINTS.providerThreat);
  score = Math.min(100, Math.round(score));

  const done = checks.filter((k) => DONE.includes(k.status)).length;
  const coverage = Math.round((done / checks.length) * 100);
  const criticalMissing = checks.filter((k) => k.critical && !DONE.includes(k.status));
  const reputationBoth = wr !== "unavailable" && pl !== "unavailable";
  const confidence: LinkAssessment["confidence"] =
    coverage >= 85 && reputationBoth && inspected ? "HIGH" : coverage >= 60 && (wr !== "unavailable" || pl !== "unavailable") ? "MEDIUM" : "LOW";

  const threats = checks.filter((k) => k.status === "THREAT_DETECTED");
  const susp = checks.filter((k) => k.status === "SUSPICIOUS");
  const strongSusp = susp.filter((k) => !["tls", "registration", "reputation", "url"].includes(k.id));
  // Checks that need the network; URL and name checks always run locally.
  const networkDone = checks.filter((k) => !["url", "reputation"].includes(k.id) && DONE.includes(k.status)).length;
  // Missing critical checks other than page content: a broader gap than an unreachable site.
  // (Phishing that is only missing the page read counts as a content gap.)
  const providerGap = criticalMissing.filter((k) => k.id !== "content" && !(k.id === "phishing" && (pl === "clean" || wr === "clean")));
  const state: AssessmentState =
    threats.length ? "THREAT_DETECTED"
      : strongSusp.length || susp.length >= 2 ? "SUSPICIOUS_ACTIVITY"
        : failed || networkDone === 0 ? "SCAN_FAILED"
          : providerGap.length ? "INCOMPLETE_ASSESSMENT"
            : !inspected ? "WEBSITE_UNREACHABLE"
              : criticalMissing.length ? "INCOMPLETE_ASSESSMENT"
                : "NO_KNOWN_THREATS";

  const found: string[] = [
    ...threats.map((k) => `${k.name}: ${k.explanation}`),
    ...susp.map((k) => `${k.name}: ${k.explanation}`),
  ];
  if (!found.length) {
    found.push(...checks.filter((k) => k.status === "CLEAN").slice(0, 4).map((k) => `${k.name}: ${k.explanation.split(". ")[0]}.`));
  }
  const couldNotVerify = checks.filter((k) => !DONE.includes(k.status)).map((k) => `${k.name}: ${k.explanation}`);
  const actions =
    state === "THREAT_DETECTED"
      ? ["Do not enter passwords, codes or payment details on this link.", "Do not download or open anything from it.", ...(providerHits.length ? ["If you already entered details, change that password now and contact your bank or wallet provider."] : [])]
      : state === "SUSPICIOUS_ACTIVITY"
        ? ["Open the official website yourself instead of using this link.", "Never share one-time codes, card details or wallet phrases through it."]
        : state === "WEBSITE_UNREACHABLE"
          ? ["Sign in only through the service's official app or a bookmarked address.", "If someone sent you this link unexpectedly, confirm with them another way."]
          : state === "INCOMPLETE_ASSESSMENT"
            ? ["Treat the link with care until the missing checks can run — try again later.", "Check the address bar before typing passwords or payment details."]
            : state === "SCAN_FAILED"
              ? ["Try the check again in a few minutes."]
              : ["Still check the address bar before typing passwords or payment details."];

  return {
    model: LINK_MODEL,
    state,
    riskScore: score,
    riskClass: riskClass(score),
    coverage,
    confidence,
    checks,
    counts: {
      completed: done,
      threats: threats.length,
      suspicious: susp.length,
      unavailable: checks.filter((k) => k.status === "UNAVAILABLE" || k.status === "FAILED").length,
      notExecuted: checks.filter((k) => k.status === "NOT_CHECKED" || k.status === "INCONCLUSIVE").length,
    },
    found: found.slice(0, 5),
    couldNotVerify: couldNotVerify.slice(0, 6),
    actions,
    topFinding: threats[0]?.explanation ?? susp[0]?.explanation ?? null,
  };
}
