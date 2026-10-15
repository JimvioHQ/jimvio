export const PHYSICAL_SELLER_SUPPORT_SUBJECT = "Physical product seller verification";

export type PhysicalSellingStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export function physicalSellingStatus(input: {
  verification_status?: string | null;
  physical_selling_requested_at?: string | null;
}): PhysicalSellingStatus {
  const status = String(input.verification_status || "").trim().toLowerCase();
  if (status === "verified" || status === "approved") return "approved";
  if (status === "rejected" || status === "declined" || status === "failed") return "rejected";
  if (status === "suspended" || status === "revoked") return "suspended";
  if (input.physical_selling_requested_at) return "pending";
  return "not_requested";
}

export function physicalSellingCustomerCopy(status: PhysicalSellingStatus): {
  key: "not_started" | "in_progress" | "in_review" | "verified" | "failed" | "expired";
  label: string;
  verified: boolean;
  phase: "not_requested" | "pending" | "verified" | "rejected" | "suspended";
} {
  if (status === "approved") {
    return { key: "verified", label: "Business verified", verified: true, phase: "verified" };
  }
  if (status === "pending") {
    return { key: "in_review", label: "Business verification in review", verified: false, phase: "pending" };
  }
  if (status === "rejected") {
    return { key: "failed", label: "Changes required", verified: false, phase: "rejected" };
  }
  if (status === "suspended") {
    return { key: "expired", label: "Physical selling is suspended", verified: false, phase: "suspended" };
  }
  return { key: "not_started", label: "Business verification required", verified: false, phase: "not_requested" };
}

/** Support ticket route. Query values are non-secret labels only. */
export function physicalSellerSupportHref(): string {
  const params = new URLSearchParams({
    subject: PHYSICAL_SELLER_SUPPORT_SUBJECT,
    category: "selling",
    issueType: "account",
    description:
      "Please review my seller account for physical product selling. I am requesting business verification.",
  });
  return `/help/tickets/new?${params.toString()}`;
}

export function isPhysicalSellerSupportSubject(subject: string | null | undefined): boolean {
  return String(subject || "").trim().toLowerCase() === PHYSICAL_SELLER_SUPPORT_SUBJECT.toLowerCase();
}
