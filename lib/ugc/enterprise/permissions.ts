export type BrandRole = "owner" | "manager" | "reviewer" | "finance" | "viewer";

const ROLE_PERMS: Record<BrandRole, Set<string>> = {
  owner: new Set([
    "campaigns.manage",
    "campaigns.review",
    "creators.invite",
    "finance.view",
    "finance.payout",
    "team.manage",
    "automations.manage",
    "webhooks.manage",
    "contracts.manage",
    "disputes.manage",
  ]),
  manager: new Set([
    "campaigns.manage",
    "campaigns.review",
    "creators.invite",
    "finance.view",
    "automations.manage",
    "contracts.manage",
    "disputes.manage",
  ]),
  reviewer: new Set(["campaigns.review", "creators.invite", "contracts.manage"]),
  finance: new Set(["finance.view", "finance.payout", "disputes.manage"]),
  viewer: new Set(["finance.view"]),
};

export function roleCan(role: BrandRole, permission: string) {
  return ROLE_PERMS[role]?.has(permission) ?? false;
}

export function defaultPermissions(role: BrandRole) {
  return Array.from(ROLE_PERMS[role] ?? []);
}
