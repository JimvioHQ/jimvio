"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ContinueLearningItem,
  PersonalActivity,
  PersonalBookmark,
  PersonalItemKind,
  PersonalVisit,
} from "./types";

const MAX_VISITS = 40;
const MAX_ACTIVITY = 30;
const MAX_CONTINUE = 12;
const MAX_BOOKMARKS = 80;

type PersonalizationState = {
  visits: PersonalVisit[];
  bookmarks: PersonalBookmark[];
  activity: PersonalActivity[];
  continueLearning: ContinueLearningItem[];
  lastCommunityVisitAt: Record<string, string>;
  trackVisit: (visit: Omit<PersonalVisit, "visitedAt"> & { visitedAt?: string }) => void;
  toggleBookmark: (
    item: Omit<PersonalBookmark, "savedAt"> & { savedAt?: string }
  ) => boolean;
  isBookmarked: (kind: PersonalItemKind, id: string) => boolean;
  pushActivity: (
    item: Omit<PersonalActivity, "at" | "id"> & { id?: string; at?: string }
  ) => void;
  setContinueLearning: (
    item: Omit<ContinueLearningItem, "lastAt"> & { lastAt?: string }
  ) => void;
  markCommunitySeen: (communityId: string) => void;
  visitsForCommunity: (communityId: string) => PersonalVisit[];
  bookmarksForCommunity: (communityId: string) => PersonalBookmark[];
  activityForCommunity: (communityId: string) => PersonalActivity[];
  continueForCommunity: (communityId: string) => ContinueLearningItem[];
};

function itemKey(kind: PersonalItemKind, id: string) {
  return `${kind}:${id}`;
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set, get) => ({
      visits: [],
      bookmarks: [],
      activity: [],
      continueLearning: [],
      lastCommunityVisitAt: {},

      trackVisit(visit) {
        const visitedAt = visit.visitedAt ?? new Date().toISOString();
        const key = itemKey(visit.kind, visit.id);
        set((s) => {
          const without = s.visits.filter(
            (v) => itemKey(v.kind, v.id) !== key
          );
          const next: PersonalVisit = { ...visit, visitedAt };
          return {
            visits: [next, ...without].slice(0, MAX_VISITS),
            lastCommunityVisitAt: {
              ...s.lastCommunityVisitAt,
              [visit.communityId]: visitedAt,
            },
          };
        });
      },

      toggleBookmark(item) {
        const key = itemKey(item.kind, item.id);
        const existing = get().bookmarks.some(
          (b) => itemKey(b.kind, b.id) === key
        );
        set((s) => {
          if (existing) {
            return {
              bookmarks: s.bookmarks.filter(
                (b) => itemKey(b.kind, b.id) !== key
              ),
            };
          }
          const next: PersonalBookmark = {
            ...item,
            savedAt: item.savedAt ?? new Date().toISOString(),
          };
          return {
            bookmarks: [next, ...s.bookmarks].slice(0, MAX_BOOKMARKS),
          };
        });
        return !existing;
      },

      isBookmarked(kind, id) {
        const key = itemKey(kind, id);
        return get().bookmarks.some((b) => itemKey(b.kind, b.id) === key);
      },

      pushActivity(item) {
        const at = item.at ?? new Date().toISOString();
        const id =
          item.id ??
          `${item.communityId}:${item.verb}:${item.title}:${at}`.slice(0, 120);
        set((s) => ({
          activity: [
            { id, communityId: item.communityId, verb: item.verb, title: item.title, href: item.href ?? null, at },
            ...s.activity.filter((a) => a.id !== id),
          ].slice(0, MAX_ACTIVITY),
        }));
      },

      setContinueLearning(item) {
        const lastAt = item.lastAt ?? new Date().toISOString();
        set((s) => {
          const without = s.continueLearning.filter((c) => c.id !== item.id);
          return {
            continueLearning: [{ ...item, lastAt }, ...without].slice(
              0,
              MAX_CONTINUE
            ),
          };
        });
      },

      markCommunitySeen(communityId) {
        set((s) => ({
          lastCommunityVisitAt: {
            ...s.lastCommunityVisitAt,
            [communityId]: new Date().toISOString(),
          },
        }));
      },

      visitsForCommunity(communityId) {
        return get().visits.filter((v) => v.communityId === communityId);
      },

      bookmarksForCommunity(communityId) {
        return get().bookmarks.filter((b) => b.communityId === communityId);
      },

      activityForCommunity(communityId) {
        return get().activity.filter((a) => a.communityId === communityId);
      },

      continueForCommunity(communityId) {
        return get().continueLearning.filter(
          (c) => !c.communityId || c.communityId === communityId
        );
      },
    }),
    {
      name: "jimvio-personalization-v1",
      partialize: (s) => ({
        visits: s.visits,
        bookmarks: s.bookmarks,
        activity: s.activity,
        continueLearning: s.continueLearning,
        lastCommunityVisitAt: s.lastCommunityVisitAt,
      }),
    }
  )
);
