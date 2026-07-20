export type WelcomeIntent = "browse" | "create" | "sell" | "join";
export type ChecklistEntry = { done: boolean; at?: string };
export type Checklist = Record<string, ChecklistEntry>;
export type ChecklistItem = { key: string; label: string; href: string };

const CHECKLISTS: Record<WelcomeIntent, ChecklistItem[]> = {
  browse: [
    { key: "browse_marketplace", label: "Explore the marketplace", href: "/marketplace" },
    { key: "browse_communities", label: "Find a community", href: "/communities" },
    { key: "browse_shorts", label: "Watch shorts", href: "/shorts" },
  ],
  create: [
    { key: "open_creator_hub", label: "Open your creator hub", href: "/creator" },
    { key: "create_community", label: "Create a community", href: "/communities/create" },
    { key: "activate_creator", label: "Activate your creator role", href: "/dashboard/activate/influencer" },
  ],
  sell: [
    { key: "activate_vendor", label: "Start your vendor application", href: "/dashboard/activate/vendor" },
    { key: "open_vendor_dashboard", label: "Open your vendor dashboard", href: "/dashboard/vendor" },
  ],
  join: [
    { key: "explore_communities", label: "Explore communities", href: "/communities" },
    { key: "join_a_community", label: "Join a community", href: "/communities" },
  ],
};

export function listChecklistForIntent(intent: WelcomeIntent): ChecklistItem[] {
  return CHECKLISTS[intent];
}

export function computeProgress(checklist: Checklist, intent: WelcomeIntent | null | undefined): number {
  if (!intent) return 0;
  const items = listChecklistForIntent(intent);
  return items.length ? Math.round((items.filter((item) => checklist[item.key]?.done).length / items.length) * 100) : 0;
}
