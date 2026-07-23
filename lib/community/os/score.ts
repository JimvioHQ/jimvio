/**
 * Community Score — reusable reputation metrics built on existing XP/points.
 */

import { levelFromTotalPoints } from "@/lib/community/points";
import type { CommunityScoreBreakdown } from "./types";

export function computeCommunityScore(input: {
  totalCommunityXp?: number | null;
  healthScore?: number | null;
  knowledgeCardCount?: number;
  answerCount?: number;
  taskCompletedCount?: number;
  memberCount?: number;
  trustedBadgeLabels?: string[];
}): CommunityScoreBreakdown {
  const xp = Math.max(0, input.totalCommunityXp ?? 0);
  const health = Math.max(0, Math.min(100, input.healthScore ?? 0));
  const knowledgePoints =
    (input.knowledgeCardCount ?? 0) * 12 + (input.answerCount ?? 0) * 8;
  const helpfulness = Math.round(health * 0.6 + (input.answerCount ?? 0) * 4);
  const contributionScore =
    knowledgePoints + (input.taskCompletedCount ?? 0) * 10;
  const creatorXp = xp;
  const total = Math.round(
    creatorXp * 0.35 +
      contributionScore * 2.5 +
      helpfulness * 1.2 +
      knowledgePoints * 1.5
  );
  const level = levelFromTotalPoints(total);

  const badges = [...(input.trustedBadgeLabels ?? [])];
  if (knowledgePoints >= 50) badges.push("Knowledge Builder");
  if (helpfulness >= 40) badges.push("Helpful");
  if ((input.taskCompletedCount ?? 0) >= 5) badges.push("Doer");
  if (level >= 3) badges.push("Rising Creator");

  return {
    knowledgePoints,
    helpfulness,
    contributionScore,
    creatorXp,
    total,
    level,
    badges: [...new Set(badges)].slice(0, 8),
  };
}

export function scoreTier(total: number): string {
  if (total >= 25000) return "Diamond";
  if (total >= 8000) return "Platinum";
  if (total >= 2000) return "Gold";
  if (total >= 500) return "Silver";
  return "Bronze";
}
