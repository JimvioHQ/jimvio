/**
 * XP → creator level helpers and numeric score clamps for the Identity Platform.
 * Mirrors the `jip_identity.creator_level` CHECK constraint
 * ('bronze','silver','gold','platinum','diamond','elite').
 */

import type { CreatorLevel } from "./types";

export const CREATOR_LEVELS: CreatorLevel[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "elite",
];

/** XP required to reach each level, in the same order as CREATOR_LEVELS. */
export const LEVEL_XP_THRESHOLDS: Record<CreatorLevel, number> = {
  bronze: 0,
  silver: 1_000,
  gold: 5_000,
  platinum: 15_000,
  diamond: 40_000,
  elite: 100_000,
};

/** Clamp a numeric score into [min, max], defaulting to a 0-100 range. */
export function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Round to 2 decimal places — matches numeric(5,2) columns on jip_identity. */
export function roundScore(value: number, min = 0, max = 100): number {
  return Math.round(clampScore(value, min, max) * 100) / 100;
}

export function levelFromXp(xp: number): CreatorLevel {
  const safeXp = Math.max(0, xp || 0);
  let level: CreatorLevel = "bronze";
  for (const l of CREATOR_LEVELS) {
    if (safeXp >= LEVEL_XP_THRESHOLDS[l]) level = l;
  }
  return level;
}

export function levelIndex(level: CreatorLevel): number {
  return CREATOR_LEVELS.indexOf(level);
}

export function xpForLevel(level: CreatorLevel): number {
  return LEVEL_XP_THRESHOLDS[level] ?? 0;
}

export function nextLevel(level: CreatorLevel): CreatorLevel | null {
  const idx = levelIndex(level);
  if (idx < 0 || idx >= CREATOR_LEVELS.length - 1) return null;
  return CREATOR_LEVELS[idx + 1];
}

export interface LevelProgress {
  level: CreatorLevel;
  levelIndex: number;
  xp: number;
  levelStartXp: number;
  nextLevel: CreatorLevel | null;
  nextLevelXp: number | null;
  progressPercent: number; // 0-100 within the current level, 100 if max level
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp || 0);
  const level = levelFromXp(safeXp);
  const next = nextLevel(level);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = next ? xpForLevel(next) : null;

  const progressPercent =
    nextLevelXp == null
      ? 100
      : clampScore(
          ((safeXp - levelStartXp) / Math.max(1, nextLevelXp - levelStartXp)) * 100
        );

  return {
    level,
    levelIndex: levelIndex(level),
    xp: safeXp,
    levelStartXp,
    nextLevel: next,
    nextLevelXp,
    progressPercent: Math.round(progressPercent),
  };
}

/** Composite 0-100 "overall" score used for ranking, blends trust/ai/reputation. */
export function overallScore(input: {
  trustScore?: number | null;
  aiScore?: number | null;
  reputationScore?: number | null;
}): number {
  const trust = clampScore(input.trustScore ?? 50);
  const ai = clampScore(input.aiScore ?? 50);
  const reputation = clampScore(input.reputationScore ?? 50);
  return roundScore(trust * 0.4 + ai * 0.3 + reputation * 0.3);
}
