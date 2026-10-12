/**
 * Read-only BIMI readiness check.
 * Validates the local SVG Tiny PS asset and, with --live, queries public DNS and HTTPS.
 * Never creates, updates, or deletes DNS records.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resolver } from "node:dns/promises";

const root = resolve(import.meta.dirname, "..");
const svgPath = resolve(root, "public/.well-known/bimi/jimvio-bimi.svg");
const live = process.argv.includes("--live");
const rows = [];

function record(name, status, detail) {
  rows.push({ name, status, detail });
}

function checkSvg(text) {
  const bytes = Buffer.byteLength(text);
  record("svg-size", bytes <= 32768 ? "PASS" : "FAIL", `${bytes} bytes`);
  record("svg-line-endings", text.includes("\r") ? "FAIL" : "PASS", text.includes("\r") ? "CRLF present" : "LF only");
  record(
    "svg-root",
    /<svg\b[^>]*\bversion="1\.2"[^>]*\bbaseProfile="tiny-ps"/.test(text) &&
      /\bwidth="1000"/.test(text) &&
      /\bheight="1000"/.test(text) &&
      /viewBox="0 0 1000 1000"/.test(text)
      ? "PASS"
      : "FAIL",
    "version 1.2, tiny-ps, 1000 square pixels",
  );
  record("svg-root-xy", /<svg\b[^>]*\s(?:x|y)="/.test(text) ? "FAIL" : "PASS", "no x or y on the root svg");
  record("svg-title-desc", /<title>Jimvio<\/title>/.test(text) && /<desc>/.test(text) ? "PASS" : "FAIL", "title and description present");
  record(
    "svg-solid-background",
    /<rect width="1000" height="1000" fill="#FB4C07"\/>/.test(text) ? "PASS" : "FAIL",
    "full-square brand orange background",
  );
  const banned = /<(script|image|foreignObject|animate|set|style|iframe)\b|xlink:href|javascript:|@import|url\(/i;
  record("svg-no-external-or-script", banned.test(text) ? "FAIL" : "PASS", "no script, image, animation, or external reference");
  record("svg-mark-paths", (text.match(/<path /g) ?? []).length >= 7 ? "PASS" : "FAIL", "existing Jimvio mark paths retained");
}

checkSvg(readFileSync(svgPath, "utf8"));

record(
  "logo-public-use-12-months",
  "UNVERIFIED",
  "human evidence required: exact orange square mark publicly used on or before 2025-10-12",
);
record(
  "dmarc-enforcement-age",
  "UNVERIFIED",
  "human or historical DNS evidence required: GlobalSign asks for 30 days at quarantine or reject",
);
record(
  "organization-and-logo-ownership",
  "UNVERIFIED",
  "human evidence required: organization identity and logo-rights documents",
);
record(
  "received-message-alignment",
  "UNVERIFIED",
  "human evidence required: Authentication-Results from a received Jimvio message",
);

if (live) {
  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const txt = async (name) => {
    try {
      const records = await resolver.resolveTxt(name);
      return records.map((parts) => parts.join("")).join(" | ");
    } catch (error) {
      if (error && (error.code === "ENOTFOUND" || error.code === "ENODATA")) return "";
      throw error;
    }
  };
  const dmarc = await txt("_dmarc.jimvio.com");
  const pctExplicit = /(?:^|;)\s*pct=100\s*(?:;|$)/i.test(dmarc);
  const pctAbsent = dmarc.startsWith("v=DMARC1") && !/(?:^|;)\s*pct=/i.test(dmarc);
  record(
    "dmarc-policy",
    /(?:^|;)\s*p=(?:quarantine|reject)\s*(?:;|$)/i.test(dmarc) && (pctExplicit || pctAbsent) ? "PASS" : dmarc ? "FAIL" : "UNVERIFIED",
    dmarc || "no TXT answer",
  );
  record(
    "dmarc-pct",
    pctExplicit ? "PASS" : pctAbsent ? "PASS" : "UNVERIFIED",
    pctExplicit ? "pct=100 is explicit" : pctAbsent ? "pct tag absent; RFC 7489 defaults pct to 100" : "pct not confirmed",
  );
  const bimi = await txt("default._bimi.jimvio.com");
  record("bimi-record-absent", bimi ? "FAIL" : "PASS", bimi || "no BIMI TXT published");
  const dkim = await txt("resend._domainkey.jimvio.com");
  record("dkim-record-exists", dkim.includes("p=") ? "PASS" : "UNVERIFIED", dkim ? "TXT present" : "no TXT answer");
  const spf = await txt("jimvio.com");
  record("spf-record-exists", /v=spf1\b/.test(spf) ? "PASS" : "UNVERIFIED", spf || "no TXT answer");
  try {
    const response = await fetch("https://www.jimvio.com/.well-known/bimi/jimvio-bimi.svg");
    const type = response.headers.get("content-type") ?? "";
    const body = await response.text();
    record(
      "public-svg",
      response.status === 200 && type.includes("image/svg+xml") && body.includes('baseProfile="tiny-ps"') ? "PASS" : "FAIL",
      `HTTP ${response.status}; ${type || "no content-type"}`,
    );
  } catch (error) {
    record("public-svg", "UNVERIFIED", error instanceof Error ? error.message : "request failed");
  }
  record("certificate-url", "UNVERIFIED", "no CMC or VMC PEM is configured; none was requested");
} else {
  record("public-dns-and-https", "UNVERIFIED", "rerun with --live to query public DNS and HTTPS");
}

const failed = rows.some((row) => row.status === "FAIL");
for (const row of rows) console.log(`${row.status}\t${row.name}\t${row.detail}`);
process.exit(failed ? 1 : 0);
