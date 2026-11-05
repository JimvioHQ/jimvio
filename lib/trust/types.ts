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
  webRisk: { status: ReputationStatus; threats: string[]; reason?: string | null; note?: string | null };
  phishingList: { status: ReputationStatus; match: string | null };
  officialPlatform: string | null;
  /** Added Nov 2026. */
  nameservers?: string[];
  network?: { network: string | null; org: string | null; country: string | null; range: string | null } | null;
  /** Whether the destination page itself could be read (not a login wall, error or block). */
  contentInspected?: boolean;
  contentBlockedReason?: string | null;
  fetchError?: string | null;
  /** The single authoritative verdict (see lib/trust/link-assessment.ts). */
  assessment?: LinkAssessment;
};

export type CheckExecution = "CLEAN" | "THREAT_DETECTED" | "SUSPICIOUS" | "INCONCLUSIVE" | "NOT_CHECKED" | "UNAVAILABLE" | "FAILED";
export type AssessmentState = "NO_KNOWN_THREATS" | "INCOMPLETE_ASSESSMENT" | "THREAT_DETECTED" | "SUSPICIOUS_ACTIVITY" | "WEBSITE_UNREACHABLE" | "SCAN_FAILED";

export type SecurityCheck = {
  id: string;
  name: string;
  status: CheckExecution;
  severity: "none" | "low" | "medium" | "high" | "critical";
  critical: boolean;
  source: string;
  explanation: string;
  evidence: string[];
};

export type LinkAssessment = {
  model: string;
  state: AssessmentState;
  riskScore: number;
  riskClass: "Very Low Observed Risk" | "Low Observed Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";
  coverage: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  checks: SecurityCheck[];
  counts: { completed: number; threats: number; suspicious: number; unavailable: number; notExecuted: number };
  found: string[];
  couldNotVerify: string[];
  actions: string[];
  topFinding: string | null;
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
  /** Added Nov 2026: where each number comes from. */
  metricClass?: Partial<Record<"views" | "likes" | "comments" | "followers" | "totalViews" | "posts" | "genuine" | "suspicious", "PLATFORM_REPORTED" | "OWNER_VERIFIED" | "ESTIMATED" | "UNAVAILABLE">>;
  /** Evidence-based range, never an exact count (see lib/trust/engagement-estimate.ts). */
  estimate?: import("./engagement-estimate").ViewEstimate | null;
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
  /** Added Nov 2026 (product-verification-v2). */
  firstSeenAt?: string | null;
  inferredTitle?: { value: string; source: string } | null;
  pdf?: {
    security: { javascript: number; launch: number; openActionKind: string | null; additionalActions: number; embeddedFiles: number; uriActions: number; externalHosts: string[]; submitForm: number; richMedia: number; xfa: boolean; encrypted: boolean; malformedStreams: number };
    pages: { total: number; withText: number; imageOnly: number; blank: number; failed: number; processed: number; duplicatePages: number; coverage: number; truncated: boolean };
    outlineChapters: number;
    parseError: string | null;
  } | null;
  textChapters?: number;
  isbn?: string | null;
  linkCheck?: { status: "clean" | "match" | "unavailable" | "none"; matches: string[] };
  claims?: { bad: number; warn: number };
  jimvio?: { verifiedSeller: boolean; approved: boolean } | null;
  similarProducts?: string[];
  assessment?: ProductAssessment;
};

export type ProductCheckStatus = "PASS" | "INFO" | "REVIEW" | "RISK" | "NOT_CHECKED" | "UNAVAILABLE" | "FAILED";
export type ProductCheck = {
  id: string;
  group: "security" | "authenticity" | "authorship" | "rights" | "content" | "seller";
  name: string;
  status: ProductCheckStatus;
  /** Short result shown on the pill, e.g. "None Found", "Metadata Found". */
  label: string;
  explanation: string;
  evidence: string[];
  source: string;
  critical: boolean;
};
export type ProductVerdict = "VERIFIED" | "NEEDS_REVIEW" | "POTENTIAL_RISK_DETECTED" | "VERIFICATION_INCOMPLETE" | "UNABLE_TO_VERIFY" | "SCAN_FAILED";
export type FileSafetyStatus = "CLEAN" | "MALWARE_DETECTED" | "SUSPICIOUS" | "SCAN_FAILED" | "SCAN_UNAVAILABLE" | "INCONCLUSIVE" | "NOT_CHECKED";
export type ProductAssessment = {
  model: string;
  verdict: ProductVerdict;
  fileSafety: FileSafetyStatus;
  authorship: "AUTHORSHIP_METADATA_FOUND" | "AUTHORSHIP_SOURCE_VERIFIED" | "AUTHORSHIP_UNVERIFIED" | "INSUFFICIENT_EVIDENCE";
  rights: "LICENSE_FOUND" | "COPYRIGHT_NOTICE_FOUND" | "PUBLIC_DOMAIN_EVIDENCE_FOUND" | "PUBLISHER_AUTHORIZATION_FOUND" | "RIGHTS_UNCLEAR" | "RIGHTS_NOT_ASSESSED" | "POSSIBLE_UNAUTHORIZED_DISTRIBUTION";
  content: "CONTENT_QUALITY_ACCEPTABLE" | "CONTENT_READABLE" | "CONTENT_INCOMPLETE" | "CONTENT_EXTRACTION_FAILED" | "CONTENT_QUALITY_ISSUES_FOUND" | "CONTENT_NOT_ASSESSED";
  scoreState: "SCORED" | "NOT_SCORED" | "INCOMPLETE";
  score: number | null;
  coverage: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  checks: ProductCheck[];
  found: string[];
  couldNotVerify: string[];
  actions: string[];
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
  c2pa: { present: boolean; generator: string | null; aiAction: boolean; assertions?: string[] };
  declaredAi: string[];
  aiTools: string[];
  prompt: string | null;
  copyright: string | null;
  artist: string | null;
  duplicate: { count: number; near: boolean; firstSeenAt: string | null } | null;
  /** Added Nov 2026 (media-provenance-v2). */
  exifFields?: number;
  iptc?: Record<string, string> | null;
  xmp?: { creatorTool: string | null; historyActions: string[]; digitalSourceType: string | null; createDate: string | null; modifyDate: string | null; rights: string | null; license: string | null } | null;
  aiModel?: string | null;
  quality?: { bitDepth: number | null; hasAlpha: boolean; frames: number | null; compression: string | null; sharpness: number | null; entropy: number | null; orientation: number | null; density: number | null } | null;
  integrityIssue?: string | null;
  metadataConflicts?: string[];
  exactSeen?: number;
  digitizedAt?: string | null;
  modifiedAt?: string | null;
  flash?: string | null;
  whiteBalance?: string | null;
  assessment?: MediaAssessment;
};

export type MediaCheckStatus = "VERIFIED" | "DETECTED" | "NOT_FOUND" | "NOT_AVAILABLE" | "NOT_CHECKED" | "INCONCLUSIVE" | "FAILED" | "UNAVAILABLE" | "NOT_APPLICABLE";
export type MediaCheck = {
  id: string;
  name: string;
  status: MediaCheckStatus;
  /** Display tone for the pill: what the finding means, separate from whether the check ran. */
  tone: "good" | "info" | "warn" | "bad" | "neutral" | "ai";
  label: string;
  explanation: string;
  evidence: string[];
  source: string;
};
export type MediaAssessment = {
  model: string;
  verdict: "AI_GENERATED_DECLARED" | "CREDENTIALS_UNVERIFIED" | "CAMERA_ORIGIN_INDICATED" | "EDITED_RECORDED" | "PREVIOUSLY_SEEN" | "ORIGIN_UNKNOWN" | "INTEGRITY_ISSUE" | "SCAN_FAILED";
  creationMethod: "AI_GENERATED" | "AI_EDITED" | "EDITED" | "CAMERA_INDICATED" | "UNKNOWN";
  creation: "AI_GENERATION_CONFIRMED_BY_VALID_PROVENANCE" | "AI_GENERATION_INDICATED_BY_METADATA" | "AI_GENERATION_SUSPECTED" | "NO_AI_MARKERS_FOUND" | "INCONCLUSIVE" | "NOT_ASSESSED";
  provenance: "VERIFIED_PROVENANCE" | "CREDENTIALS_PRESENT_UNVERIFIED" | "METADATA_INDICATED" | "SOURCE_IDENTIFIED" | "ORIGIN_UNKNOWN" | "NO_PROVENANCE_FOUND" | "INSUFFICIENT_EVIDENCE";
  manipulation: "EDITING_SOFTWARE_RECORDED" | "EDITING_HISTORY_FOUND" | "POSSIBLE_MANIPULATION" | "STRONG_MANIPULATION_INDICATORS" | "NO_MANIPULATION_EVIDENCE_FOUND" | "NOT_ASSESSED" | "INCONCLUSIVE";
  rights: "LICENSE_VERIFIED" | "LICENSE_DECLARED_UNVERIFIED" | "COPYRIGHT_NOTICE_FOUND" | "RIGHTS_UNCLEAR" | "RIGHTS_NOT_ASSESSED" | "HUMAN_REVIEW_REQUIRED";
  integrity: "PASSED" | "ISSUE" | "FAILED";
  scoreState: "SCORED" | "NOT_SCORED";
  score: number | null;
  scoreBasis: string[];
  coverage: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  checks: MediaCheck[];
  found: string[];
  couldNotVerify: string[];
  actions: string[];
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
