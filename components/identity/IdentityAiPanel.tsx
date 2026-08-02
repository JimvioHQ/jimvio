import { Bot, Rocket, Sparkles, TrendingUp, Wand2 } from "lucide-react";
import type { IdentityAiInsights } from "@/lib/identity/types";
import { IdentityCard, IdentityEmptyState, IdentityPill, IdentitySectionHeading, cn } from "@/components/identity/identity-ui";

export function IdentityAiPanel({
  insights,
  isOwner,
  className,
}: {
  insights: IdentityAiInsights | null;
  isOwner: boolean;
  className?: string;
}) {
  return (
    <IdentityCard className={cn("relative overflow-hidden p-5", className)}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(138,109,240,0.14),transparent_70%)]" />
      <IdentitySectionHeading
        eyebrow="Jimvio AI"
        title="Creator intelligence"
        description={insights?.summary ?? undefined}
        action={
          <IdentityPill tone="accent" icon={<Sparkles className="h-3 w-3" />}>
            AI-powered
          </IdentityPill>
        }
      />

      {!insights ? (
        <div className="mt-4">
          <IdentityEmptyState
            icon={<Bot className="h-6 w-6" />}
            title={isOwner ? "AI analysis is warming up" : "AI insights not available yet"}
            description={
              isOwner
                ? "Jimvio AI reviews your activity and portfolio to surface strengths, growth ideas and campaign matches."
                : "This creator's AI intelligence report hasn't been generated yet."
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AiList icon={Sparkles} title="Strengths" items={insights.strengths} tone="accent" />
          <AiList icon={TrendingUp} title="Opportunities" items={insights.opportunities} tone="success" />
          <AiList icon={Wand2} title="Recommended campaigns" items={insights.recommendedCampaigns} tone="neutral" />
          <AiList icon={Rocket} title="Growth roadmap" items={insights.growthRoadmap} tone="neutral" />
        </div>
      )}
    </IdentityCard>
  );
}

function AiList({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  tone: "accent" | "success" | "neutral";
}) {
  if (items.length === 0) return null;
  const dotColor =
    tone === "accent" ? "bg-[#FF5A1F]" : tone === "success" ? "bg-[#1C8A44]" : "bg-[#8A6DF0]";
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-black/[0.015] p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#59544B]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 4).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#3E3A34]">
            <span className={cn("mt-[6px] h-1 w-1 shrink-0 rounded-full", dotColor)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
