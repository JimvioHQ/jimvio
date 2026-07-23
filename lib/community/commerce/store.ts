"use client";

/**
 * Creator Commerce store — shelves, affiliate stats, bookings, donations.
 * Does not duplicate cart, checkout, or CE product catalogs.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AffiliateStats,
  CommerceBooking,
  CommerceDonation,
  CommerceEmbed,
  CommunityStoreItem,
} from "./types";

type CreatorCommerceState = {
  communityItems: CommunityStoreItem[];
  bookmarkedIds: string[];
  affiliateStats: AffiliateStats[];
  bookings: CommerceBooking[];
  donations: CommerceDonation[];
  featureInCommunity: (args: {
    communityId: string;
    embed: CommerceEmbed;
    createdBy: string | null;
    featured?: boolean;
  }) => CommunityStoreItem;
  unfeature: (id: string, communityId: string) => void;
  toggleBookmark: (offerId: string) => void;
  isBookmarked: (offerId: string) => boolean;
  trackAffiliateClick: (code: string, offerId: string) => void;
  trackAffiliateConversion: (code: string, offerId: string, earnings: number) => void;
  getAffiliateStats: (code: string) => AffiliateStats | undefined;
  addBooking: (booking: CommerceBooking) => void;
  addDonation: (donation: CommerceDonation) => void;
  itemsForCommunity: (communityId: string) => CommunityStoreItem[];
  featuredForCommunity: (communityId: string) => CommunityStoreItem[];
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCreatorCommerceStore = create<CreatorCommerceState>()(
  persist(
    (set, get) => ({
      communityItems: [],
      bookmarkedIds: [],
      affiliateStats: [],
      bookings: [],
      donations: [],

      featureInCommunity({ communityId, embed, createdBy, featured = true }) {
        const item: CommunityStoreItem = {
          ...embed,
          communityId,
          featured,
          createdAt: new Date().toISOString(),
          createdBy,
        };
        set((s) => ({
          communityItems: [
            item,
            ...s.communityItems.filter(
              (i) => !(i.id === embed.id && i.communityId === communityId)
            ),
          ],
        }));
        return item;
      },

      unfeature(id, communityId) {
        set((s) => ({
          communityItems: s.communityItems.filter(
            (i) => !(i.id === id && i.communityId === communityId)
          ),
        }));
      },

      toggleBookmark(offerId) {
        set((s) => ({
          bookmarkedIds: s.bookmarkedIds.includes(offerId)
            ? s.bookmarkedIds.filter((id) => id !== offerId)
            : [...s.bookmarkedIds, offerId],
        }));
      },

      isBookmarked(offerId) {
        return get().bookmarkedIds.includes(offerId);
      },

      trackAffiliateClick(code, offerId) {
        set((s) => {
          const existing = s.affiliateStats.find(
            (a) => a.code === code && a.offerId === offerId
          );
          if (existing) {
            return {
              affiliateStats: s.affiliateStats.map((a) =>
                a.code === code && a.offerId === offerId
                  ? { ...a, clicks: a.clicks + 1 }
                  : a
              ),
            };
          }
          return {
            affiliateStats: [
              ...s.affiliateStats,
              { code, offerId, clicks: 1, conversions: 0, earnings: 0 },
            ],
          };
        });
      },

      trackAffiliateConversion(code, offerId, earnings) {
        set((s) => {
          const existing = s.affiliateStats.find(
            (a) => a.code === code && a.offerId === offerId
          );
          if (existing) {
            return {
              affiliateStats: s.affiliateStats.map((a) =>
                a.code === code && a.offerId === offerId
                  ? {
                      ...a,
                      conversions: a.conversions + 1,
                      earnings: a.earnings + earnings,
                    }
                  : a
              ),
            };
          }
          return {
            affiliateStats: [
              ...s.affiliateStats,
              {
                code,
                offerId,
                clicks: 0,
                conversions: 1,
                earnings,
              },
            ],
          };
        });
      },

      getAffiliateStats(code) {
        return get().affiliateStats.find((a) => a.code === code);
      },

      addBooking(booking) {
        set((s) => ({ bookings: [booking, ...s.bookings] }));
      },

      addDonation(donation) {
        set((s) => ({ donations: [donation, ...s.donations] }));
      },

      itemsForCommunity(communityId) {
        return get().communityItems.filter((i) => i.communityId === communityId);
      },

      featuredForCommunity(communityId) {
        return get()
          .communityItems.filter((i) => i.communityId === communityId && i.featured)
          .slice(0, 12);
      },
    }),
    {
      name: "jimvio-creator-commerce-v1",
      partialize: (s) => ({
        communityItems: s.communityItems,
        bookmarkedIds: s.bookmarkedIds,
        affiliateStats: s.affiliateStats,
        bookings: s.bookings,
        donations: s.donations,
      }),
    }
  )
);

export function createBookingDraft(args: {
  title: string;
  bookingType: CommerceBooking["bookingType"];
  communityId?: string | null;
  roomId?: string | null;
  durationMinutes?: number;
  price?: number | null;
  hostName?: string | null;
  createdBy?: string | null;
  sourceMessageId?: string | null;
}): CommerceBooking {
  return {
    id: uid("booking"),
    communityId: args.communityId ?? null,
    roomId: args.roomId ?? null,
    title: args.title,
    bookingType: args.bookingType,
    durationMinutes: args.durationMinutes ?? 30,
    price: args.price ?? null,
    hostName: args.hostName ?? null,
    startsAt: null,
    sourceMessageId: args.sourceMessageId ?? null,
    createdBy: args.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
}
