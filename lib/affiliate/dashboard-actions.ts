import { WORKSPACES } from "@/lib/workspace/config";

/** Presentation labels for the dashboard quick actions. Hrefs come from the affiliate sidebar. */
const QUICK_ACTION_SPECS = [
  { id: "products", label: "Discover Products" },
  { id: "links", label: "My Affiliate Links" },
  { id: "earnings", label: "Earnings" },
  { id: "payouts", label: "Payouts" },
] as const;

export type AffiliateQuickActionId = (typeof QUICK_ACTION_SPECS)[number]["id"];

export type AffiliateQuickAction = {
  id: AffiliateQuickActionId;
  label: string;
  href: string;
};

/** Real affiliate routes only. Missing sidebar items fail closed instead of inventing a path. */
export function affiliateQuickActions(): AffiliateQuickAction[] {
  const sidebar = WORKSPACES.affiliates.sidebar ?? [];
  return QUICK_ACTION_SPECS.map((spec) => {
    const item = sidebar.find((entry) => entry.id === spec.id);
    if (!item?.href?.startsWith("/affiliates")) {
      throw new Error(`Missing affiliate route for ${spec.id}`);
    }
    return { id: spec.id, label: spec.label, href: item.href };
  });
}
