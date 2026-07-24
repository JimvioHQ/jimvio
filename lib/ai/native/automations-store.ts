/**
 * AI automations — local workflow store (additive).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiAutomationFlow, AiAutomationTrigger } from "./types";

const TRIGGER_LABELS: Record<AiAutomationTrigger, string> = {
  member_joins: "When someone joins my community…",
  product_sells: "When a product sells…",
  engagement_drops: "When engagement drops…",
  campaign_finishes: "When a campaign finishes…",
};

const DEFAULT_STEPS: Record<AiAutomationTrigger, string[]> = {
  member_joins: [
    "Send welcome message",
    "Unlock starter course",
    "Recommend top channel",
  ],
  product_sells: [
    "Grant membership",
    "Send receipt + next offer",
    "Invite to community",
  ],
  engagement_drops: [
    "Draft re-engagement post",
    "Suggest a live session",
    "Notify moderators",
  ],
  campaign_finishes: [
    "Request testimonials",
    "Release payout checklist",
    "Recommend next campaign",
  ],
};

type State = {
  flows: AiAutomationFlow[];
  ensureDefaults: (communityId: string) => void;
  toggle: (id: string) => void;
  flowsFor: (communityId: string) => AiAutomationFlow[];
};

function uid() {
  return `ai-auto-${Date.now().toString(36)}`;
}

export function triggerLabel(t: AiAutomationTrigger) {
  return TRIGGER_LABELS[t];
}

export const useAiAutomationsStore = create<State>()(
  persist(
    (set, get) => ({
      flows: [],
      ensureDefaults(communityId) {
        const existing = get().flows.filter((f) => f.id.includes(communityId));
        if (existing.length > 0) return;
        const seeded: AiAutomationFlow[] = (
          Object.keys(DEFAULT_STEPS) as AiAutomationTrigger[]
        ).map((trigger) => ({
          id: `${uid()}-${communityId}-${trigger}`,
          name: TRIGGER_LABELS[trigger],
          trigger,
          steps: DEFAULT_STEPS[trigger],
          enabled: trigger === "member_joins" || trigger === "product_sells",
        }));
        set((s) => ({ flows: [...seeded, ...s.flows] }));
      },
      toggle(id) {
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === id ? { ...f, enabled: !f.enabled } : f
          ),
        }));
      },
      flowsFor(communityId) {
        return get().flows.filter((f) => f.id.includes(communityId));
      },
    }),
    {
      name: "jimvio-ai-automations-v1",
      partialize: (s) => ({ flows: s.flows }),
    }
  )
);
