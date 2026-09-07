import type { UGCCampaignStatus } from "@/types/ugc";

const ALLOWED: ReadonlySet<string> = new Set(["draft", "paused"]);
const TERMINAL: ReadonlySet<string> = new Set(["completed", "cancelled"]);

export function canAdminActivateOverride(status: string | null | undefined): boolean {
  return typeof status === "string" && ALLOWED.has(status);
}

export function adminActivateOverrideError(
  status: string | null | undefined,
): { status: number; error: string } | null {
  if (!status) {
    return { status: 404, error: "Campaign not found." };
  }
  if (status === "active") return null;
  if (TERMINAL.has(status)) {
    return {
      status: 409,
      error: `${status === "completed" ? "Completed" : "Cancelled"} campaigns cannot be activated.`,
    };
  }
  if (ALLOWED.has(status)) return null;
  return { status: 409, error: "This campaign cannot be activated from its current state." };
}

export function isAdminActivateIdempotent(status: UGCCampaignStatus | string | null | undefined): boolean {
  return status === "active";
}

export function normalizeAdminActivateReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 500);
  return trimmed.length ? trimmed : null;
}
