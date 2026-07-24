/**
 * Creator commerce automations — local visual builder state.
 * Additive; does not replace webhook or edge workflows.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AUTOMATION_STEP_KINDS = [
  "new_purchase",
  "grant_membership",
  "unlock_course",
  "send_welcome",
  "recommend_affiliate",
  "invite_community",
  "schedule_followup",
] as const;

export type AutomationStepKind = (typeof AUTOMATION_STEP_KINDS)[number];

export const AUTOMATION_STEP_LABELS: Record<AutomationStepKind, string> = {
  new_purchase: "New purchase",
  grant_membership: "Grant membership",
  unlock_course: "Unlock course",
  send_welcome: "Send welcome",
  recommend_affiliate: "Recommend affiliate products",
  invite_community: "Invite to community",
  schedule_followup: "Schedule follow-up",
};

export type CommerceAutomation = {
  id: string;
  communityId: string;
  name: string;
  enabled: boolean;
  steps: AutomationStepKind[];
  updatedAt: string;
};

type AutomationsState = {
  flows: CommerceAutomation[];
  upsertFlow: (flow: CommerceAutomation) => void;
  toggleFlow: (id: string) => void;
  setSteps: (id: string, steps: AutomationStepKind[]) => void;
  removeFlow: (id: string) => void;
  flowsForCommunity: (communityId: string) => CommerceAutomation[];
};

function uid() {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_PURCHASE_FLOW_STEPS: AutomationStepKind[] = [
  "new_purchase",
  "grant_membership",
  "unlock_course",
  "send_welcome",
  "recommend_affiliate",
  "invite_community",
  "schedule_followup",
];

export function createDefaultPurchaseFlow(
  communityId: string
): CommerceAutomation {
  return {
    id: uid(),
    communityId,
    name: "New purchase → onboard",
    enabled: true,
    steps: [...DEFAULT_PURCHASE_FLOW_STEPS],
    updatedAt: new Date().toISOString(),
  };
}

export const useCommerceAutomationsStore = create<AutomationsState>()(
  persist(
    (set, get) => ({
      flows: [],
      upsertFlow(flow) {
        set((s) => ({
          flows: [
            { ...flow, updatedAt: new Date().toISOString() },
            ...s.flows.filter((f) => f.id !== flow.id),
          ],
        }));
      },
      toggleFlow(id) {
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === id
              ? {
                  ...f,
                  enabled: !f.enabled,
                  updatedAt: new Date().toISOString(),
                }
              : f
          ),
        }));
      },
      setSteps(id, steps) {
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === id
              ? { ...f, steps, updatedAt: new Date().toISOString() }
              : f
          ),
        }));
      },
      removeFlow(id) {
        set((s) => ({ flows: s.flows.filter((f) => f.id !== id) }));
      },
      flowsForCommunity(communityId) {
        return get().flows.filter((f) => f.communityId === communityId);
      },
    }),
    {
      name: "jimvio-commerce-automations-v1",
      partialize: (s) => ({ flows: s.flows }),
    }
  )
);
