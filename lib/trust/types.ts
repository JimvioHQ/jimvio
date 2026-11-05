/** Shared shapes for Jimvio Trust Checker scans. */

export type CheckerId = "links" | "engagement" | "product" | "media";

export type FindingTone = "good" | "info" | "warn" | "bad";

export type Finding = {
  tone: FindingTone;
  title: string;
  detail?: string;
  /** Where the evidence came from, e.g. "DNS", "Google Web Risk", "File signature". */
  source: string;
};

export type CheckerStatus =
  | "known_threat"
  | "high_risk"
  | "suspicious"
  | "evidence_found"
  | "low_risk"
  | "inconclusive"
  | "unavailable"
  | "not_applicable";

export type CheckerResult = {
  id: CheckerId;
  status: CheckerStatus;
  summary: string;
  findings: Finding[];
  metrics: { label: string; value: string }[];
  sources: string[];
  limits: string[];
  nextSteps: string[];
  /** Structured evidence for the category's result page (reports from Nov 2026 on). null = unknown. */
  details?: CheckerDetails;
};

/** Which single result experience a scan opens. */
export type ScanCategory = CheckerId | "unsupported";

export type ReputationStatus = "match" | "clean" | "unavailable";

export type LinkDetails = {
  kind: "links";
  submittedUrl: string;
  finalUrl: string | null;
  domain: string | null;
  registeredAt: string | null;
  ageDays: number | null;
  registrar: string | null;
  ip: string | null;
  httpStatus: number | null;
  contentType: string | null;
  pageFetched: boolean;
  redirects: { url: string; status: number }[];
  tls: { status: "valid" | "invalid" | "not_https" | "unavailable"; issuer: string | null; validTo: string | null; daysLeft: number | null };
  webRisk: { status: ReputationStatus; threats: string[] };
  phishingList: { status: ReputationStatus; match: string | null };
  officialPlatform: string | null;
};

export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "facebook" | "x" | "threads";

export type EngagementDetails = {
  kind: "engagement";
  platform: SocialPlatform;
  contentType: "video" | "short" | "channel" | "post" | "reel";
  url: string;
  /** Whether the platform returned this content at all. */
  found: boolean;
  title: string | null;
  caption: string | null;
  authorName: string | null;
  authorHandle: string | null;
  authorUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSec: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementRate: number | null;
  account: {
    createdAt: string | null;
    followers: number | null;
    followersHidden: boolean;
    totalViews: number | null;
    totalLikes: number | null;
    posts: number | null;
    country: string | null;
    verified: boolean | null;
    visibility: string | null;
  };
  visibility: string | null;
  verdict: "real" | "review" | "suspicious" | "too_early" | null;
  commentsRead: number;
  /** Why numbers are missing, in plain words. */
  accessNote: string | null;
};

export type ProductType = "ebook" | "book" | "document" | "template" | "spreadsheet" | "presentation" | "archive" | "software" | "text";

export type ProductDetails = {
  kind: "product";
  fileName: string | null;
  size: number | null;
  format: string | null;
  mime: string | null;
  productType: ProductType;
  /** What the product type was decided from. */
  productTypeBasis: string;
  title: string | null;
  author: string | null;
  subject: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  pages: number | null;
  producer: string | null;
  creator: string | null;
  textReadable: boolean;
  wordCount: number | null;
  copyrightNotice: string | null;
  license: "commercial" | "creative_commons" | "all_rights_reserved" | "resell_rights" | "personal_use" | null;
  aiToolInMetadata: string | null;
  seenBefore: number;
  marketplaceDuplicates: string[];
  sellerPage: { url: string; hasContact: boolean; hasRefund: boolean; hasPrivacy: boolean; domainAgeDays: number | null } | null;
};

export type MediaDetails = {
  kind: "media";
  mediaType: "image" | "video" | "audio";
  fileName: string;
  size: number;
  format: string;
  mime: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  bitrate: number | null;
  colorSpace: string | null;
  iccProfile: string | null;
  exifPresent: boolean;
  make: string | null;
  model: string | null;
  lens: string | null;
  fNumber: number | null;
  exposureTime: number | null;
  iso: number | null;
  focalLength: number | null;
  capturedAt: string | null;
  gps: { lat: number; lon: number } | null;
  software: string | null;
  editingSoftware: string | null;
  c2pa: { present: boolean; generator: string | null; aiAction: boolean };
  declaredAi: string[];
  aiTools: string[];
  prompt: string | null;
  copyright: string | null;
  artist: string | null;
  duplicate: { count: number; near: boolean; firstSeenAt: string | null } | null;
};

export type CheckerDetails = LinkDetails | EngagementDetails | ProductDetails | MediaDetails;

export type OverallLevel = "known_threat" | "high_risk" | "suspicious" | "low_risk" | "inconclusive";

export type ScanInputMeta = {
  url: string | null;
  file: { name: string; size: number; type: string; sha256: string } | null;
};

export type ScanReport = {
  id: string;
  createdAt: string;
  status: "complete" | "failed";
  input: ScanInputMeta;
  overall: { level: OverallLevel; headline: string };
  checkers: CheckerResult[];
  durationMs: number;
  /** The one result experience to show. Older reports omit it. */
  category?: ScanCategory;
  unsupportedReason?: string;
};

export const CHECKER_LABELS: Record<CheckerId, string> = {
  links: "Scam & Malicious Link Detection",
  engagement: "Engagement & Traffic Detection",
  product: "Digital Product Verification",
  media: "Media Metadata & Provenance",
};

const RANK: Record<CheckerStatus, number> = {
  known_threat: 6,
  high_risk: 5,
  suspicious: 4,
  evidence_found: 3,
  inconclusive: 2,
  low_risk: 1,
  unavailable: 0,
  not_applicable: -1,
};

/** Worst applicable result decides; missing data never becomes "safe". */
export function overallFrom(checkers: CheckerResult[]): ScanReport["overall"] {
  const ran = checkers.filter((c) => c.status !== "not_applicable");
  if (ran.length === 0) return { level: "inconclusive", headline: "Nothing could be checked for this input." };
  const worst = ran.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));
  switch (worst.status) {
    case "known_threat":
      return { level: "known_threat", headline: "Known threat detected. Do not open, pay or download." };
    case "high_risk":
      return { level: "high_risk", headline: "High risk. Several strong warning signs were found." };
    case "suspicious":
    case "evidence_found":
      return { level: "suspicious", headline: "Suspicious signals found. Review the evidence before you trust it." };
    case "low_risk":
      return ran.every((c) => c.status === "low_risk")
        ? { level: "low_risk", headline: "Low risk. No known threats or strong warning signs were found." }
        : { level: "inconclusive", headline: "No strong warnings, but some checks could not be completed." };
    default:
      return { level: "inconclusive", headline: "Inconclusive. Jimvio could not get enough evidence to judge this." };
  }
}

export function emptyChecker(id: CheckerId, reason: string): CheckerResult {
  return { id, status: "not_applicable", summary: reason, findings: [], metrics: [], sources: [], limits: [], nextSteps: [] };
}
