"use client";

import { useMemo } from "react";
import { Bot } from "lucide-react";
import {
  getAiNativeProviderId,
  type AiNativeContext,
} from "@/lib/ai/native";
import { AiContentStudio } from "./AiContentStudio";
import { AiAnalyticsPanel } from "./AiAnalyticsPanel";
import { AiModerationPanel } from "./AiModerationPanel";
import { AiKnowledgeEngine } from "./AiKnowledgeEngine";
import { AiAutomationsBuilder } from "./AiAutomationsBuilder";
import { AiPersonalizationRail } from "./AiPersonalizationRail";

type OverviewLite = AiNativeContext["overview"];

/**
 * AI Native Platform shell — additive intelligence layer for Creator OS.
 * Does not replace JimvioCopilot or Command Center; extends both.
 */
export function AiNativePlatformShell({
  base,
  communityId,
  communityName,
  overview,
}: {
  base: string;
  communityId: string;
  communityName?: string;
  overview?: OverviewLite;
}) {
  const context = useMemo<AiNativeContext>(
    () => ({
      base,
      communityId,
      communityName,
      overview: overview ?? null,
    }),
    [base, communityId, communityName, overview]
  );

  const providerId = getAiNativeProviderId();

  return (
    <div className="space-y-5" aria-label="Jimvio AI native platform">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            AI Native
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            Intelligence across Community, Commerce & Creator Economy
          </h3>
          <p className="mt-1 max-w-2xl text-[12.5px] text-[var(--color-text-muted)]">
            Copilot everywhere · ⌘K natural language · content studio · analytics ·
            moderation · knowledge · automations · personalization. Provider:{" "}
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {providerId}
            </span>
          </p>
        </div>
      </header>

      <AiPersonalizationRail context={context} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <AiContentStudio context={context} />
          <AiAnalyticsPanel context={context} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <AiModerationPanel context={context} />
          <AiKnowledgeEngine context={context} />
        </div>
      </div>

      <AiAutomationsBuilder communityId={communityId} />
    </div>
  );
}
