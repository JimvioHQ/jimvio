import { cn } from "@/lib/utils";
import { CREATOR_CHALLENGE } from "@/lib/feed/mock-data";

type CreatorChallengeCardProps = {
  title?: string;
  description?: string;
  completed?: number;
  target?: number;
  className?: string;
};

export function CreatorChallengeCard({
  title = "Creator Challenge",
  description = CREATOR_CHALLENGE.title,
  completed = CREATOR_CHALLENGE.completed,
  target = CREATOR_CHALLENGE.target,
  className,
}: CreatorChallengeCardProps) {
  const progressPct = Math.round((completed / target) * 100);

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-3.5 lg:w-[220px] xl:w-[236px] 2xl:w-[252px]",
        className
      )}
    >
      <p className="text-[13px] font-bold leading-tight text-[#FF6600]">
        <span aria-hidden>🔥 </span>
        {title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#6B7280]">{description}</p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#FF6600] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#1A1A1A]">
          {completed} / {target}
        </span>
      </div>
    </div>
  );
}
