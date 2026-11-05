/**
 * Turns a scan report into what each result page shows. Pure: no React,
 * no network. Every label here comes from evidence in the report; when the
 * evidence is missing the label says so ("Not Available", "Unable to
 * Verify") and the item never counts as passed or failed.
 */
import type {
  AssessmentState, CheckerResult, CheckExecution, ProductAssessment, ProductCheck, ProductCheckStatus, MediaAssessment, MediaCheckStatus, EngagementDetails, Finding, LinkAssessment, LinkDetails, MediaDetails, ProductDetails, ScanCategory, ScanReport,
} from "./types";
import { assessLink } from "./link-assessment";
import { assessProduct } from "./product-assessment";
import { assessMedia, softwareKind } from "./media-assessment";

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

export type AssessmentSections = { found: string[]; couldNotVerify: string[]; actions: string[] };
export type LinkModel = {
  banner: Banner;
  state: AssessmentState;
  risk: Score;
  coverage: { value: number; completed: number; total: number };
  confidence: LinkAssessment["confidence"];
  tiles: Tile[];
  checks: CheckRow[];
  info: InfoRow[];
  redirects: { url: string; status: number }[];
  sections: AssessmentSections;
  limits: string[];
};

/** Exact hero texts, one per assessment state (product spec, Nov 2026). */
export const HERO: Record<AssessmentState, { tone: Banner["tone"]; title: string; text: string; result: Pill }> = {
  NO_KNOWN_THREATS: { tone: "good", title: "No Known Threats Detected", text: "Jimvio completed its available security checks and found no known threats. This does not guarantee the link is completely safe.", result: { label: "No Known Threats", tone: "good" } },
  INCOMPLETE_ASSESSMENT: { tone: "neutral", title: "Security Assessment Incomplete", text: "Some important security checks could not be completed. Review the missing checks before trusting this link.", result: { label: "Incomplete", tone: "neutral" } },
  THREAT_DETECTED: { tone: "danger", title: "Potential Security Threat Detected", text: "Jimvio identified suspicious or malicious indicators associated with this link. Review the findings before proceeding.", result: { label: "Threat Detected", tone: "bad" } },
  SUSPICIOUS_ACTIVITY: { tone: "warn", title: "Suspicious Activity Detected", text: "Jimvio found unusual indicators that require further investigation. The available evidence is not sufficient to confirm a threat.", result: { label: "Suspicious", tone: "warn" } },
  WEBSITE_UNREACHABLE: { tone: "neutral", title: "Website Could Not Be Inspected", text: "Jimvio could not access the destination to complete its content analysis. Some security risks may therefore remain unverified.", result: { label: "Not Inspected", tone: "neutral" } },
  SCAN_FAILED: { tone: "neutral", title: "Security Scan Could Not Be Completed", text: "Jimvio encountered a technical problem while analyzing this link. Please try again.", result: { label: "Scan Failed", tone: "neutral" } },
};

const EXEC_PILL: Record<CheckExecution, Pill> = {
  CLEAN: { label: "Clean", tone: "good" },
  THREAT_DETECTED: { label: "Threat Detected", tone: "bad" },
  SUSPICIOUS: { label: "Suspicious", tone: "warn" },
  INCONCLUSIVE: { label: "Inconclusive", tone: "neutral" },
  NOT_CHECKED: { label: "Not Checked", tone: "neutral" },
  UNAVAILABLE: { label: "Unavailable", tone: "neutral" },
  FAILED: { label: "Failed", tone: "neutral" },
};
const EXEC_POINTS: Record<CheckExecution, CheckRow["points"]> = { CLEAN: 1, SUSPICIOUS: 0.5, THREAT_DETECTED: 0, INCONCLUSIVE: null, NOT_CHECKED: null, UNAVAILABLE: null, FAILED: null };
const CHECK_DESC: Record<string, string> = {
  url: "Checks the address for encoding tricks, raw IPs and hidden credentials.",
  redirects: "Follows every redirect to the final destination.",
  malware: "Checks Google's malware and unwanted-software lists.",
  phishing: "Phishing lists plus the page's own sign-in behaviour.",
  reputation: "Checks the domain for abused endings and bait words.",
  brand: "Looks for well-known brand names on domains that aren't theirs.",
  blocklist: "Google Web Risk and the public Phishing.Database.",
  tls: "Checks the website's HTTPS certificate.",
  registration: "Domain age, registrar and nameservers (RDAP).",
  dns: "Server address and the network that operates it.",
  content: "Reads the page safely (no scripts) for scam patterns.",
  downloads: "Checks whether the link starts a program download.",
};

function regionName(cc: string | null | undefined): string | null {
  if (!cc) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc.toUpperCase()) ?? cc;
  } catch {
    return cc;
  }
}

export function linkModel(c: CheckerResult, d: LinkDetails | null, submittedUrl: string, checkedAt: string): LinkModel {
  // Older reports have no stored assessment: rebuild it from the same evidence.
  const a: LinkAssessment | null = d ? (d.assessment ?? assessLink({ findings: c.findings, details: d })) : null;
  const state: AssessmentState = a?.state ?? "SCAN_FAILED";
  const h = HERO[state];
  const banner: Banner = { tone: h.tone, title: h.title, text: h.text, result: h.result };

  const checks: CheckRow[] = (a?.checks ?? []).map((k) => ({
    key: k.id,
    title: k.name,
    description: CHECK_DESC[k.id] ?? k.source,
    pill: EXEC_PILL[k.status],
    points: EXEC_POINTS[k.status],
    note: k.explanation,
    evidence: k.evidence.map((e) => ({ tone: k.status === "THREAT_DETECTED" ? "bad" : k.status === "SUSPICIOUS" ? "warn" : "info", title: e, source: k.source }) as Finding),
  }));

  const total = a?.checks.length ?? 12;
  const completed = a?.counts.completed ?? 0;
  const coverage = a?.coverage ?? 0;
  // No score from almost nothing: a number with no evidence behind it would read as "safe".
  const scored = a != null && state !== "SCAN_FAILED" && (a.counts.threats > 0 || coverage >= 40);
  const riskValue = scored ? a!.riskScore : null;
  const rc = a?.riskClass ?? "Very Low Observed Risk";
  const riskBadge: Pill = riskValue == null ? pill("Not Scored", "neutral") : pill(rc, riskValue >= 60 ? "bad" : riskValue >= 40 ? "warn" : riskValue >= 20 ? "info" : "good");
  const riskText =
    riskValue == null
      ? "Too few checks completed to give a reliable score."
      : riskValue >= 80
        ? "Credible threat evidence. Avoid this link."
        : riskValue >= 60
          ? "Strong warning signs found. Avoid this link."
          : riskValue >= 40
            ? "Several warning signs. Proceed with great care."
            : riskValue >= 20
              ? "Some minor warning signs were observed."
              : state === "NO_KNOWN_THREATS"
                ? "No warning signs observed in the completed checks."
                : "No warning signs observed — but not every check completed.";

  const redirects = d?.redirects ?? [];
  const n = a?.counts;
  const tiles: Tile[] = [
    { key: "result", value: h.result.label, label: "Assessment", tone: h.result.tone === "bad" ? "bad" : h.result.tone === "good" ? "good" : "neutral" },
    { key: "completed", value: a ? `${completed}/${total}` : null, label: "Checks Completed" },
    { key: "threats", value: n ? String(n.threats) : null, label: "Threats Detected", tone: n?.threats ? "bad" : undefined },
    { key: "suspicious", value: n ? String(n.suspicious) : null, label: "Suspicious Indicators", tone: n?.suspicious ? "warn" : undefined },
    { key: "unavailable", value: n ? String(n.unavailable) : null, label: "Unavailable / Failed" },
    { key: "notrun", value: n ? String(n.notExecuted) : null, label: "Inconclusive / Not Run" },
  ];

  const finalUrl = d?.finalUrl ?? submittedUrl;
  const tlsRow = checks.find((r) => r.key === "tls");
  const blocklisted = d ? d.webRisk.status === "match" || d.phishingList.status === "match" : false;
  const dbChecked = d ? [d.webRisk.status, d.phishingList.status].filter((s) => s !== "unavailable").length : 0;
  const info: InfoRow[] = [
    { key: "url", label: "Submitted URL", value: submittedUrl || null, copy: submittedUrl || undefined },
    { key: "final", label: "Final URL", value: d?.finalUrl ?? null, href: d?.finalUrl && /^https?:\/\//.test(d.finalUrl) ? d.finalUrl : undefined, copy: d?.finalUrl ?? undefined },
    { key: "domain", label: "Domain", value: d?.domain ?? (safeHost(finalUrl).replace(/\/$/, "") || null), copy: d?.domain ?? undefined },
    { key: "age", label: "Domain Age", value: fmtAge(d?.ageDays ?? null, d?.registeredAt ?? null) },
    { key: "registrar", label: "Registrar", value: d?.registrar ?? null },
    { key: "ns", label: "Nameservers", value: d?.nameservers?.length ? d.nameservers.join(", ") : null },
    { key: "host", label: "Hosting Network", value: d?.network?.org ?? d?.network?.network ?? null },
    { key: "location", label: "Network Country", value: regionName(d?.network?.country) },
    { key: "ip", label: "IP Address", value: d?.ip ?? null, copy: d?.ip ?? undefined },
    { key: "tls", label: "SSL Certificate", value: d?.tls.issuer ?? null, pill: tlsRow?.pill ?? pill(NA, "neutral") },
    { key: "redirects", label: "Redirects", value: null, pill: d ? (redirects.length ? pill(`${redirects.length} followed`, "info") : d.pageFetched ? pill("None", "good") : pill("Not Followed", "neutral")) : pill(NA, "neutral") },
    { key: "type", label: "Content Type", value: d?.contentType ? `${d.contentType.includes("html") ? "HTML" : d.contentType.split("/")[1]?.toUpperCase() ?? "File"} (${d.contentType})` : null },
    { key: "db", label: "Security Databases", value: null, pill: blocklisted ? pill("Listed", "bad") : dbChecked ? pill(`Not Listed (${dbChecked}/2 answered)`, dbChecked === 2 ? "good" : "info") : pill("Not Checked", "neutral") },
    { key: "checked", label: "Last Checked", value: fmtDateTime(checkedAt) },
  ];

  return {
    banner,
    state,
    risk: {
      value: riskValue,
      badge: riskBadge,
      text: riskText,
      basis: "Risk score counts only credible evidence found (0–100): a threat-intelligence listing sets it to at least 90; dangerous page behaviour adds 35; suspicious indicators add 7–14. Checks that did not run add nothing and never count as clean — see Coverage and Confidence.",
    },
    coverage: { value: coverage, completed, total },
    confidence: a?.confidence ?? "LOW",
    tiles,
    checks,
    info,
    redirects,
    sections: { found: a?.found ?? [], couldNotVerify: a?.couldNotVerify ?? [], actions: a?.actions ?? ["Try the check again in a few minutes."] },
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
  verdict: ProductAssessment["verdict"];
  score: Score;
  scoreState: ProductAssessment["scoreState"];
  coverage: number;
  confidence: ProductAssessment["confidence"];
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
  groups: { key: ProductCheck["group"]; title: string; checks: CheckRow[] }[];
  checks: CheckRow[];
  info: InfoRow[];
  sections: AssessmentSections;
  limits: string[];
};

/** Exact banner texts, one per verdict (product spec, Nov 2026). */
export const PRODUCT_HERO: Record<ProductAssessment["verdict"], Banner> = {
  VERIFIED: { tone: "good", title: "Verified", text: "Jimvio completed the applicable checks and found supporting evidence for this product's verification.", result: { label: "Verified", tone: "good" } },
  NEEDS_REVIEW: { tone: "warn", title: "Needs Review", text: "Some findings require further review before this product can be fully verified.", result: { label: "Needs Review", tone: "warn" } },
  POTENTIAL_RISK_DETECTED: { tone: "bad", title: "Potential Risk Detected", text: "Jimvio identified credible indicators of a potential product or security risk. Review the evidence before opening, buying, or sharing this file.", result: { label: "Potential Risk", tone: "bad" } },
  VERIFICATION_INCOMPLETE: { tone: "neutral", title: "Verification Incomplete", text: "Jimvio could not complete enough checks to reliably verify this product. Some important information remains unavailable.", result: { label: "Incomplete", tone: "neutral" } },
  UNABLE_TO_VERIFY: { tone: "neutral", title: "Unable to Verify", text: "The available information is insufficient to confirm this product's authenticity or rights.", result: { label: "Unverified", tone: "neutral" } },
  SCAN_FAILED: { tone: "neutral", title: "Scan Failed", text: "Jimvio encountered a technical issue while analyzing this file. Please try again.", result: { label: "Scan Failed", tone: "neutral" } },
};

const PCHECK_PILL: Record<ProductCheckStatus, Tone> = { PASS: "good", INFO: "info", REVIEW: "warn", RISK: "bad", NOT_CHECKED: "neutral", UNAVAILABLE: "neutral", FAILED: "neutral" };
const PCHECK_POINTS: Record<ProductCheckStatus, CheckRow["points"]> = { PASS: 1, INFO: 1, REVIEW: 0.5, RISK: 0, NOT_CHECKED: null, UNAVAILABLE: null, FAILED: null };
const GROUP_TITLE: Record<ProductCheck["group"], string> = { security: "File Security", authenticity: "Product Authenticity", authorship: "Authorship", rights: "Copyright & Rights", content: "Content Quality", seller: "Seller & Publisher" };
const FILE_SAFETY_LABEL: Record<ProductAssessment["fileSafety"], Pill> = {
  CLEAN: { label: "No Threats Found", tone: "good" }, MALWARE_DETECTED: { label: "Malware Detected", tone: "bad" }, SUSPICIOUS: { label: "Suspicious", tone: "warn" },
  SCAN_FAILED: { label: "Scan Failed", tone: "neutral" }, SCAN_UNAVAILABLE: { label: "Scan Unavailable", tone: "neutral" }, INCONCLUSIVE: { label: "Inconclusive", tone: "neutral" }, NOT_CHECKED: { label: "Not Checked", tone: "neutral" },
};
const RIGHTS_LABEL: Record<ProductAssessment["rights"], Pill> = {
  LICENSE_FOUND: { label: "License Found", tone: "good" }, COPYRIGHT_NOTICE_FOUND: { label: "Copyright Notice Found", tone: "info" },
  PUBLIC_DOMAIN_EVIDENCE_FOUND: { label: "Work Likely Public Domain", tone: "info" }, PUBLISHER_AUTHORIZATION_FOUND: { label: "Authorized by Jimvio", tone: "good" },
  RIGHTS_UNCLEAR: { label: "Rights Unclear", tone: "warn" }, RIGHTS_NOT_ASSESSED: { label: "Not Assessed", tone: "neutral" }, POSSIBLE_UNAUTHORIZED_DISTRIBUTION: { label: "Possible Unauthorized Copy", tone: "warn" },
};

export function productModel(c: CheckerResult, d: ProductDetails): ProductModel {
  // Older reports have no stored assessment: rebuild it from the same evidence.
  const a = d.assessment ?? assessProduct({ details: d, findings: c.findings });
  const banner = PRODUCT_HERO[a.verdict];
  const toRow = (k: ProductCheck): CheckRow => ({
    key: k.id,
    title: k.name,
    description: k.explanation,
    pill: pill(k.label, PCHECK_PILL[k.status]),
    points: PCHECK_POINTS[k.status],
    evidence: k.evidence.map((e) => ({ tone: k.status === "RISK" ? "bad" : k.status === "REVIEW" ? "warn" : "info", title: e, source: k.source }) as Finding),
    note: `Source: ${k.source}`,
  });
  const order: ProductCheck["group"][] = ["security", "authenticity", "authorship", "rights", "content", "seller"];
  const groups = order
    .map((g) => ({ key: g, title: GROUP_TITLE[g], checks: a.checks.filter((k) => k.group === g).map(toRow) }))
    .filter((g) => g.checks.length);

  const score = a.score;
  const scoreBadge: Pill =
    score == null ? pill(a.scoreState === "INCOMPLETE" ? "Incomplete" : "Not Scored", "neutral") : a.verdict === "VERIFIED" ? pill("High Trust", "good") : score >= 50 ? pill("Medium Trust", "warn") : pill("Low Trust", "bad");
  const scoreText =
    score == null
      ? a.scoreState === "INCOMPLETE"
        ? "Important checks did not complete, so no score is given."
        : "Too few checks completed for a reliable score."
      : a.verdict === "POTENTIAL_RISK_DETECTED"
        ? "Credible risk indicators lower the trust score."
        : a.verdict === "VERIFIED"
          ? "The completed checks support this product."
          : a.verdict === "UNABLE_TO_VERIFY"
            ? "The file is sound, but its source and rights are unconfirmed."
            : "Some checks need review before you rely on it.";

  const pages = d.pdf?.pages ?? null;
  const scanned = pages && pages.total > 0 && pages.withText === 0 && pages.imageOnly > 0;
  const isBook = d.productType === "book" || d.productType === "ebook";
  const typeLabel =
    d.productType === "book"
      ? scanned ? "Scanned Book (PDF)" : "Text-Based Book (PDF)"
      : d.productType === "document" && scanned
        ? "Scanned Document (PDF)"
        : (d.productType === "document" || d.productType === "template") && d.format && !/PDF/.test(d.format)
          ? d.format
          : PRODUCT_TYPE_LABEL[d.productType];
  const fileTitle = d.fileName?.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ") ?? null;
  const title = d.inferredTitle?.value ?? d.title ?? fileTitle ?? "Digital product";
  const date = fmtDate(d.createdAt);
  const formatShort = shortFormat(d.format, d.mime);
  const tool = d.producer ?? d.creator;
  const tiles: Tile[] = [
    { key: "status", value: banner.result.label, label: "Verification", tone: banner.result.tone },
    { key: "safety", value: FILE_SAFETY_LABEL[a.fileSafety].label, label: "File Security", tone: FILE_SAFETY_LABEL[a.fileSafety].tone },
    { key: "rights", value: RIGHTS_LABEL[a.rights].label, label: "Rights", tone: RIGHTS_LABEL[a.rights].tone },
    { key: "pages", value: pages?.total ? `${pages.withText}/${pages.total}` : d.wordCount ? `${fmtCount(d.wordCount)} words` : null, label: pages?.total ? "Pages Read" : "Content Read" },
    { key: "type", value: typeLabel, label: "Product Type" },
    { key: "size", value: fmtBytes(d.size), label: "File Size" },
  ];
  const meta = (v: string | null | undefined, src: string) => (v ? `${v} · ${src}` : null);
  const info: InfoRow[] = [
    { key: "name", label: "Product Name", value: d.inferredTitle ? `${d.inferredTitle.value} · from ${d.inferredTitle.source}` : title },
    ...(d.title && d.inferredTitle ? [{ key: "metatitle", label: "Title (Metadata)", value: d.title }] : []),
    { key: "file", label: "File Name", value: d.fileName, copy: d.fileName ?? undefined },
    { key: "type", label: "Product Type", value: typeLabel },
    { key: "basis", label: "Type Detected From", value: d.productTypeBasis },
    { key: "format", label: "File Format", value: d.format ? `${formatShort} · verified from file signature` : formatShort },
    { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
    { key: "pages", label: "Pages", value: pages?.total ? `${fmtCount(pages.total)} total · ${fmtCount(pages.withText)} with readable text${pages.blank ? ` · ${pages.blank} blank` : ""}${pages.imageOnly ? ` · ${pages.imageOnly} image-only` : ""}` : fmtCount(d.pages) },
    { key: "author", label: "Author / Written By", value: meta(d.author, "from file metadata, not independently verified") ?? "Not stated" },
    { key: "authorship", label: "Authorship Result", value: null, pill: d.aiToolInMetadata ? pill(`AI Tool Named (${d.aiToolInMetadata})`, "ai") : d.author ? pill("Metadata Found · Unverified", "info") : pill("Unverified", "neutral") },
    { key: "date", label: "PDF File Created", value: date ? `${date} · file metadata (not the publication date)` : null },
    ...(d.modifiedAt && d.modifiedAt !== d.createdAt ? [{ key: "modified", label: "PDF File Modified", value: fmtDate(d.modifiedAt) }] : []),
    ...(d.firstSeenAt ? [{ key: "firstseen", label: "First Seen on Jimvio", value: fmtDate(d.firstSeenAt) }] : []),
    { key: "tool", label: "Creator Application", value: tool ? `${[d.producer, d.creator && d.creator !== d.producer ? d.creator : null].filter(Boolean).join(" · ")} · file metadata` : null },
    ...(d.isbn ? [{ key: "isbn", label: "ISBN", value: d.isbn }] : []),
    { key: "license", label: "License / Usage Rights", value: null, pill: RIGHTS_LABEL[a.rights] },
    { key: "description", label: "Description", value: d.subject ? `“${d.subject}” · from file metadata (a claim, not verified)` : null },
  ];
  return {
    banner,
    verdict: a.verdict,
    score: {
      value: score,
      badge: scoreBadge,
      text: scoreText,
      basis: "Trust score = share of completed checks that passed (review counts as partial). Checks that did not run are left out, never counted as failed. The score stays inside the verdict's band so the two never contradict.",
    },
    scoreState: a.scoreState,
    coverage: a.coverage,
    confidence: a.confidence,
    typeLabel,
    isBook,
    isTemplate: d.productType === "template",
    title,
    description: d.subject ?? (d.textReadable ? `${d.pages ? `${fmtCount(d.pages)} pages · ` : ""}${fmtCount(d.wordCount)} words of readable text.` : null),
    author: d.author,
    dateLabel: "File created",
    date,
    formatShort,
    size: fmtBytes(d.size),
    tiles,
    groups,
    checks: groups.flatMap((g) => g.checks),
    info,
    sections: { found: a.found, couldNotVerify: a.couldNotVerify, actions: a.actions },
    limits: c.limits,
  };
}

// ── 4. Media metadata & provenance ────────────────────────────────────────

export type MediaModel = {
  isVideo: boolean;
  isAudio: boolean;
  aiEvidence: boolean;
  verdict: MediaAssessment["verdict"];
  banner: Banner;
  score: Score;
  coverage: number;
  confidence: MediaAssessment["confidence"];
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
  sections: AssessmentSections;
  limits: string[];
};

const MSTATUS_POINTS: Record<MediaCheckStatus, CheckRow["points"]> = { VERIFIED: 1, DETECTED: 1, NOT_FOUND: null, NOT_AVAILABLE: null, NOT_CHECKED: null, INCONCLUSIVE: null, FAILED: null, UNAVAILABLE: null, NOT_APPLICABLE: null };

/** Tag a value with where it came from (metadata is a claim, not a fact). */
const tagged = (v: string | null | undefined, how: "Declared in metadata" | "Measured" | "Inferred" | "Unverified" | "Verified") => (v ? `${v} · ${how}` : null);

function gpsLabel(g: MediaDetails["gps"]): string | null {
  if (!g) return null;
  return `${Math.abs(g.lat).toFixed(4)}° ${g.lat >= 0 ? "N" : "S"}, ${Math.abs(g.lon).toFixed(4)}° ${g.lon >= 0 ? "E" : "W"}`;
}

export function mediaModel(c: CheckerResult, d: MediaDetails): MediaModel {
  const a = d.assessment ?? assessMedia({ details: d });
  const isVideo = d.mediaType === "video";
  const isAudio = d.mediaType === "audio";
  const noun = isVideo ? "video" : isAudio ? "audio file" : "image";
  const Noun = isVideo ? "Video" : isAudio ? "Audio" : "Image";
  const aiEvidence = a.creation === "AI_GENERATION_INDICATED_BY_METADATA" || a.creation === "AI_GENERATION_CONFIRMED_BY_VALID_PROVENANCE";
  const camera = [d.make, d.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1\b/i, "$1") || null;
  const aiTool = d.aiTools[0] ?? (d.prompt ? "Stable Diffusion / ComfyUI" : null) ?? (d.c2pa.aiAction ? d.c2pa.generator : null);
  const formatShort = shortFormat(d.format, d.mime);
  const swKind = softwareKind(d.software);
  const editor = swKind === "editor" ? d.software : d.editingSoftware;

  const BANNER: Record<MediaAssessment["verdict"], Banner> = {
    AI_GENERATED_DECLARED: { tone: "warn", title: `AI-Generated ${Noun} (Declared)`, text: `This ${noun}'s own metadata declares it was made with generative AI${aiTool ? ` (${aiTool})` : ""}. That describes how it was created; it doesn't make it fake or fraudulent. The declaration is not cryptographically verified.`, result: pill("AI-Generated", "ai") },
    CREDENTIALS_UNVERIFIED: { tone: "neutral", title: "Content Credentials Found — Unverified", text: `The ${noun} carries Content Credentials, but their signature was not validated, so the origin they describe is not verified.`, result: pill("Unverified", "neutral") },
    CAMERA_ORIGIN_INDICATED: { tone: "good", title: "Camera Origin Indicated", text: `The metadata names a ${isVideo ? "recording device" : "camera"} (${camera}) and no AI or editing markers were found. Metadata can be edited, so this supports — but doesn't prove — a genuine capture.`, result: pill("Camera Indicated", "good") },
    EDITED_RECORDED: { tone: "warn", title: `Edited ${Noun}`, text: `Editing is recorded in the metadata${editor ? ` (${editor})` : ""}. Editing is often harmless and is not proof of deceptive tampering.`, result: pill("Edited", "warn") },
    PREVIOUSLY_SEEN: { tone: "neutral", title: "Previously Seen on Jimvio", text: `This ${noun} was checked on Jimvio before. A match doesn't prove copying, and the file's origin remains unconfirmed.`, result: pill("Seen Before", "info") },
    ORIGIN_UNKNOWN: { tone: "neutral", title: "Origin Could Not Be Determined", text: `Jimvio found no camera metadata, no Content Credentials and no AI markers. That doesn't mean the ${noun} is fake — only that its origin can't be confirmed from the file.`, result: pill("Origin Unknown", "neutral") },
    INTEGRITY_ISSUE: { tone: "bad", title: "File Integrity Problem", text: d.integrityIssue ?? `The ${noun}'s structure doesn't match how it is presented.`, result: pill("Integrity Issue", "bad") },
    SCAN_FAILED: { tone: "neutral", title: "Media Could Not Be Analysed", text: `Jimvio encountered a technical problem while reading this ${noun}. Please try again with the original file.`, result: pill("Scan Failed", "neutral") },
  };
  const banner = BANNER[a.verdict];

  const checks: CheckRow[] = a.checks.map((k) => ({
    key: k.id,
    title: k.name,
    description: k.explanation,
    pill: pill(k.label, k.tone),
    points: MSTATUS_POINTS[k.status],
    evidence: k.evidence.map((e) => ({ tone: "info", title: e, source: k.source }) as Finding),
    note: `Status: ${k.status.replace(/_/g, " ").toLowerCase()} · Source: ${k.source}`,
  }));

  const score = a.score;
  const scoreBadge: Pill = score == null ? pill("Not Scored", "neutral") : score >= 70 ? pill("Good Confidence", "good") : score >= 45 ? pill("Medium Confidence", "warn") : pill("Low Confidence", "bad");
  const scoreText =
    score == null
      ? `Not enough provenance evidence to score. Missing EXIF or AI markers is not penalised, and camera metadata alone isn't scored.`
      : aiEvidence
        ? `Provenance confidence in what the file says about itself. Being AI-generated is not penalised.`
        : `Provenance confidence from the evidence found.`;

  const creationChip: Pill = aiEvidence ? pill("AI-Generated (Declared)", "ai") : editor ? pill("Edited", "warn") : camera ? pill(isVideo ? "Camera Recording (Indicated)" : "Camera Photo (Indicated)", "good") : pill("Origin Unknown", "neutral");
  const methodLabel = a.creationMethod === "AI_GENERATED" ? "AI-Generated" : a.creationMethod === "AI_EDITED" ? "AI-Edited" : a.creationMethod === "EDITED" ? "Edited" : a.creationMethod === "CAMERA_INDICATED" ? (isVideo ? "Camera Recording (indicated)" : "Camera Capture (indicated)") : "Unknown";
  const date = fmtDateTime(d.capturedAt, false);
  const loc = gpsLabel(d.gps);
  const mapHref = d.gps ? `https://www.openstreetmap.org/?mlat=${d.gps.lat}&mlon=${d.gps.lon}#map=13/${d.gps.lat}/${d.gps.lon}` : null;
  const res = resolutionLabel(d.width, d.height, isVideo);

  const tiles: Tile[] = [
    { key: "status", value: banner.result.label, label: "Assessment", tone: banner.result.tone === "ai" ? "ai" : banner.result.tone },
    { key: "method", value: methodLabel, label: "Creation Method", tone: aiEvidence ? "ai" : undefined },
    { key: "prov", value: a.provenance === "CREDENTIALS_PRESENT_UNVERIFIED" ? "Credentials (Unverified)" : a.provenance === "METADATA_INDICATED" ? "Metadata Only" : "Unknown", label: "Provenance" },
    { key: "format", value: formatShort, label: "File Format" },
    { key: "size", value: fmtBytes(d.size), label: "File Size" },
    ...(isAudio ? [] : [{ key: "res", value: d.width && d.height ? `${d.width} × ${d.height}` : null, label: isVideo ? "Resolution" : `Resolution${d.width && d.height ? ` (${((d.width * d.height) / 1e6).toFixed(1)} MP)` : ""}` } as Tile]),
    ...(isVideo || isAudio ? [{ key: "duration", value: fmtDuration(d.durationSec), label: "Duration" } as Tile] : []),
    aiEvidence ? { key: "tool", value: aiTool ? `${aiTool}` : "Not Named", label: "AI Tool (Declared)" } : { key: "camera", value: camera, label: "Camera / Device" },
  ];

  const creationRows: InfoRow[] = [
    { key: "ai", label: "AI Generation", value: null, pill: aiEvidence ? pill(d.c2pa.aiAction && !d.declaredAi.length && !d.aiTools.length ? "Unverified Credential Claim" : "Declared in Metadata", "ai") : pill("No Markers Found", "neutral") },
    { key: "tool", label: "AI Tool Identified", value: aiEvidence ? (aiTool ? tagged(aiTool, "Declared in metadata") : "Not named") : "Not applicable" },
    { key: "model", label: "Model / Version", value: d.aiModel ? tagged(d.aiModel, "Declared in metadata") : aiEvidence ? "Unavailable" : "Not applicable" },
    { key: "prompt", label: "Prompt", value: d.prompt ? `“${d.prompt.slice(0, 140)}${d.prompt.length > 140 ? "…" : ""}” · stored in file` : "Unavailable (not stored in the file)" },
    { key: "capture", label: "Capture Type", value: aiEvidence ? "Not expected (generated)" : camera ? `${isVideo ? "Recording" : "Photograph"} · Inferred from metadata` : "Unknown" },
    { key: "camera", label: "Camera / Device", value: tagged(camera, "Declared in metadata") ?? (swKind === "os" ? `Not available (“${d.software}” is an operating system)` : "Unavailable") },
    { key: "source", label: "Source / Provenance", value: a.provenance === "CREDENTIALS_PRESENT_UNVERIFIED" ? `Content Credentials${d.c2pa.generator ? ` (${d.c2pa.generator})` : ""} · Unverified` : a.provenance === "METADATA_INDICATED" ? "Indicated by metadata · Unverified" : "Unknown" },
    { key: "c2pa", label: "C2PA Validation", value: null, pill: d.c2pa.present ? pill("Not Validated", "neutral") : pill("No Credentials", "neutral") },
    { key: "edit", label: "Editing Detection", value: null, pill: editor ? pill(`Editor Recorded (${editor})`, "warn") : pill("No Editor Recorded · Pixels Not Analysed", "neutral") },
    { key: "date", label: aiEvidence ? "Creation Date" : "Capture Date", value: tagged(date, "Declared in metadata") ?? "Unavailable" },
    { key: "confidence", label: "Provenance Confidence", value: a.confidence[0] + a.confidence.slice(1).toLowerCase() },
  ];
  const q = d.quality ?? null;
  const technical: InfoRow[] = isVideo || isAudio
    ? [
        { key: "name", label: "File Name", value: d.fileName },
        { key: "format", label: "Container", value: `${d.format} · from file signature` },
        ...(isVideo ? [{ key: "vcodec", label: "Video Codec", value: d.videoCodec } as InfoRow] : []),
        { key: "acodec", label: "Audio Codec", value: d.audioCodec },
        ...(isVideo ? [{ key: "res", label: "Resolution", value: res } as InfoRow, { key: "fps", label: "Frame Rate", value: d.frameRate ? `${d.frameRate.toFixed(2)} fps` : null } as InfoRow] : []),
        { key: "bitrate", label: "Bitrate", value: d.bitrate ? `~${(d.bitrate / 1e6).toFixed(1)} Mbps` : null },
        { key: "duration", label: "Duration", value: d.durationSec != null ? `${fmtDuration(d.durationSec)} (${Math.round(d.durationSec)} seconds)` : null },
        { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
        ...(isVideo ? [{ key: "aspect", label: "Aspect Ratio", value: aspect(d.width, d.height) } as InfoRow] : []),
        { key: "device", label: "Camera / Device", value: tagged(camera, "Declared in metadata") },
        { key: "software", label: "Encoder / Software", value: d.software },
        { key: "created", label: "Container Creation Time", value: tagged(date, "Declared in metadata") },
        { key: "gps", label: "GPS Coordinates", value: loc, href: mapHref ?? undefined },
        { key: "c2pa", label: "C2PA Credentials", value: null, pill: d.c2pa.present ? pill("Present · Unverified", "info") : pill("None", "neutral") },
      ]
    : [
        { key: "name", label: "File Name", value: d.fileName },
        { key: "format", label: "File Format", value: `${formatShort === "JPG" ? "JPEG" : formatShort} (${d.mime}) · from file signature` },
        { key: "size", label: "File Size", value: fmtBytes(d.size, true) },
        { key: "dims", label: "Dimensions", value: resolutionLabel(d.width, d.height) },
        { key: "exif", label: "EXIF Data", value: null, pill: d.exifPresent ? pill(`Present${d.exifFields ? ` (${d.exifFields} fields)` : ""}`, "info") : pill("Not Found", "neutral") },
        { key: "iptc", label: "IPTC Data", value: d.iptc ? Object.entries(d.iptc).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ") : null, pill: d.iptc ? undefined : pill("Not Found", "neutral") },
        { key: "xmp", label: "XMP Data", value: d.xmp ? [d.xmp.creatorTool, d.xmp.historyActions.length ? `${d.xmp.historyActions.length} history steps` : null].filter(Boolean).join(" · ") || "Present" : null, pill: d.xmp ? undefined : pill("Not Found", "neutral") },
        { key: "camera", label: "Camera / Device", value: tagged(camera, "Declared in metadata") },
        // Capture settings only when the file has any; otherwise one row says so instead of six empty ones.
        ...(camera || d.lens || d.fNumber || d.exposureTime || d.iso != null || d.focalLength
          ? [
              { key: "lens", label: "Lens", value: d.lens } as InfoRow,
              { key: "aperture", label: "Aperture", value: d.fNumber ? `f/${d.fNumber}` : null } as InfoRow,
              { key: "shutter", label: "Shutter Speed", value: d.exposureTime ? exposure(d.exposureTime) : null } as InfoRow,
              { key: "iso", label: "ISO", value: d.iso != null ? String(d.iso) : null } as InfoRow,
              { key: "focal", label: "Focal Length", value: d.focalLength ? `${Math.round(d.focalLength)} mm` : null } as InfoRow,
            ]
          : [{ key: "exposure", label: "Capture Settings", value: null, pill: pill(aiEvidence ? "Not Expected (Generated)" : "None in Metadata", "neutral") } as InfoRow]),
        ...(d.flash ? [{ key: "flash", label: "Flash", value: d.flash } as InfoRow] : []),
        ...(d.whiteBalance ? [{ key: "wb", label: "White Balance", value: d.whiteBalance } as InfoRow] : []),
        { key: "gps", label: "GPS Coordinates", value: loc, href: mapHref ?? undefined },
        { key: "color", label: "Color Profile", value: d.iccProfile ?? (d.colorSpace ? d.colorSpace.toUpperCase().replace("SRGB", "sRGB") : null) },
        { key: "depth", label: "Bit Depth / Alpha", value: q ? [q.bitDepth ? `${q.bitDepth}-bit` : null, q.hasAlpha ? "alpha channel" : "no alpha"].filter(Boolean).join(" · ") : null },
        { key: "compression", label: "Compression", value: q?.compression ?? null },
        ...(q?.orientation && q.orientation !== 1 ? [{ key: "orientation", label: "Orientation", value: `EXIF ${q.orientation}` } as InfoRow] : []),
        { key: "date", label: "Capture Date", value: tagged(date, "Declared in metadata") },
        ...(d.modifiedAt ? [{ key: "modified", label: "Modification Date", value: fmtDateTime(d.modifiedAt, false) } as InfoRow] : []),
        { key: "software", label: swKind === "os" ? "Operating System (Metadata)" : "Creator Software", value: d.software },
        { key: "c2pa", label: "C2PA Credentials", value: null, pill: d.c2pa.present ? pill("Present · Unverified", "info") : pill("None", "neutral") },
        ...(d.xmp?.digitalSourceType ? [{ key: "dst", label: "Digital Source Type", value: tagged(d.xmp.digitalSourceType, "Declared in metadata") } as InfoRow] : []),
      ];

  const fileTitle = d.fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").trim();
  return {
    isVideo,
    isAudio,
    aiEvidence,
    verdict: a.verdict,
    banner,
    score: { value: score, badge: scoreBadge, text: scoreText, basis: `Provenance confidence starts at 30 and adds only real evidence: ${a.scoreBasis.join("; ") || "none found"}. AI creation and missing EXIF are never penalised; unvalidated credentials cap the score at 85.` },
    coverage: a.coverage,
    confidence: a.confidence,
    formatShort,
    typeLabel: `${Noun} File (${formatShort})`,
    title: fileTitle ? fileTitle[0].toUpperCase() + fileTitle.slice(1) : d.fileName,
    description: [res, d.durationSec != null ? fmtDuration(d.durationSec) : null, isVideo && d.frameRate ? `${Math.round(d.frameRate)} fps` : null, isVideo ? d.videoCodec : null].filter(Boolean).join(" · ") || d.format,
    byLine: aiEvidence ? (aiTool ? `AI (${aiTool}, declared)` : "AI (declared)") : camera ? `${camera} (metadata)` : null,
    dateLabel: aiEvidence ? "Created" : isVideo ? "Recorded" : "Captured",
    date: aiEvidence ? fmtDate(d.capturedAt) : date,
    location: loc,
    mapHref,
    size: fmtBytes(d.size),
    creationChip,
    tiles,
    checks,
    creation: {
      headline: aiEvidence ? pill("AI-Generated (Declared)", "ai") : camera ? pill(isVideo ? "Camera Recording (Indicated)" : "Camera Capture (Indicated)", "good") : editor ? pill("Edited", "warn") : pill("Unknown", "neutral"),
      text: aiEvidence
        ? `The metadata declares generative AI. That's how it was made, not a judgement of authenticity.`
        : camera
          ? `Metadata names ${camera}. EXIF is editable, so this is an indication, not proof.`
          : `No camera metadata, credentials or AI markers. No AI markers doesn't mean human-made.`,
      rows: creationRows,
    },
    technicalTitle: isVideo || isAudio ? "Technical Metadata (Container)" : "Technical Metadata",
    technical,
    sections: { found: a.found, couldNotVerify: a.couldNotVerify, actions: a.actions },
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
