import "server-only";
import { getDomain } from "tldts";
import type { CheckerResult, Finding } from "./types";
import { BlockedUrlError, normalizeUrl, safeFetch, type FetchChain } from "./safe-fetch";
import { decideLinkStatus, officialFor, pageSignals, redirectSignals, urlFacts, urlSignals } from "./url-heuristics";
import { domainAge, phishingListMatch, tlsInfo, webRiskLookup } from "./threat-intel";

export type LinkContext = { url: URL; chain: FetchChain; html: string | null; contentType: string; domainAgeDays: number | null };


/** Checker 1: is this link a scam, phishing page or malware download? */
export async function checkLink(raw: string): Promise<{ result: CheckerResult; context: LinkContext | null }> {
  let url: URL;
  try {
    url = normalizeUrl(raw);
  } catch (e) {
    return {
      context: null,
      result: {
        id: "links",
        status: "inconclusive",
        summary: e instanceof BlockedUrlError ? e.message : "This link can't be checked.",
        findings: [],
        metrics: [],
        sources: [],
        limits: [],
        nextSteps: ["Paste the full link, starting with https://"],
      },
    };
  }

  const findings: Finding[] = urlSignals(url);
  const sources = new Set<string>(["URL analysis"]);
  const limits: string[] = [];
  const metrics: CheckerResult["metrics"] = [];

  const chain = await safeFetch(url);
  sources.add("Safe page fetch");
  const final = chain.final;
  const finalUrl = final ? new URL(final.url) : url;
  if (chain.error && !final) {
    findings.push({ tone: chain.error.includes("private") ? "bad" : "info", title: "Could not open the page", detail: chain.error, source: "Safe page fetch" });
  }
  findings.push(...redirectSignals(chain.hops));
  const contentType = final?.headers["content-type"] ?? "";
  const html = final && /text\/html|xhtml/i.test(contentType) ? final.body.toString("utf8") : null;
  if (final) findings.push(...pageSignals(html ?? "", finalUrl, contentType));
  if (final && final.status >= 400) findings.push({ tone: "info", title: `The site answered ${final.status}`, source: "Safe page fetch" });

  // Reputation: every domain on the path.
  const hosts = [...new Set([url.hostname, ...chain.hops.map((h) => new URL(h.url).hostname)])];
  let knownThreat = false;
  let reputationChecked = false;
  const listHits = await Promise.all(hosts.map((h) => phishingListMatch(h)));
  if (listHits.some((r) => r.checked)) {
    reputationChecked = true;
    sources.add("Phishing.Database (MIT)");
  } else limits.push("The public phishing list could not be loaded for this scan.");
  const hit = listHits.find((r) => r.match);
  if (hit?.match) {
    knownThreat = true;
    findings.unshift({ tone: "bad", title: "On a known phishing list", detail: `${hit.match} is listed as an active phishing domain.`, source: "Phishing.Database" });
  }
  const risk = await webRiskLookup(finalUrl.toString());
  if (risk.status === "match") {
    knownThreat = true;
    sources.add("Google Web Risk");
    findings.unshift({ tone: "bad", title: "Google flags this link", detail: risk.threats.join(", ").toLowerCase().replace(/_/g, " "), source: "Google Web Risk" });
  } else if (risk.status === "clean") {
    reputationChecked = true;
    sources.add("Google Web Risk");
    findings.push({ tone: "good", title: "Not on Google's unsafe list", detail: "Not being listed doesn't prove a site is safe.", source: "Google Web Risk" });
  } else if (risk.note) limits.push(risk.note);

  const facts = urlFacts(finalUrl);
  const reg = facts.registrable ?? getDomain(finalUrl.hostname);
  const [age, tlsRes] = await Promise.all([
    reg && !facts.isIp ? domainAge(reg) : Promise.resolve(null),
    finalUrl.protocol === "https:" && final ? tlsInfo(finalUrl.hostname, final.ip) : Promise.resolve(null),
  ]);
  if (age?.source) sources.add("RDAP (domain registry)");
  if (age?.ageDays != null) {
    metrics.push({ label: "Domain age", value: age.ageDays >= 365 ? `${Math.floor(age.ageDays / 365)} yr` : `${age.ageDays} days` });
    if (age.ageDays < 30) findings.push({ tone: "warn", title: `Domain registered ${age.ageDays} days ago`, detail: "Scam sites are often brand new.", source: "RDAP" });
    else if (age.ageDays > 3 * 365) findings.push({ tone: "good", title: "Domain has existed for years", source: "RDAP" });
  } else if (reg) limits.push("The domain registry did not share a registration date.");
  if (age?.registrar) metrics.push({ label: "Registrar", value: age.registrar });
  if (tlsRes) {
    sources.add("TLS certificate");
    if (tlsRes.ok) {
      findings.push({ tone: "good", title: "Valid HTTPS certificate", detail: tlsRes.issuer ? `Issued by ${tlsRes.issuer}` : undefined, source: "TLS certificate" });
      if (tlsRes.issuer) metrics.push({ label: "Certificate", value: tlsRes.issuer });
    } else {
      findings.push({ tone: "warn", title: "HTTPS certificate is not trusted", detail: tlsRes.error, source: "TLS certificate" });
    }
  }

  metrics.unshift({ label: "Final address", value: finalUrl.toString().slice(0, 120) });
  if (chain.hops.length > 1) metrics.push({ label: "Redirects", value: String(chain.hops.length - 1) });
  if (final) metrics.push({ label: "Server IP", value: final.ip });

  // The address itself belongs to a major platform (YouTube, TikTok…): the
  // domain is genuine even when the platform blocks automated page loads.
  const startReg = getDomain(url.hostname) ?? url.hostname;
  const platform = officialFor(startReg);
  const PLATFORM_NAMES: Record<string, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", x: "X", threads: "Threads", whatsapp: "WhatsApp", telegram: "Telegram" };
  const platformName = platform ? (PLATFORM_NAMES[platform] ?? platform[0].toUpperCase() + platform.slice(1)) : null;
  if (platformName) {
    const i = findings.findIndex((f) => f.title === "Could not open the page");
    if (i >= 0) findings.splice(i, 1, { tone: "info", title: `${platformName} didn't let Jimvio load the page`, detail: "Big platforms often block automated visits. The address itself was checked.", source: "Safe page fetch" });
    findings.unshift({ tone: "good", title: `Official ${platformName} address`, detail: `${startReg} belongs to ${platformName}.`, source: "URL analysis" });
  }

  const status = decideLinkStatus(findings, knownThreat, Boolean(final), reputationChecked);
  const summary =
    platformName && status === "low_risk"
      ? `Genuine ${platformName} link. No known threat found.`
      : status === "known_threat"
      ? "Known threat: this link is on a list of active phishing or malware sites."
      : status === "high_risk"
        ? "Several strong scam or phishing signs."
        : status === "suspicious"
          ? "Some warning signs. Be careful before logging in, paying or downloading."
          : status === "low_risk"
            ? "No known threat found and no strong warning signs."
            : "Jimvio couldn't get enough evidence to judge this link.";
  const nextSteps =
    status === "known_threat" || status === "high_risk"
      ? ["Do not enter passwords, codes or payment details.", "Do not download anything from this link.", "If you already did, change your password and contact your bank or wallet provider."]
      : status === "suspicious"
        ? ["Open the official site yourself instead of using this link.", "Never share one-time codes or wallet phrases."]
        : ["Still check the address bar before typing passwords."];

  return {
    context: { url, chain, html, contentType, domainAgeDays: age?.ageDays ?? null },
    result: { id: "links", status, summary, findings, metrics, sources: [...sources], limits, nextSteps },
  };
}
