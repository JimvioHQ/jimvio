export const SUPPORT_AGENT_ROLES = ["customer_support", "senior_support"] as const;
export type SupportAgentRole = (typeof SUPPORT_AGENT_ROLES)[number];

export function supportRoleLabel(role: string | null | undefined) {
  if (role === "senior_support") return "Senior Support Agent";
  return "Customer Support Agent";
}

export function agentDisplayName(input: {
  displayName?: string | null;
  fullName?: string | null;
  email?: string | null;
}) {
  const configured = input.displayName?.replace(/\s+/g, " ").trim();
  if (configured && configured.length >= 2) return configured.slice(0, 80);
  const full = input.fullName?.replace(/\s+/g, " ").trim();
  if (full && full.length >= 2) return full.slice(0, 80);
  const local = input.email?.split("@")[0]?.replace(/[^\w.\- ]/g, "").trim();
  if (local && local.length >= 2) return local.slice(0, 80);
  return "Jimvio Support";
}

export function agentJoinedMessage(displayName: string) {
  return `${agentDisplayName({ displayName })} from Jimvio Support has joined the conversation.`;
}

export function agentGreetingDraft(displayName: string) {
  const name = agentDisplayName({ displayName });
  return `Hi! I'm ${name} from Jimvio Support. I've joined the conversation. How can I help you further?`;
}

export function parseSupportRole(value: unknown): SupportAgentRole {
  return value === "senior_support" ? "senior_support" : "customer_support";
}
