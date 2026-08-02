import { Award, BadgeCheck, Flag, Link2, Shield, Star, Users, Video } from "lucide-react";
import type { IdentityBadge, IdentityMilestone } from "@/lib/identity/types";
import { IdentityEmptyState, IdentitySectionHeading, cn } from "@/components/identity/identity-ui";

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  star: Star,
  users: Users,
  link: Link2,
  video: Video,
  flag: Flag,
  briefcase: Award,
};

export function IdentityAchievements({
  badges,
  milestones,
  className,
}: {
  badges: IdentityBadge[];
  milestones: IdentityMilestone[];
  className?: string;
}) {
  const hasContent = badges.length > 0 || milestones.length > 0;

  return (
    <div className={cn(className)}>
      <IdentitySectionHeading eyebrow="Recognition" title="Achievements" className="mb-4" />

      {!hasContent ? (
        <IdentityEmptyState
          icon={<Award className="h-6 w-6" />}
          title="No achievements yet"
          description="Badges and milestones appear here as this creator grows on Jimvio."
        />
      ) : (
        <div className="space-y-4">
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {badges.map((badge) => {
                const Icon = BADGE_ICONS[badge.icon ?? ""] ?? BadgeCheck;
                return (
                  <div
                    key={badge.id}
                    title={badge.description ?? badge.name}
                    className="flex items-center gap-2 rounded-full border border-[#FFDCC7] bg-[#FFF1EA] px-3.5 py-1.5"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#D6480F]" />
                    <span className="text-[12.5px] font-medium text-[#8A3B0C]">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {milestones.length > 0 && (
            <ol className="space-y-3 border-l border-black/[0.08] pl-4">
              {milestones.map((m) => (
                <li key={m.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#FF5A1F] ring-4 ring-white" />
                  <p className="text-[13px] font-semibold text-[#1C1B19]">{m.title}</p>
                  {m.description && <p className="text-[12px] text-[#8B8579]">{m.description}</p>}
                  <p className="mt-0.5 text-[11px] text-[#B9B3A6]">
                    {new Date(m.achievedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
