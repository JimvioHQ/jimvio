import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/community/workspace-context";

export function CommunityProgressCard() {
  const router = useRouter();
  const { slug, points, overview, memberCount } = useWorkspace();

  const level = points?.level ?? 1;
  const pct = points
    ? Math.round(
        ((points.total_points - points.level_start_xp) /
          Math.max(1, points.next_level_xp - points.level_start_xp)) *
          100
      )
    : 0;

  const stats = [
    { label: "Challenges", value: (overview?.progressBreakdown?.challenges ?? 0).toString() },
    { label: "Missions", value: (overview?.progressBreakdown?.riddles ?? 0).toString() },
    { label: "Members", value: (memberCount ?? 0).toLocaleString() },
    { label: "Top %", value: `${overview?.progressBreakdown?.rankPercent ?? 12}%` },
  ];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Community Progress</h3>
          <span className="text-xs font-bold text-[var(--color-accent)]">Level {level}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-[var(--color-surface-secondary)] p-2 text-center">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{s.value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={() => router.push(`/c/${slug}/missions`)}
          className="w-full rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] outline-none"
        >
          View full progress
        </button>
      </div>
    </div>
  );
}
