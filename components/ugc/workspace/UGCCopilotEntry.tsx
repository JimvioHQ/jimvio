"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";

function promptsFor(pathname: string): string[] {
  if (pathname.startsWith("/ugc/campaign-center/create") || pathname.includes("/edit")) {
    return [
      "What is missing from this UGC campaign draft before it can be funded?",
      "Help me write a clearer campaign brief and reward description.",
      "Which requirements should I spell out for creators?",
    ];
  }
  if (pathname.startsWith("/ugc/submissions")) {
    return [
      "Explain what this submission status means and what I should do next.",
      "Help me turn revision feedback into a resubmission checklist.",
      "What should I check before I resubmit content?",
    ];
  }
  if (pathname.startsWith("/ugc/campaigns")) {
    return [
      "Which of my campaigns need action, and what does each status mean?",
      "Help me understand when I am allowed to submit content.",
      "Suggest content hooks that fit a typical UGC brief.",
    ];
  }
  return [
    "Help me understand how to join a UGC campaign and submit content.",
    "Explain the difference between applying and joining a campaign.",
    "What should I look for in a campaign brief before I apply?",
  ];
}

export function UGCCopilotEntry() {
  const pathname = usePathname() || "/ugc";
  const openAssistant = useAIStore((s) => s.openAssistant);
  const setPageContext = useAIStore((s) => s.setPageContext);
  const prompts = promptsFor(pathname);

  const ask = (query?: string) => {
    setPageContext("general", pathname);
    openAssistant(query);
  };

  return (
    <section className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#111827]">Jimvio AI</p>
          <p className="text-[12px] leading-relaxed text-[#6B7280]">
            Ask about briefs, eligibility, submissions, and revisions. Suggestions never approve content, activate campaigns, or move money.
          </p>
        </div>
        <button
          type="button"
          onClick={() => ask()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E84E16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Jimvio AI
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1.5 text-left text-[12px] font-medium text-[#374151] hover:border-[#FFD0C2] hover:bg-[#FFF8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A1F]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}
