export const LEVEL_THRESHOLDS = [0, 500, 2000, 8000, 25000, 100000];

export type PointsSnapshot = {
  total_points: number;
  level: number;
  level_start_xp: number;
  next_level_xp: number;
  streak_days: number;
};

export function buildPointsSnapshot(
  total_points: number,
  level: number,
  streak_days = 0
): PointsSnapshot {
  const safeLevel = Math.max(1, level);
  return {
    total_points,
    level: safeLevel,
    level_start_xp: LEVEL_THRESHOLDS[safeLevel - 1] ?? 0,
    next_level_xp:
      LEVEL_THRESHOLDS[safeLevel] ??
      LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 100000,
    streak_days,
  };
}

export function aggregateMemberPoints(
  rows: Array<{ total_points: number | null; level: number | null; streak_days?: number | null }>
): PointsSnapshot {
  if (rows.length === 0) {
    return buildPointsSnapshot(0, 1, 0);
  }

  const total_points = rows.reduce((sum, row) => sum + (row.total_points ?? 0), 0);
  const level = Math.max(...rows.map((row) => row.level ?? 1));
  const streak_days = Math.max(...rows.map((row) => row.streak_days ?? 0));

  return buildPointsSnapshot(total_points, level, streak_days);
}
