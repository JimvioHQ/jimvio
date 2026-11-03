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
};

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
