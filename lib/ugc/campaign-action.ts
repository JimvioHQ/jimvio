export type CampaignActionInput = {
  campaignId: string;
  status: string;
  joinMode: string | null | undefined;
  participantStatus: string | null;
  submissionStatus: string | null;
  endsAt?: string | null;
  countryDecision: "allowed" | "blocked" | "unknown" | "unchecked";
};

export type CampaignAction = {
  label: string;
  href: string | null;
  enabled: boolean;
};

export function resolveCampaignPrimaryAction(input: CampaignActionInput): CampaignAction {
  const id = input.campaignId;
  const ended = Boolean(input.endsAt && new Date(input.endsAt).getTime() < Date.now());
  const joined = input.participantStatus === "accepted";
  const pending = input.participantStatus === "pending" || input.participantStatus === "waitlisted";
  const invited = input.participantStatus === "invited";

  if (input.status === "paused") {
    return { label: "Campaign paused", href: null, enabled: false };
  }
  if (input.status === "completed" || input.status === "cancelled" || ended) {
    return { label: "Campaign closed", href: null, enabled: false };
  }
  if (input.status !== "active") {
    return { label: "Not open", href: null, enabled: false };
  }
  if (input.participantStatus === "rejected" || input.participantStatus === "banned") {
    return { label: "Not accepted", href: `/ugc/${id}/application`, enabled: true };
  }
  if (pending) {
    return { label: "View application", href: `/ugc/${id}/application`, enabled: true };
  }
  if (input.joinMode === "invite_only" && !joined && !invited) {
    return { label: "Invite only", href: null, enabled: false };
  }
  if (!joined && !invited && input.countryDecision === "blocked") {
    return { label: "Not available in your country", href: null, enabled: false };
  }
  if (!joined && !invited && input.countryDecision === "unknown") {
    return { label: "Country not verified", href: null, enabled: false };
  }
  if (!joined && !invited) {
    const apply = input.joinMode === "application" || input.joinMode === "hybrid";
    return {
      label: apply ? "Apply now" : "Join campaign",
      href: `/ugc/${id}/join`,
      enabled: true,
    };
  }
  if (!input.submissionStatus) {
    return { label: "Create Submission", href: `/ugc/${id}/submit`, enabled: true };
  }
  if (input.submissionStatus === "pending" || input.submissionStatus === "revision_requested") {
    return { label: "Continue Creating", href: `/ugc/${id}/dashboard`, enabled: true };
  }
  return { label: "View submission", href: `/ugc/${id}/dashboard`, enabled: true };
}
