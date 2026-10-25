import type { AdProposal } from "./types";

export function proposeCampaign(input: {
  landingPath: string;
  now: Date;
  accountConnected: boolean;
}): AdProposal {
  return {
    id: `ads-${input.landingPath.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "") || "home"}`,
    landingPath: input.landingPath,
    status: "proposal",
    spendEnabled: false,
    submitted: false,
    estimatedCostUsd: null,
    costBasis: "unknown",
    copy: [
      "Show the existing Jimvio page without a new earnings promise.",
      "Use the page title and description that are already published.",
      "Do not target with data this engine did not receive from an authorized ads account.",
    ],
    targeting: "No targeting list is generated. An authorized account and a reviewed audience are required first.",
    reason: input.accountConnected
      ? "An ads environment name is present, but this engine still cannot submit or spend. Budget, duration, and targeting need a person."
      : "No ads account is connected, so no platform cost was read and no campaign was created.",
    createdAt: input.now.toISOString(),
  };
}
