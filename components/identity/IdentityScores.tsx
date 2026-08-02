import { Gauge, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import type { IdentityLevelProgress } from "@/lib/identity/types";
import { IdentityCard, IdentityProgressBar, IdentityScoreRing, cn } from "@/components/identity/identity-ui";

export function IdentityScores({
  trustScore,
  aiScore,
  reputationScore,
  levelProgress,
  overallRank,
  className,
}: {
  trustScore: number;
  aiScore: number;
  reputationScore: number;
  levelProgress: IdentityLevelProgress;
  overallRank: number | null;
  className?: string;
}) {
  return (
    <IdentityCard className={cn("p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Scores</p>
        {overallRank && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[#59544B]">
            <Trophy className="h-3 w-3 text-[#FF5A1F]" />
            Rank #{overallRank}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ScoreCell icon={ShieldCheck} label="Trust" value={trustScore} />
        <ScoreCell icon={Sparkles} label="AI Score" value={aiScore} color="#8A6DF0" />
        <ScoreCell icon={Gauge} label="Reputation" value={reputationScore} color="#1C8A44" />
      </div>

      <div className="mt-5 rounded-2xl bg-black/[0.02] p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-[#1C1B19]">{levelProgress.levelLabel} Creator</p>
          <p className="text-[11.5px] text-[#9A9388]">
            {levelProgress.xp.toLocaleString()} XP
            {levelProgress.xpForNextLevel != null && (
              <> · {(levelProgress.xpForNextLevel - levelProgress.xpIntoLevel).toLocaleString()} to next level</>
            )}
          </p>
        </div>
        <IdentityProgressBar value={levelProgress.progressPct} />
      </div>
    </IdentityCard>
  );
}

function ScoreCell({
  icon: Icon,
  label,
  value,
  color = "#FF5A1F",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.05] bg-white py-3">
      <IdentityScoreRing value={value} size={64} strokeWidth={5} color={color} />
      <div className="flex items-center gap-1 text-[11px] font-medium text-[#7C766B]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
    </div>
  );
}
