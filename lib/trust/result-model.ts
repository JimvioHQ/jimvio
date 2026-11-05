/**
 * Turns a scan report into what each result page shows. Pure: no React,
 * no network. Every label here comes from evidence in the report; when the
 * evidence is missing the label says so ("Not Available", "Unable to
 * Verify") and the item never counts as passed or failed.
 */
import type {
  CheckerResult, EngagementDetails, Finding, LinkDetails, MediaDetails, ProductDetails, ScanCategory, ScanReport,
} from "./types";

export type Tone = "good" | "warn" | "bad" | "neutral" | "info" | "ai";
export type Pill = { label: string; tone: Tone };

/** One row in "Detailed Scan Results" / "Verification Checks". */
export type CheckRow = {
  key: string;
  title: string;
  description: string;
  pill: Pill;
  evidence: Finding[];
  /** 1 = passed, 0.5 = needs review, 0 = failed, null = did not run (excluded from the score). */
  points: 0 | 0.5 | 1 | null;
  note?: string;
};

export type InfoRow = { key: string; label: string; value: string | null; pill?: Pill; href?: string; copy?: string };
export type Tile = { key: string; value: string | null; label: string; tone?: Tone; badge?: Pill; hint?: string };
export type Banner = { tone: "good" | "warn" | "bad" | "neutral" | "danger"; title: string; text: string; result: Pill };
export type Score = { value: number | null; badge: Pill; text: string; basis: string };

// ── formatting ────────────────────────────────────────────────────────────

export const NA = "Not Available";

export function fmtCount(n: number | null | undefined): string | null {
  return n == null || !Number.isFinite(n) ? null : Math.round(n).toLocaleString("en-US");
}

export function fmtBytes(n: number | null | undefined, withExact = false): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  const s = n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`;
  return withExact && n >= 1024 ? `${s} (${n.toLocaleString("en-US")} bytes)` : s;
}

export function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : null;
}

/** `zoned` = the instant is a real UTC time; EXIF/QuickTime local times carry no zone, so no label. */
export function fmtDateTime(iso: string | null | undefined, zoned = true): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t)
    ? new Date(t).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + (zoned ? " UTC" : "")
    : null;
}

export function fmtDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export function fmtAge(days: number | null, registeredAt: string | null): string | null {
  if (days == null) return null;
  const span = days >= 730 ? `${Math.floor(days / 365)} years` : days >= 365 ? "1 year" : days >= 60 ? `${Math.floor(days / 30)} months` : `${days} days`;
  const created = fmtDate(registeredAt);
  return created ? `${span} (Created: ${created})` : span;
}

export function resolutionLabel(w: number | null, h: number | null, video = false): string | null {
  if (!w || !h) return null;
  const base = `${w} × ${h}`;
  if (video) {
    const p = Math.min(w, h);
    const name = p >= 2160 ? "4K UHD" : p >= 1440 ? "QHD" : p >= 1080 ? "Full HD" : p >= 720 ? "HD" : "SD";
    return `${base} (${name})`;
  }
  return `${base} (${((w * h) / 1e6).toFixed(1)} MP)`;
}

function aspect(w: number | null, h: number | null): string | null {
  if (!w || !h) return null;
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const d = g(w, h);
  const [a, b] = [w / d, h / d];
  return a <= 64 && b <= 64 ? `${a}:${b}` : (w / h).toFixed(2) + ":1";
}

export function shortFormat(format: string | null | undefined, mime?: string | null): string {
  const f = `${format ?? ""} ${mime ?? ""}`;
  const m = /\b(JPEG|PNG|GIF|WebP|HEIC|AVIF|MP4|MOV|WebM|MKV|AVI|MP3|WAV|M4A|OGG|FLAC|PDF|EPUB|ZIP)\b/i.exec(f);
  if (!m) return (format ?? "File").split(" ")[0];
  const v = m[1].toUpperCase();
  return v === "JPEG" ? "JPG" : v === "WEBP" ? "WEBP" : v;
}

// ── scoring ───────────────────────────────────────────────────────────────

/**
 * Evidence score: the average of the checks that actually completed
 * (passed = full points, needs review = half, failed = none). Checks that
 * could not run are left out. With fewer than `min` completed checks no
 * number is given, because it would not mean much.
 */
export function evidenceScore(rows: CheckRow[], min = 3): number | null {
  const counted = rows.filter((r) => r.points != null);
  if (counted.length < min) return null;
  return Math.round((counted.reduce((a, r) => a + (r.points ?? 0), 0) / counted.length) * 100);
}

/** Keeps a score consistent with its verdict: any failed check caps it at 49, any check needing review at 79. */
export function bandedScore(rows: CheckRow[], score: number | null): number | null {
  if (score == null) return null;
  if (rows.some((r) => r.points === 0)) return Math.min(score, 49);
  if (rows.some((r) => r.points === 0.5)) return Math.min(score, 79);
  return score;
}

export const SCORE_BASIS =
  "Average of the checks that completed for this item: passed = full points, needs review = half, failed = none. Checks Jimvio couldn't run are left out, and no score is given when fewer than three checks completed. Any failed check caps the score at 49 and any check needing review caps it at 79.";

const pill = (label: string, tone: Tone): Pill => ({ label, tone });
const hits = (fs: Finding[], re: RegExp) => fs.filter((f) => re.test(`${f.title} ${f.detail ?? ""}`));
const worst = (fs: Finding[]) => (fs.some((f) => f.tone === "bad") ? "bad" : fs.some((f) => f.tone === "warn") ? "warn" : fs.length ? "info" : null);

// ── category resolution ───────────────────────────────────────────────────

/** The one experience to show, also for reports saved before categories existed. */
export function reportCategory(report: ScanReport): ScanCategory {
  if (report.category) return report.category;
  const ran = report.checkers.filter((c) => c.status !== "not_applicable");
  if (report.input.file) {
    const media = ran.find((c) => c.id === "media");
    if (media) return "media";
    return "product";
  }
  if (report.input.url && /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|threads\.net|threads\.com)(\/|$|:)/i.test(safeHost(report.input.url))) return "engagement";
  return "links";
}

function safeHost(u: string): string {
  try {
    return `${new URL(u).hostname}/`;
  } catch {
    return "";
  }
}

export function primaryChecker(report: ScanReport): CheckerResult | null {
  const cat = reportCategory(report);
  if (cat === "unsupported") return null;
  return report.checkers.find((c) => c.id === cat) ?? null;
}

// ── 1. Scam & malicious link ──────────────────────────────────────────────

export type LinkModel = {
  banner: Banner;
  risk: Score;
  tiles: Tile[];
  checks: CheckRow[];
  info: InfoRow[];
  redirects: { url: string; status: number }[];
  limits: string[];
};

export function linkModel(c: CheckerResult, d: LinkDetails | null, submittedUrl: string, checkedAt: string): LinkModel {
  const f = c.findings;
  const fetched = d?.pageFetched ?? !f.some((x) => x.title === "Could not open the page");
  const listed = d ? d.webRisk.status === "match" || d.phishingList.status === "match" : f.some((x) => x.tone === "bad" && /Web Risk|Phishing/i.test(x.source));
  const dbChecked = d ? [d.webRisk.status, d.phishingList.status].filter((s) => s !== "unavailable").length : 0;
  const dbTotal = 2;

  const downloads = hits(f, /downloads a program|direct download of a program/i);
  const malware = d?.webRisk.threats.some((t) => /MALWARE|UNWANTED/i.test(t)) ?? false;
  const redirectF = f.filter((x) => x.source === "Redirect chain");
  const phishF = [
    ...f.filter((x) => /phishing/i.test(x.source) && x.tone === "bad"),
    ...hits(f, /password form sends|recovery phrase|page titled as|uses the name|looks like “/i),
    ...f.filter((x) => x.source === "Google Web Risk" && /social engineering/i.test(x.detail ?? "")),
  ];
  const urlF = f.filter((x) => x.source === "URL analysis" && x.tone !== "good");
  const pageF = f.filter((x) => /page content|http headers/i.test(x.source));
  const ageDays = d?.ageDays ?? null;

  const checks: CheckRow[] = [
    {
      key: "code",
      title: "Malicious Code Scan",
      description: "Checks for program downloads and known malware listings.",
      evidence: [...downloads, ...f.filter((x) => x.source === "Google Web Risk" && /malware|unwanted/i.test(x.detail ?? ""))],
      ...(downloads.length || malware
        ? { pill: pill("Detected", "bad"), points: 0 as const }
        : fetched || d?.webRisk.status === "clean"
          ? { pill: pill("No Threats", "good"), points: 1 as const }
          : { pill: pill("Not Checked", "neutral"), points: null }),
    },
    {
      key: "redirects",
      title: "Suspicious Redirects",
      description: "Checks for hidden or unexpected redirections.",
      evidence: redirectF,
      ...(redirectF.some((x) => x.tone === "warn")
        ? { pill: pill("Detected", "warn"), points: 0.5 as const }
        : redirectF.length
          ? { pill: pill("Cross-domain", "info"), points: 1 as const }
          : fetched
            ? { pill: pill("None", "good"), points: 1 as const }
            : { pill: pill("Not Checked", "neutral"), points: null }),
    },
    {
      key: "phishing",
      title: "Phishing Detection",
      description: "Identifies attempts to steal personal or financial information.",
      evidence: phishF,
      ...(phishF.length
        ? { pill: pill("Detected", "bad"), points: 0 as const }
        : fetched || dbChecked
          ? { pill: pill("Not Detected", "good"), points: 1 as const }
          : { pill: pill("Unable to Verify", "neutral"), points: null }),
    },
    {
      key: "reputation",
      title: "Domain Reputation",
      description: "Checks the address for look-alike names, risky endings and bait words.",
      evidence: [...urlF, ...f.filter((x) => x.source === "URL analysis" && x.tone === "good")],
      ...(urlF.some((x) => x.tone === "bad")
        ? { pill: pill("Dangerous", "bad"), points: 0 as const }
        : urlF.some((x) => x.tone === "warn")
          ? { pill: pill("Suspicious", "warn"), points: 0.5 as const }
          : d?.officialPlatform
            ? { pill: pill(`Official ${d.officialPlatform}`, "good"), points: 1 as const }
            : { pill: pill("Normal", "good"), points: 1 as const }),
    },
    {
      key: "blocklist",
      title: "Blacklist Status",
      description: "Checks the domain against Google Web Risk and the public phishing database.",
      evidence: f.filter((x) => /Web Risk|Phishing/i.test(x.source)),
      ...(listed
        ? { pill: pill("Blocklisted", "bad"), points: 0 as const }
        : dbChecked
          ? { pill: pill("Not Blocklisted", "good"), points: 1 as const }
          : { pill: pill("Not Checked", "neutral"), points: null }),
      note: dbChecked ? `${dbChecked} of ${dbTotal} security databases answered.` : "No security database could be reached for this scan.",
    },
    {
      key: "tls",
      title: "SSL / HTTPS Certificate",
      description: "Checks the security and validity of the website's SSL certificate.",
      evidence: hits(f, /certificate|not encrypted/i),
      ...(d?.tls.status === "valid"
        ? { pill: pill("Valid (HTTPS)", "good"), points: 1 as const }
        : d?.tls.status === "invalid"
          ? { pill: pill("Invalid", "bad"), points: 0 as const }
          : d?.tls.status === "not_https"
            ? { pill: pill("Not Encrypted", "warn"), points: 0.5 as const }
            : { pill: pill("Not Checked", "neutral"), points: null }),
    },
    {
      key: "whois",
      title: "Domain Information (WHOIS)",
      description: "Analyzes domain age, registrar and registration data (RDAP).",
      evidence: f.filter((x) => x.source === "RDAP"),
      ...(ageDays == null
        ? { pill: pill("Not Available", "neutral"), points: null }
        : ageDays < 30
          ? { pill: pill("New Domain", "warn"), points: 0.5 as const }
          : { pill: pill("Normal", "good"), points: 1 as const }),
    },
    {
      key: "content",
      title: "Website Content Analysis",
      description: "Scans page content for scam signals, fake offers, or risky behavior.",
      evidence: pageF,
      ...(!fetched || (d && !d.contentType?.includes("html") && !pageF.length)
        ? { pill: pill("Not Checked", "neutral"), points: null }
        : worst(pageF) === "bad"
          ? { pill: pill("Dangerous", "bad"), points: 0 as const }
          : worst(pageF) === "warn"
            ? { pill: pill("Suspicious", "warn"), points: 0.5 as const }
            : worst(pageF) === "info"
              ? { pill: pill("Review", "info"), points: 1 as const }
              : { pill: pill("No Issues", "good"), points: 1 as const }),
    },
  ];

  const issues = f.filter((x) => x.tone === "bad" || x.tone === "warn").length;
  const score = evidenceScore(checks);
  // 100 − evidence score, kept inside the band of the overall verdict so the number never contradicts it.
  const band: [number, number] =
    c.status === "known_threat" ? [95, 100] : c.status === "high_risk" ? [70, 94] : c.status === "suspicious" || c.status === "evidence_found" ? [35, 69] : c.status === "low_risk" ? [0, 34] : [0, 100];
  const riskValue = c.status === "known_threat" ? Math.max(95, score == null ? 95 : 100 - score) : score == null ? null : Math.min(band[1], Math.max(band[0], 100 - score));
  const st = c.status;
  const banner: Banner =
    st === "known_threat"
      ? { tone: "danger", title: "Known Threat Detected", text: "This link is listed as an active phishing or malware site. Do not open it, log in, pay or download anything.", result: pill("Known Threat", "bad") }
      : st === "high_risk"
        ? { tone: "bad", title: "Malicious Activity Detected", text: "This link shows strong signs of scam or malicious activity. Review the details below before proceeding.", result: pill("High Risk", "bad") }
        : st === "suspicious" || st === "evidence_found"
          ? { tone: "warn", title: "Suspicious Activity Detected", text: "This link shows suspicious or potentially malicious activity. Review the details below before proceeding.", result: pill("Suspicious", "warn") }
          : st === "low_risk"
            ? { tone: "good", title: "No Threats Detected", text: "No known threats or strong warning signs were found. Still check the address before entering passwords or payment details.", result: pill("Low Risk", "good") }
            : { tone: "neutral", title: "Link Could Not Be Fully Verified", text: c.summary || "Jimvio couldn't gather enough evidence to judge this link.", result: pill("Inconclusive", "neutral") };

  const riskBadge: Pill =
    riskValue == null ? pill("Not Scored", "neutral") : riskValue >= 70 ? pill("High Risk", "bad") : riskValue >= 35 ? pill("Detected", "warn") : pill("Low Risk", "good");
  const riskText =
    riskValue == null
      ? "Not enough checks completed to give a reliable score."
      : riskValue >= 70
        ? "Strong warning signs found. Avoid this link."
        : riskValue >= 35
          ? "Suspicious activity found. Proceed with caution."
          : "No strong warning signs found.";

  const threatType = listed && d?.phishingList.status === "match"
    ? "Phishing"
    : malware || downloads.length
      ? "Malware"
      : d?.webRisk.threats.length
        ? d.webRisk.threats.map((t) => t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase())).join(", ")
        : phishF.length
          ? "Phishing"
          : hits(f, /recovery phrase|money-doubling|guaranteed-profit/i).length
            ? "Scam"
            : issues
              ? "Suspicious"
              : st === "low_risk"
                ? "None Found"
                : "Unknown";

  const redirects = d?.redirects ?? [];
  const tiles: Tile[] = [
    { key: "result", value: st === "low_risk" ? "Clean" : st === "inconclusive" || st === "unavailable" ? "Inconclusive" : "Detected", label: "Scan Result", tone: st === "low_risk" ? "good" : st === "inconclusive" || st === "unavailable" ? "neutral" : "bad" },
    { key: "threat", value: threatType, label: "Threat Type" },
    { key: "category", value: st === "known_threat" || st === "high_risk" ? "Malicious" : st === "suspicious" || st === "evidence_found" ? "Suspicious" : st === "low_risk" ? "Low Risk" : "Unverified", label: "Category" },
    { key: "redirects", value: d ? String(redirects.length) : null, label: redirectF.some((x) => x.tone === "warn") ? "Suspicious Redirects" : "Redirects" },
    { key: "issues", value: String(issues), label: "Total Issues" },
    { key: "db", value: listed ? "Blocklisted" : dbChecked ? "Not Blocklisted" : "Not Checked", label: "In Security Databases", tone: listed ? "bad" : dbChecked ? "good" : "neutral" },
  ];

  const finalUrl = d?.finalUrl ?? submittedUrl;
  const info: InfoRow[] = [
    { key: "url", label: "URL", value: finalUrl, href: /^https?:\/\//.test(finalUrl) ? finalUrl : undefined, copy: finalUrl },
    { key: "domain", label: "Domain", value: d?.domain ?? safeHost(submittedUrl).replace(/\/$/, "") ?? null, copy: d?.domain ?? undefined },
    { key: "age", label: "Domain Age", value: fmtAge(d?.ageDays ?? null, d?.registeredAt ?? null) },
    { key: "registrar", label: "Registrar", value: d?.registrar ?? null },
    { key: "host", label: "Hosting Provider", value: null },
    { key: "location", label: "Hosting Location", value: null },
    { key: "ip", label: "IP Address", value: d?.ip ?? null, copy: d?.ip ?? undefined },
    {
      key: "tls",
      label: "SSL Certificate",
      value: d?.tls.issuer ?? null,
      pill: checks.find((r) => r.key === "tls")!.pill,
    },
    { key: "redirects", label: "Redirects", value: null, pill: d ? (redirects.length ? pill(`${redirects.length} detected`, redirectF.some((x) => x.tone === "warn") ? "warn" : "info") : pill("None", "good")) : pill(NA, "neutral") },
    { key: "type", label: "Content Type", value: d?.contentType ? `${d.contentType.includes("html") ? "HTML" : d.contentType.split("/")[1]?.toUpperCase() ?? "File"} (${d.contentType})` : null },
    { key: "db", label: "Security Databases", value: null, pill: listed ? pill(`Blocklisted (${[d?.webRisk.status, d?.phishingList.status].filter((s) => s === "match").length}/${dbTotal})`, "bad") : dbChecked ? pill(`Not Blocklisted (0/${dbChecked})`, "good") : pill("Not Checked", "neutral") },
    { key: "checked", label: "Last Checked", value: fmtDateTime(checkedAt) },
  ];

  return {
    banner,
    risk: { value: riskValue, badge: riskBadge, text: riskText, basis: `Risk score = 100 − evidence score. ${SCORE_BASIS}${c.status === "known_threat" ? " A confirmed listing sets the score to at least 95." : ""}` },
    tiles,
    checks,
    info,
    redirects,
    limits: c.limits,
  };
}

// ── 2. Engagement & traffic ───────────────────────────────────────────────

export const PLATFORM_LABEL: Record<EngagementDetails["platform"], string> = {
  youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", x: "X", threads: "Threads",
};

export type EngagementModel = {
  platform: EngagementDetails["platform"];
  platformName: string;
  itemLabel: string;
  heading: string;
  verified: boolean;
  subline: string | null;
  caption: string | null;
  thumbnail: string | null;
  duration: string | null;
  posted: string | null;
  postedLabel: string;
  url: string;
  quality: { level: "high" | "moderate" | "low" | "early" | "unknown"; label: string; text: string };
  tiles: Tile[];
  audience: CheckRow[];
  accountTitle: string;
  account: InfoRow[];
  accessNote: string | null;
  limits: string[];
};

export function engagementModel(c: CheckerResult, d: EngagementDetails): EngagementModel {
  const name = PLATFORM_LABEL[d.platform];
  const isYt = d.platform === "youtube";
  const kindLabel = d.contentType === "short" ? "Short" : d.contentType === "reel" ? "Reel" : d.contentType === "channel" ? (isYt ? "Channel" : "Account") : isYt || d.platform === "tiktok" ? (d.platform === "tiktok" ? "Post" : "Video") : "Post";
  const warns = c.findings.filter((x) => x.tone === "warn" || x.tone === "bad");
  const verdict = d.verdict;
  const quality: EngagementModel["quality"] =
    verdict === "real"
      ? { level: "high", label: "High", text: "Engagement looks natural for this many views." }
      : verdict === "review"
        ? { level: "moderate", label: "Moderate", text: "Some engagement patterns look unusual and may not be fully organic." }
        : verdict === "suspicious"
          ? { level: "low", label: "Low", text: "Several numbers don't fit natural viewing. These are signals, not proof of fake views." }
          : verdict === "too_early"
            ? { level: "early", label: "Too Early", text: "There are too few views yet to judge the engagement." }
            : { level: "unknown", label: "Unavailable", text: d.accessNote ?? c.summary };

  const viewsWord = d.platform === "instagram" && d.contentType === "post" ? "Views" : "Views";
  const postsLabel = isYt ? "Videos" : d.contentType === "reel" ? "Reels" : "Posts";
  const notPublic = `${name} doesn't publish this number.`;
  const tiles: Tile[] = [
    { key: "views", value: fmtCount(d.views), label: `Total ${viewsWord}` },
    { key: "real", value: null, label: "Real Views", hint: `No public source reports bot-filtered views for ${name}. Jimvio won't estimate them.` },
    { key: "bot", value: null, label: "Bot Views", hint: `${isYt ? "YouTube removes views it detects as invalid but doesn't say how many." : notPublic} Jimvio won't estimate them.` },
    { key: "likes", value: fmtCount(d.likes), label: "Likes", hint: d.likes == null ? notPublic : undefined },
    { key: "comments", value: fmtCount(d.comments), label: "Comments", hint: d.comments == null ? notPublic : undefined },
    { key: "rate", value: d.engagementRate == null ? null : `${(d.engagementRate * 100).toFixed(2)}%`, label: "Engagement Rate", hint: "(Likes + comments) ÷ views, from the public counts." },
    { key: "posts", value: fmtCount(d.account.posts), label: postsLabel },
    { key: "reach", value: fmtCount(d.account.totalViews), label: isYt ? "Channel Total Views" : d.platform === "instagram" ? "Account Total Reach" : "Account Total Views" },
  ];

  const commentFinding = c.findings.find((x) => /comments/i.test(x.title));
  const audience: CheckRow[] = [
    {
      key: "real",
      title: "Likely Real Engagement",
      description: verdict === "real" ? "Activity appears mostly natural." : verdict === "review" ? "Some activity may not be organic." : verdict === "suspicious" ? "Several patterns look inorganic." : verdict === "too_early" ? "Too few views yet to judge." : "Public numbers weren't available to assess.",
      pill: verdict === "real" ? pill("Mostly Real", "good") : verdict === "review" ? pill("Mixed", "warn") : verdict === "suspicious" ? pill("Unusual", "bad") : verdict === "too_early" ? pill("Too Early", "neutral") : pill("Unable to Verify", "neutral"),
      evidence: c.findings.filter((x) => x.tone === "good"),
      points: null,
    },
    {
      key: "suspicious",
      title: "Suspicious Activity",
      description: warns[0]?.title ?? (verdict ? "No unusual patterns in the public numbers." : "Public numbers weren't available to assess."),
      pill: !verdict ? pill("Unable to Verify", "neutral") : warns.length === 0 ? pill("None Found", "good") : warns.length === 1 ? pill("Low", "warn") : warns.length === 2 ? pill("Moderate", "warn") : pill("High", "bad"),
      evidence: warns,
      points: null,
      note: commentFinding && d.commentsRead ? `${d.commentsRead} recent comments read.` : undefined,
    },
    {
      key: "bots",
      title: "Bot / Fake Views",
      description: isYt ? "YouTube filters invalid views itself and doesn't publish the count." : `${name} doesn't publish bot or fake view counts.`,
      pill: pill("Not Measurable", "neutral"),
      evidence: [],
      points: null,
    },
  ];

  const a = d.account;
  const handleHref = d.authorUrl ?? undefined;
  const followersValue = a.followersHidden ? "Hidden by the owner" : fmtCount(a.followers);
  const visibility = (v: string | null): Pill => (v ? pill(v[0].toUpperCase() + v.slice(1), v === "public" ? "good" : "neutral") : pill(NA, "neutral"));
  const account: InfoRow[] = isYt
    ? [
        { key: "channel", label: "Channel", value: d.authorName, href: handleHref },
        { key: "created", label: "Channel Created", value: fmtDate(a.createdAt) },
        { key: "followers", label: "Subscribers", value: followersValue },
        { key: "views", label: "Total Views", value: fmtCount(a.totalViews) },
        { key: "posts", label: "Videos", value: fmtCount(a.posts) },
        { key: "country", label: "Country", value: a.country ?? (d.found ? "Not public" : null) },
        { key: "visibility", label: "Visibility", value: null, pill: visibility(d.visibility ?? a.visibility) },
      ]
    : [
        { key: "handle", label: "Handle", value: d.authorHandle ?? d.authorName, href: handleHref },
        ...(d.platform === "instagram" ? [{ key: "verified", label: "Verification", value: null, pill: a.verified == null ? pill(NA, "neutral") : a.verified ? pill("Verified", "good") : pill("Not Verified", "neutral") } as InfoRow] : []),
        { key: "created", label: "Account Created", value: fmtDate(a.createdAt) },
        { key: "followers", label: "Followers", value: followersValue },
        { key: "likes", label: "Total Likes", value: fmtCount(a.totalLikes) },
        { key: "posts", label: d.platform === "instagram" ? "Total Posts" : "Posts", value: fmtCount(a.posts) },
        { key: "country", label: "Country", value: a.country },
        { key: "visibility", label: "Account Visibility", value: null, pill: visibility(a.visibility) },
      ];

  const heading = isYt ? (d.title ?? d.authorName ?? `${name} ${kindLabel}`) : (d.authorHandle ?? d.authorName ?? `${name} ${kindLabel}`);
  return {
    platform: d.platform,
    platformName: name,
    itemLabel: `${name} ${kindLabel}`,
    heading,
    verified: a.verified === true,
    subline: isYt ? (d.contentType === "channel" ? d.authorHandle : d.authorName) : null,
    caption: isYt ? null : d.caption,
    thumbnail: d.thumbnailUrl,
    duration: fmtDuration(d.durationSec),
    posted: fmtDate(d.publishedAt),
    postedLabel: isYt ? (d.contentType === "channel" ? "Created" : "Published") : "Posted",
    url: d.url,
    quality,
    tiles,
    audience,
    accountTitle: isYt ? "Channel Information" : `${name} Account Information`,
    account,
    accessNote: d.accessNote,
    limits: c.limits,
  };
}

// ── 3. Digital product ────────────────────────────────────────────────────

const PRODUCT_TYPE_LABEL: Record<ProductDetails["productType"], string> = {
  ebook: "E-book (EPUB)", book: "E-book (PDF)", document: "PDF Document", template: "PDF Document", spreadsheet: "Spreadsheet",
  presentation: "Presentation", archive: "ZIP Archive", software: "Software", text: "Text Document",
};

export type ProductModel = {
  banner: Banner;
  score: Score;
  typeLabel: string;
  isBook: boolean;
  isTemplate: boolean;
  title: string;
  description: string | null;
  author: string | null;
  dateLabel: string;
  date: string | null;
  formatShort: string;
  size: string | null;
  tiles: Tile[];
  checks: CheckRow[];
  info: InfoRow[];
  limits: string[];
};

const LICENSE_LABEL: Record<NonNullable<ProductDetails["license"]>, Pill> = {
  commercial: { label: "Commercial Use Allowed", tone: "good" },
  creative_commons: { label: "Creative Commons", tone: "good" },
  all_rights_reserved: { label: "All Rights Reserved", tone: "info" },
  resell_rights: { label: "Resell Rights (PLR/MRR)", tone: "warn" },
  personal_use: { label: "Personal Use Only", tone: "info" },
};

export function productModel(c: CheckerResult, d: ProductDetails): ProductModel {
  const f = c.findings;
  const safetyF = f.filter((x) => /File signature|File inspection|Archive scan|PDF features|File type|Active content/i.test(x.source) || /macro|javascript|program|disguised|zip bomb/i.test(x.title));
  const claimF = f.filter((x) => x.source === "Claim check");
  const safetyWorst = worst(safetyF.filter((x) => x.tone !== "good" && x.tone !== "info"));
  const checks: CheckRow[] = [
    {
      key: "authenticity",
      title: "Product Authenticity",
      description: "Checks if the file is already sold or shared on Jimvio.",
      evidence: f.filter((x) => /fingerprint|marketplace/i.test(x.source)),
      ...(d.marketplaceDuplicates.length
        ? { pill: pill("Duplicate Found", "bad"), points: 0 as const }
        : d.seenBefore > 0
          ? { pill: pill("Seen Before", "warn"), points: 0.5 as const }
          : d.fileName
            ? { pill: pill("No Copies Found", "good"), points: 1 as const }
            : { pill: pill("Not Checked", "neutral"), points: null }),
      note: "Compared with files checked or sold on Jimvio, not the whole internet.",
    },
    {
      key: "safety",
      title: "File Safety (Malware Scan)",
      description: "Checks the file structure for programs, macros and harmful code.",
      evidence: safetyF,
      ...(!d.fileName
        ? { pill: pill("Not Checked", "neutral"), points: null }
        : safetyWorst === "bad"
          ? { pill: pill("Failed", "bad"), points: 0 as const }
          : safetyWorst === "warn"
            ? { pill: pill("Review", "warn"), points: 0.5 as const }
            : { pill: pill("Passed", "good"), points: 1 as const }),
      note: "A structure check, not a full antivirus scan.",
    },
    ...(d.sellerPage
      ? [(() => {
          const sp = d.sellerPage!;
          const ok = [sp.hasContact, sp.hasRefund, sp.hasPrivacy].filter(Boolean).length;
          const young = sp.domainAgeDays != null && sp.domainAgeDays < 60;
          return {
            key: "seller",
            title: "Seller & Source Verification",
            description: "Validates the seller page: contact details, refund and privacy policy.",
            evidence: f.filter((x) => x.source === "Product page" || x.source === "Jimvio marketplace" || x.source === "RDAP"),
            pill: !sp.hasContact || young ? pill("Review", "warn") : ok === 3 ? pill("Passed", "good") : pill("Partial", "warn"),
            points: (!sp.hasContact || young ? 0.5 : ok === 3 ? 1 : 0.5) as 0.5 | 1,
          } satisfies CheckRow;
        })()]
      : []),
    {
      key: "authorship",
      title: "Authorship Detection (AI vs Human)",
      description: "Looks for AI writing tools named in the file's metadata.",
      evidence: f.filter((x) => /AI writing tool/i.test(x.title)),
      ...(d.aiToolInMetadata
        ? { pill: pill("AI Tool Named", "ai"), points: 0.5 as const }
        : { pill: pill("Unable to Verify", "neutral"), points: null }),
      note: d.aiToolInMetadata ? undefined : "Jimvio has no reliable way to tell AI-written text from human writing, so no guess is made.",
    },
    {
      key: "copyright",
      title: "Copyright & Usage Rights",
      description: "Checks for clear copyright and permitted usage rights.",
      evidence: f.filter((x) => x.source === "Licensing text"),
      ...(d.license
        ? { pill: LICENSE_LABEL[d.license], points: (d.license === "resell_rights" ? 0.5 : 1) as 0.5 | 1 }
        : d.copyrightNotice
          ? { pill: pill("Notice Found", "info"), points: 1 as const }
          : { pill: pill("Unclear", "warn"), points: null }),
      note: d.copyrightNotice ? `“${d.copyrightNotice}”` : "No licence or copyright wording was found in the readable text.",
    },
    {
      key: "quality",
      title: "Content Quality",
      description: "Analyzes readable content and checks for misleading claims.",
      evidence: claimF,
      ...(claimF.some((x) => x.tone === "bad")
        ? { pill: pill("Harmful Claims", "bad"), points: 0 as const }
        : claimF.length
          ? { pill: pill("Claims Flagged", "warn"), points: 0.5 as const }
          : d.textReadable
            ? { pill: pill("Passed", "good"), points: 1 as const }
            : { pill: pill("Unable to Assess", "neutral"), points: null }),
      note: d.textReadable ? `${fmtCount(d.wordCount)} words read${d.pages ? ` across ${d.pages} pages` : ""}.` : "The text inside the file couldn't be read.",
    },
  ];

  const score = bandedScore(checks, evidenceScore(checks));
  const bad = checks.some((r) => r.points === 0);
  const review = checks.some((r) => r.points === 0.5);
  const banner: Banner = bad
    ? { tone: "bad", title: "High Risk Digital Product", text: "This product failed one or more checks. Review the details before buying, opening or sharing it.", result: pill("Not Trustworthy", "bad") }
    : score == null
      ? { tone: "neutral", title: "Product Could Not Be Fully Verified", text: "Too few checks could run on this file to give a reliable result.", result: pill("Inconclusive", "neutral") }
      : review
        ? { tone: "warn", title: "Review This Digital Product", text: "Most checks passed, but some need your attention before you rely on this product.", result: pill("Needs Review", "warn") }
        : { tone: "good", title: "Verified Digital Product", text: "The checks Jimvio ran found no safety, originality or claim problems.", result: pill("Legitimate", "good") };
  const scoreBadge: Pill = score == null ? pill("Not Scored", "neutral") : score >= 80 ? pill("High Trust", "good") : score >= 50 ? pill("Medium Trust", "warn") : pill("High Risk", "bad");
  const scoreText = score == null ? "Not enough checks completed for a reliable score." : score >= 80 ? "This digital product is likely legitimate and safe to use." : score >= 50 ? "Some checks need review before you rely on it." : "Low trust. Several checks failed.";

  const typeLabel = (d.productType === "document" || d.productType === "template") && d.format && !/PDF/.test(d.format) ? d.format : PRODUCT_TYPE_LABEL[d.productType];
  const title = d.title ?? d.fileName?.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ") ?? "Digital product";
  const isBook = d.productType === "book" || d.productType === "ebook";
  const date = fmtDate(d.createdAt);
  const formatShort = shortFormat(d.format, d.mime);
  const authorship: Pill = d.aiToolInMetadata ? pill(`AI Tool Named (${d.aiToolInMetadata})`, "ai") : pill("Unable to Verify", "neutral");
  const tiles: Tile[] = [
    { key: "status", value: banner.result.label, label: "Product Status", tone: banner.result.tone },
    { key: "type", value: typeLabel, label: "Product Type" },
    { key: "size", value: fmtBytes(d.size), label: "File Size" },
    { key: "format", value: formatShort, label: "File Format" },
    { key: "authorship", value: d.aiToolInMetadata ? "AI Tool Named" : "Not Verified", label: "Authorship", tone: d.aiToolInMetadata ? "ai" : "neutral" },
    { key: "date", value: date ?? "Unknown", label: isBook ? "Published Date" : "Created Date" },
  ];
  const info: InfoRow[] = [
    { key: "name", label: "Product Name", value: title },
    { key: "type", label: "Product Type", value: typeLabel },
    { key: "basis", label: "Type Detected From", value: d.productTypeBasis },
    { key: "format", label: "File Format", value: formatShort },
    { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
    { key: "pages", label: "Pages", value: fmtCount(d.pages) },
    { key: "author", label: "Author / Written By", value: d.author ?? "Not verified" },
    { key: "authorship", label: "Authorship Result", value: null, pill: authorship },
    { key: "date", label: isBook ? "Published Date" : "Created Date", value: date ?? "Unknown" },
    { key: "tool", label: "Made With", value: d.producer ?? d.creator },
    { key: "license", label: "License / Usage Rights", value: null, pill: d.license ? LICENSE_LABEL[d.license] : d.copyrightNotice ? pill("Copyright Notice Found", "info") : pill("Unclear / Not Specified", "warn") },
    { key: "description", label: "Description", value: d.subject },
  ];
  return {
    banner,
    score: { value: score, badge: scoreBadge, text: scoreText, basis: SCORE_BASIS },
    typeLabel,
    isBook,
    isTemplate: d.productType === "template",
    title,
    description: d.subject ?? (d.textReadable ? `${d.pages ? `${d.pages} pages · ` : ""}${fmtCount(d.wordCount)} words of readable text.` : null),
    author: d.author,
    dateLabel: isBook ? "Published" : "Created",
    date,
    formatShort,
    size: fmtBytes(d.size),
    tiles,
    checks,
    info,
    limits: c.limits,
  };
}

// ── 4. Media metadata & provenance ────────────────────────────────────────

export type MediaModel = {
  isVideo: boolean;
  isAudio: boolean;
  aiEvidence: boolean;
  banner: Banner;
  score: Score;
  formatShort: string;
  typeLabel: string;
  title: string;
  description: string;
  byLine: string | null;
  dateLabel: string;
  date: string | null;
  location: string | null;
  mapHref: string | null;
  size: string | null;
  creationChip: Pill;
  tiles: Tile[];
  checks: CheckRow[];
  creation: { headline: Pill; text: string; rows: InfoRow[] };
  technicalTitle: string;
  technical: InfoRow[];
  limits: string[];
};

function gpsLabel(g: MediaDetails["gps"]): string | null {
  if (!g) return null;
  return `${Math.abs(g.lat).toFixed(4)}° ${g.lat >= 0 ? "N" : "S"}, ${Math.abs(g.lon).toFixed(4)}° ${g.lon >= 0 ? "E" : "W"}`;
}

export function mediaModel(c: CheckerResult, d: MediaDetails): MediaModel {
  const f = c.findings;
  const isVideo = d.mediaType === "video";
  const isAudio = d.mediaType === "audio";
  const noun = isVideo ? "video" : isAudio ? "audio file" : "image";
  const Noun = isVideo ? "Video" : isAudio ? "Audio" : "Image";
  const aiEvidence = d.declaredAi.length > 0 || d.aiTools.length > 0 || d.c2pa.aiAction || Boolean(d.prompt);
  const camera = [d.make, d.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1\b/i, "$1") || null;
  const edited = d.editingSoftware;
  const dup = d.duplicate && d.duplicate.count > 0 ? d.duplicate : null;
  const aiTool = d.aiTools[0] ?? (d.prompt ? "Stable Diffusion / ComfyUI" : null) ?? (d.c2pa.aiAction ? d.c2pa.generator : null);
  const formatShort = shortFormat(d.format, d.mime);
  const decoded = isVideo ? d.width != null || d.durationSec != null : isAudio ? true : d.width != null;

  const checks: CheckRow[] = [
    {
      key: "integrity",
      title: "File Integrity & Format",
      description: decoded ? "Valid file structure and no corruption." : "The file structure could not be fully read.",
      evidence: [],
      ...(decoded ? { pill: pill("Passed", "good"), points: 1 as const } : { pill: pill("Unable to Verify", "neutral"), points: null }),
    },
    {
      key: "exif",
      title: isVideo || isAudio ? "Metadata" : "EXIF Metadata",
      description: camera
        ? `${isVideo ? "Recording device" : "Camera"} metadata found${d.capturedAt ? ", with date" : ""}${d.gps ? " and location" : ""}.`
        : d.exifPresent
          ? "Metadata present, without camera details."
          : `${isVideo ? "Device" : "Camera"} metadata (${isVideo ? "make/model" : "EXIF"}) not found.`,
      evidence: f.filter((x) => x.source === "EXIF"),
      ...(camera ? { pill: pill("Passed", "good"), points: null } : { pill: pill("Not Found", aiEvidence ? "bad" : "neutral"), points: null }),
      note: "Metadata can be copied or edited, so it isn't counted as proof either way.",
    },
    {
      key: "origin",
      title: "Origin & Provenance",
      description: d.c2pa.present ? `Content Credentials found${d.c2pa.generator ? ` (${d.c2pa.generator})` : ""}; signature not validated.` : aiEvidence ? "Source analysis indicates AI generation." : dup ? `This ${noun} was checked on Jimvio before.` : "No provenance record (Content Credentials) in the file.",
      evidence: f.filter((x) => /C2PA|fingerprint/i.test(x.source)),
      ...(aiEvidence
        ? { pill: pill("AI-Generated", "bad"), points: 0 as const }
        : d.c2pa.present
          ? { pill: pill("Credentials Found", "good"), points: 1 as const }
          : dup
            ? { pill: pill("Seen Before", "warn"), points: 0.5 as const }
            : { pill: pill("Not Available", "neutral"), points: null }),
    },
    {
      key: "ai",
      title: "AI-Generated Detection",
      description: aiEvidence ? "The file's own metadata declares generative AI." : "Checks metadata for AI-generation markers and prompts.",
      evidence: f.filter((x) => /AI|prompt|trained/i.test(x.title) && x.tone !== "info"),
      ...(aiEvidence ? { pill: pill("Detected", "bad"), points: 0 as const } : { pill: pill("No Markers Found", "neutral"), points: null }),
      note: aiEvidence ? undefined : "Markers are easy to remove, so their absence doesn't prove the file is human-made.",
    },
    {
      key: "edit",
      title: isVideo ? "Manipulation & Editing" : "Manipulation Detection",
      description: edited ? `Saved with editing software: ${edited}.` : "Checks metadata for editing software.",
      evidence: f.filter((x) => /Saved with/i.test(x.title)),
      ...(edited ? { pill: pill("Edited", "warn"), points: 0.5 as const } : { pill: pill("None Recorded", "neutral"), points: null }),
      note: edited ? undefined : "No editing software is recorded. Pixel-level edit detection isn't available yet.",
    },
    {
      key: "copyright",
      title: "Copyright & Usage Rights",
      description: d.copyright ? `Copyright: ${d.copyright}` : aiEvidence ? `Likely AI-generated; check the tool's license terms${aiTool ? ` (e.g., ${aiTool})` : ""} for commercial use.` : "No copyright field in the metadata.",
      evidence: [],
      pill: d.copyright ? pill("Notice Found", "info") : pill("Check License", "warn"),
      points: null,
    },
  ];

  const scoredRows = checks.filter((r) => r.points != null);
  // Media is scored only on provenance evidence (AI markers, credentials or reuse).
  const hasProvenance = aiEvidence || d.c2pa.present || Boolean(dup);
  const score = bandedScore(checks, hasProvenance && scoredRows.length >= 2 ? Math.round((scoredRows.reduce((a, r) => a + (r.points ?? 0), 0) / scoredRows.length) * 100) : null);
  const scoreBadge: Pill = score == null ? pill("Not Scored", "neutral") : score >= 80 ? pill("High Trust", "good") : score >= 50 ? pill("Medium Trust", "warn") : pill("Low Trust", "bad");
  const scoreText =
    score == null
      ? `No provenance evidence (Content Credentials or AI markers) to score. Camera metadata can be edited, so it isn't scored on its own.`
      : aiEvidence
        ? `This ${noun} is AI-generated and not a real ${isVideo ? "recording" : "photograph"}. It is not recommended for use as authentic media.`
        : score >= 80
          ? `Provenance evidence supports this ${noun}.`
          : `Some provenance checks need review.`;

  const banner: Banner = aiEvidence
    ? { tone: "bad", title: `AI-Generated ${Noun} Detected`, text: `This ${noun} was created using artificial intelligence (generative AI), not a physical ${isVideo ? "camera recording" : "camera"}, according to its own metadata.`, result: pill("Not Authentic (AI-Generated)", "bad") }
    : edited
      ? { tone: "warn", title: `Edited ${Noun} — Review Before Use`, text: `The ${noun} was saved with editing software (${edited}). Edits can be harmless, but it is not an untouched original.`, result: pill("Edited", "warn") }
      : dup
        ? { tone: "warn", title: `Previously Seen ${Noun}`, text: `This ${noun} was checked on Jimvio before${dup.firstSeenAt ? ` (first seen ${fmtDate(dup.firstSeenAt)})` : ""}. It may be reused content.`, result: pill("Possibly Reused", "warn") }
        : camera
          ? { tone: "good", title: `${Noun} Verified — Metadata & Provenance Checked`, text: `The ${noun} carries ${isVideo ? "recording-device" : "camera"} metadata and no AI or editing markers were found. Metadata can be edited, so this supports — but doesn't prove — an original ${isVideo ? "recording" : "photograph"}.`, result: pill("Verified", "good") }
          : { tone: "neutral", title: `${Noun} Origin Could Not Be Verified`, text: `The ${noun} has no camera metadata and no AI or provenance markers, so Jimvio can't tell how it was made.`, result: pill("Inconclusive", "neutral") };

  const creationChip: Pill = aiEvidence ? pill("AI-Generated", "ai") : camera ? pill(isVideo ? "Real Video (Camera)" : "Photograph (Camera)", "good") : pill("Origin Unknown", "neutral");
  const creationMethod = aiEvidence ? "Generative AI" : camera ? (isVideo ? "Recorded (Camera)" : "Photograph") : "Unknown";
  const date = fmtDateTime(d.capturedAt, false);
  const loc = gpsLabel(d.gps);
  const mapHref = d.gps ? `https://www.openstreetmap.org/?mlat=${d.gps.lat}&mlon=${d.gps.lon}#map=13/${d.gps.lat}/${d.gps.lon}` : null;
  const res = resolutionLabel(d.width, d.height, isVideo);

  const tiles: Tile[] = [
    { key: "status", value: aiEvidence ? "AI-Generated" : camera && !edited ? "Authentic" : edited ? "Edited" : "Unverified", label: "Media Status", tone: aiEvidence ? "bad" : camera && !edited ? "good" : edited ? "warn" : "neutral" },
    isVideo || isAudio ? { key: "type", value: `${Noun} (${formatShort})`, label: "Media Type" } : { key: "method", value: creationMethod, label: "Creation Method", tone: aiEvidence ? "ai" : undefined },
    ...(isVideo || isAudio ? [] : [{ key: "format", value: formatShort, label: "File Format" } as Tile]),
    { key: "size", value: fmtBytes(d.size), label: "File Size" },
    ...(isAudio ? [] : [{ key: "res", value: d.width && d.height ? `${d.width} × ${d.height}` : null, label: isVideo ? `Resolution${res ? ` (${res.split("(")[1]?.replace(")", "") ?? ""})` : ""}` : `Resolution${d.width && d.height ? ` (${((d.width * d.height) / 1e6).toFixed(1)} MP)` : ""}` } as Tile]),
    ...(isVideo || isAudio ? [{ key: "duration", value: fmtDuration(d.durationSec), label: "Duration" } as Tile] : []),
    aiEvidence ? { key: "tool", value: aiTool, label: "AI Tool" } : { key: "camera", value: camera, label: "Camera / Device" },
    aiEvidence || !d.gps ? { key: "date", value: fmtDate(d.capturedAt), label: aiEvidence ? "Generated Date" : isVideo ? "Recording Date" : "Capture Date" } : { key: "gps", value: loc, label: "Location (GPS)" },
  ];

  const creationRows: InfoRow[] = aiEvidence
    ? [
        { key: "ai", label: "AI Generation", value: null, pill: pill("Detected (Metadata)", "bad") },
        { key: "tool", label: "AI Tool Identified", value: aiTool },
        { key: "model", label: "Model / Version", value: d.c2pa.generator && d.c2pa.generator !== aiTool ? d.c2pa.generator : null },
        { key: "prompt", label: "Prompt (Stored in File)", value: d.prompt ? `“${d.prompt.slice(0, 160)}${d.prompt.length > 160 ? "…" : ""}”` : null },
        { key: "capture", label: "Capture Type", value: `Not a ${isVideo ? "Camera Recording" : "Photograph"}` },
        { key: "source", label: "Source / Provenance", value: `AI-Generated${aiTool ? ` (${aiTool})` : ""}` },
        { key: "edit", label: "Editing Detection", value: edited ? `Edited with ${edited}` : "No Additional Editing Recorded" },
      ]
    : [
        { key: "ai", label: "AI Generation", value: null, pill: pill("No Markers Found", "neutral") },
        { key: "capture", label: "Capture Type", value: camera ? (isVideo ? "Real Recording (Camera)" : "Photograph (Real Capture)") : "Unknown" },
        { key: "edit", label: "Editing Detection", value: null, pill: edited ? pill(`Edited (${edited})`, "warn") : pill("None Recorded", "neutral") },
        { key: "source", label: isVideo ? "Source / Device" : "Source / Provenance", value: d.c2pa.present ? `Content Credentials${d.c2pa.generator ? ` (${d.c2pa.generator})` : ""}` : camera ? (isVideo ? camera : "Original (Camera Metadata Present)") : null },
        { key: "tool", label: "Creation Tool", value: d.software },
        { key: "location", label: "Capture Location", value: loc, href: mapHref ?? undefined },
        { key: "date", label: "Capture Date & Time", value: date },
      ];

  const technical: InfoRow[] = isVideo || isAudio
    ? [
        { key: "name", label: "File Name", value: d.fileName },
        { key: "format", label: "Format", value: d.format },
        ...(isVideo ? [{ key: "vcodec", label: "Video Codec", value: d.videoCodec } as InfoRow] : []),
        { key: "acodec", label: "Audio Codec", value: d.audioCodec },
        ...(isVideo ? [{ key: "res", label: "Resolution", value: res } as InfoRow, { key: "fps", label: "Frame Rate", value: d.frameRate ? `${d.frameRate.toFixed(2)} fps` : null } as InfoRow] : []),
        { key: "bitrate", label: "Bitrate", value: d.bitrate ? `~${(d.bitrate / 1e6).toFixed(1)} Mbps` : null },
        { key: "duration", label: "Duration", value: d.durationSec != null ? `${fmtDuration(d.durationSec)} (${Math.round(d.durationSec)} seconds)` : null },
        { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
        ...(isVideo ? [{ key: "aspect", label: "Aspect Ratio", value: aspect(d.width, d.height) } as InfoRow] : []),
        { key: "device", label: "Camera / Device", value: camera },
        { key: "software", label: "Encoder / Software", value: d.software },
        { key: "gps", label: "GPS Coordinates", value: loc, href: mapHref ?? undefined },
        { key: "meta", label: "Device Metadata", value: null, pill: camera || d.gps ? pill(`Present (${[camera ? "Device" : null, d.gps ? "GPS" : null].filter(Boolean).join(" & ")})`, "good") : pill("Not Found", "neutral") },
      ]
    : [
        { key: "name", label: "File Name", value: d.fileName },
        { key: "format", label: "File Format", value: `${formatShort === "JPG" ? "JPEG" : formatShort} (${d.mime})` },
        { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
        { key: "dims", label: "Dimensions", value: resolutionLabel(d.width, d.height) },
        ...(aiEvidence ? [{ key: "exif", label: "EXIF Data", value: null, pill: d.exifPresent && camera ? pill("Present", "good") : pill("Not Available (AI)", "bad") } as InfoRow] : []),
        { key: "camera", label: "Camera / Device", value: camera },
        { key: "lens", label: "Lens", value: d.lens },
        ...(aiEvidence
          ? [{ key: "exposure", label: "Aperture / Shutter / ISO", value: d.fNumber || d.exposureTime || d.iso ? [d.fNumber ? `f/${d.fNumber}` : null, d.exposureTime ? exposure(d.exposureTime) : null, d.iso ? `ISO ${d.iso}` : null].filter(Boolean).join(" · ") : null } as InfoRow]
          : [
              { key: "aperture", label: "Aperture (f)", value: d.fNumber ? `f/${d.fNumber}` : null } as InfoRow,
              { key: "shutter", label: "Shutter Speed", value: d.exposureTime ? exposure(d.exposureTime) : null } as InfoRow,
              { key: "iso", label: "ISO", value: d.iso != null ? String(d.iso) : null } as InfoRow,
              { key: "focal", label: "Focal Length", value: d.focalLength ? `${Math.round(d.focalLength)} mm` : null } as InfoRow,
            ]),
        ...(aiEvidence ? [] : [{ key: "date", label: "Date Taken", value: date } as InfoRow]),
        { key: "gps", label: "GPS Coordinates", value: loc, href: mapHref ?? undefined },
        { key: "color", label: "Color Profile", value: d.iccProfile ?? (d.colorSpace ? d.colorSpace.toUpperCase().replace("SRGB", "sRGB") : null) },
        ...(aiEvidence ? [{ key: "generated", label: "Created / Generated", value: fmtDate(d.capturedAt) ? `${fmtDate(d.capturedAt)} (AI Generation)` : null } as InfoRow] : []),
      ];

  const fileTitle = d.fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").trim();
  return {
    isVideo,
    isAudio,
    aiEvidence,
    banner,
    score: { value: score, badge: scoreBadge, text: scoreText, basis: `Media is scored only when the file carries provenance evidence. ${SCORE_BASIS}` },
    formatShort,
    typeLabel: `${Noun} File (${formatShort})`,
    title: fileTitle ? fileTitle[0].toUpperCase() + fileTitle.slice(1) : d.fileName,
    description: [res, d.durationSec != null ? fmtDuration(d.durationSec) : null, isVideo && d.frameRate ? `${Math.round(d.frameRate)} fps` : null, isVideo ? d.videoCodec : null].filter(Boolean).join(" · ") || d.format,
    byLine: aiEvidence ? (aiTool ? `AI (${aiTool})` : "AI") : camera,
    dateLabel: aiEvidence ? "Generated" : isVideo ? "Recorded" : "Taken",
    date: aiEvidence ? fmtDate(d.capturedAt) : date,
    location: loc,
    mapHref,
    size: fmtBytes(d.size),
    creationChip,
    tiles,
    checks,
    creation: {
      headline: aiEvidence ? pill("AI-Generated", "bad") : camera ? pill(isVideo ? "Recorded (Physical Camera)" : "Photographed (Real Camera)", "good") : pill("Unknown", "neutral"),
      text: aiEvidence
        ? `This ${noun} was created using a generative AI tool, not captured by a real camera.`
        : camera
          ? `The ${noun} carries ${isVideo ? "recording-device" : "camera"} metadata (${camera}) and no AI markers.`
          : `No camera metadata or AI markers were found, so the creation method is unknown.`,
      rows: creationRows,
    },
    technicalTitle: isVideo || isAudio ? "Technical Metadata (Container)" : "Technical Metadata (EXIF)",
    technical,
    limits: c.limits,
  };
}

function exposure(t: number): string {
  return t >= 1 ? `${t} s` : `1/${Math.round(1 / t)} s`;
}

export type AnyModel =
  | { category: "links"; model: LinkModel }
  | { category: "engagement"; model: EngagementModel }
  | { category: "product"; model: ProductModel }
  | { category: "media"; model: MediaModel };
