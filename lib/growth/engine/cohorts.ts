export type CohortInput = { userId: string; name: string; at: string };

export type CohortRow = {
  week: string;
  users: number;
  returned: number;
  retention: number | null;
  basis: "measured";
};

export function cohortRetention(events: CohortInput[], now = new Date()): { rows: CohortRow[]; note: string } {
  const usable = events.filter((event) => event.userId && event.at);
  if (usable.length === 0) {
    return { rows: [], note: "No cohort events were supplied. Retention is not estimated." };
  }

  const byUser = new Map<string, CohortInput[]>();
  for (const event of usable) {
    const list = byUser.get(event.userId) ?? [];
    list.push(event);
    byUser.set(event.userId, list);
  }

  const weeks = new Map<string, { users: string[]; returned: string[] }>();
  for (const [userId, list] of byUser) {
    const ordered = [...list].sort((a, b) => a.at.localeCompare(b.at));
    const start = ordered.find((event) => event.name === "growth.welcome_completed" || event.name === "growth.session_start");
    if (!start) continue;
    const week = start.at.slice(0, 10);
    const bucket = weeks.get(week) ?? { users: [], returned: [] };
    bucket.users.push(userId);
    const startTime = new Date(start.at).getTime();
    const returned = ordered.some((event) => {
      const time = new Date(event.at).getTime();
      return time >= startTime + 7 * 86_400_000 && time < startTime + 14 * 86_400_000;
    });
    if (returned) bucket.returned.push(userId);
    weeks.set(week, bucket);
  }

  const rows = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, bucket]) => ({
      week,
      users: bucket.users.length,
      returned: bucket.returned.length,
      retention: bucket.users.length > 0 ? Math.round((bucket.returned.length / bucket.users.length) * 100) : null,
      basis: "measured" as const,
    }));

  return {
    rows,
    note: rows.length
      ? `Retention uses only the ${usable.length} supplied events as of ${now.toISOString()}. It is not a forecast.`
      : "Supplied events had no welcome or session start, so no cohort was built.",
  };
}
