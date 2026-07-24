/**
 * Brand CRM + campaign workspace — local additive stores.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CreatorOpportunity, OpportunityStatus } from "./types";

export type BrandShortlistEntry = {
  id: string;
  creatorId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  note: string;
  addedAt: string;
  communityId: string;
};

export type CampaignWorkspace = {
  opportunityId: string;
  communityId: string;
  status: OpportunityStatus;
  tasks: string[];
  deliverables: string[];
  timeline: string[];
  files: string[];
  messages: string[];
  feedback: string[];
  approval: "pending" | "approved" | "changes_requested";
  payoutStatus: "not_started" | "pending" | "released";
  progress: number;
  updatedAt: string;
};

type BrandCrmState = {
  shortlists: BrandShortlistEntry[];
  workspaces: CampaignWorkspace[];
  addToShortlist: (entry: Omit<BrandShortlistEntry, "id" | "addedAt">) => void;
  removeFromShortlist: (id: string) => void;
  inviteCreator: (id: string) => void;
  upsertWorkspace: (ws: CampaignWorkspace) => void;
  setApproval: (
    opportunityId: string,
    approval: CampaignWorkspace["approval"]
  ) => void;
  releasePayout: (opportunityId: string) => void;
  shortlistForCommunity: (communityId: string) => BrandShortlistEntry[];
  workspaceFor: (opportunityId: string) => CampaignWorkspace | undefined;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildWorkspaceFromOpportunity(
  communityId: string,
  opp: CreatorOpportunity
): CampaignWorkspace {
  return {
    opportunityId: opp.id,
    communityId,
    status: opp.status === "open" ? "in_progress" : opp.status,
    tasks: [
      "Review brief",
      "Draft outline",
      "Produce first cut",
      "Submit for approval",
    ],
    deliverables: opp.requirements.slice(0, 3),
    timeline: [
      `Deadline ${opp.deadline}`,
      "Kickoff today",
      "Mid-check in 3 days",
      "Final submission before deadline",
    ],
    files: ["Brief.pdf", "Brand kit.zip"],
    messages: ["Brand: Looking forward to your first draft."],
    feedback: [],
    approval: "pending",
    payoutStatus: "not_started",
    progress: opp.status === "open" ? 12 : 35,
    updatedAt: new Date().toISOString(),
  };
}

export const useBrandCrmStore = create<BrandCrmState>()(
  persist(
    (set, get) => ({
      shortlists: [],
      workspaces: [],
      addToShortlist(entry) {
        const id = uid("sl");
        set((s) => ({
          shortlists: [
            {
              ...entry,
              id,
              addedAt: new Date().toISOString(),
            },
            ...s.shortlists.filter(
              (x) =>
                !(
                  x.creatorId === entry.creatorId &&
                  x.communityId === entry.communityId
                )
            ),
          ],
        }));
      },
      removeFromShortlist(id) {
        set((s) => ({ shortlists: s.shortlists.filter((x) => x.id !== id) }));
      },
      inviteCreator(id) {
        set((s) => ({
          shortlists: s.shortlists.map((x) =>
            x.id === id
              ? { ...x, note: x.note ? `${x.note} · Invited` : "Invited" }
              : x
          ),
        }));
      },
      upsertWorkspace(ws) {
        set((s) => ({
          workspaces: [
            { ...ws, updatedAt: new Date().toISOString() },
            ...s.workspaces.filter((w) => w.opportunityId !== ws.opportunityId),
          ],
        }));
      },
      setApproval(opportunityId, approval) {
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.opportunityId === opportunityId
              ? {
                  ...w,
                  approval,
                  progress: approval === "approved" ? Math.max(w.progress, 85) : w.progress,
                  status: approval === "approved" ? "approved" : w.status,
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },
      releasePayout(opportunityId) {
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.opportunityId === opportunityId
              ? {
                  ...w,
                  payoutStatus: "released",
                  status: "paid",
                  progress: 100,
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));
      },
      shortlistForCommunity(communityId) {
        return get().shortlists.filter((s) => s.communityId === communityId);
      },
      workspaceFor(opportunityId) {
        return get().workspaces.find((w) => w.opportunityId === opportunityId);
      },
    }),
    {
      name: "jimvio-brand-crm-v1",
      partialize: (s) => ({
        shortlists: s.shortlists,
        workspaces: s.workspaces,
      }),
    }
  )
);
