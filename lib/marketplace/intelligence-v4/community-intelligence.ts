/**
 * Community Intelligence v4 — community activity boosts ranking.
 */

import type { MarketplaceProductSignals } from "./types";

export interface CommunitySignals {
  likes: number;
  posts: number;
  comments: number;
  shares: number;
  ugcCount: number;
  liveShoppingViews: number;
}

export function computeCommunityScore(signals: CommunitySignals): number {
  return Math.min(
    100,
    Math.round(
      signals.likes * 0.5 +
      signals.posts * 3 +
      signals.comments * 1.5 +
      signals.shares * 4 +
      signals.ugcCount * 5 +
      signals.liveShoppingViews * 0.1
    )
  );
}

export function applyCommunityBoost(
  rankScore: number,
  community: CommunitySignals
): number {
  const communityScore = computeCommunityScore(community);
  const boost = communityScore * 0.15;
  return Math.max(0, Math.min(100, Math.round(rankScore + boost)));
}

export function defaultCommunitySignals(): CommunitySignals {
  return {
    likes: 0,
    posts: 0,
    comments: 0,
    shares: 0,
    ugcCount: 0,
    liveShoppingViews: 0,
  };
}

export function communityFromProduct(
  _signals: MarketplaceProductSignals,
  extras?: Partial<CommunitySignals>
): CommunitySignals {
  return {
    likes: extras?.likes ?? 0,
    posts: extras?.posts ?? 0,
    comments: extras?.comments ?? 0,
    shares: extras?.shares ?? 0,
    ugcCount: extras?.ugcCount ?? (_signals.source === "ugc" ? 1 : 0),
    liveShoppingViews: extras?.liveShoppingViews ?? 0,
  };
}
