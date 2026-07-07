"use client";

import { Sparkles, Users, FileText } from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import type { CreatorProfileIdentity } from "@/lib/creator-profile/types";

type CreatorProfileAISectionProps = {
  identity: CreatorProfileIdentity;
};

export function CreatorProfileAISection({ identity }: CreatorProfileAISectionProps) {
  const openAssistant = useAIStore((s) => s.openAssistant);

  const prompts = [
    {
      icon: Sparkles,
      label: `Ask Jimvio AI about ${identity.displayName}`,
      query: `Tell me about creator ${identity.displayName} on Jimvio and what they sell.`,
    },
    {
      icon: Users,
      label: "Recommend similar creators",
      query: `Recommend creators similar to ${identity.displayName} on Jimvio.`,
    },
    {
      icon: FileText,
      label: "Summarize creator profile",
      query: `Summarize ${identity.displayName}'s Jimvio creator profile, products, and communities.`,
    },
  ];

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)), var(--color-surface))",
      }}
    >
      <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">Jimvio AI for this creator</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {prompts.map(({ icon: Icon, label, query }) => (
          <button
            key={label}
            type="button"
            onClick={() => openAssistant(query)}
            className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-[12px] font-semibold text-[var(--color-text-primary)] transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/40"
            style={{ willChange: "transform" }}
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
        AI placeholders — connects to Jimvio Copilot without backend changes.
      </p>
    </div>
  );
}
