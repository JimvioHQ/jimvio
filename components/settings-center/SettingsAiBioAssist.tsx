"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BioAssistMode } from "@/lib/identity/ai-builder";
import { SettingsButton, settingsInputClass, settingsTextareaClass } from "./settings-ui";

const MODES: { value: BioAssistMode; label: string }[] = [
  { value: "improve", label: "Improve" },
  { value: "generate", label: "Generate" },
  { value: "professional", label: "Professional" },
  { value: "concise", label: "Concise" },
  { value: "detailed", label: "Detailed" },
];

export function SettingsAiBioAssist({
  bio,
  onApply,
  maxLength,
}: {
  bio: string;
  onApply: (next: string) => void;
  maxLength: number;
}) {
  const [mode, setMode] = useState<BioAssistMode>("improve");
  const [language, setLanguage] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/identity/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, bio, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI could not draft a biography");
      setDraft(String(json.draft ?? "").slice(0, maxLength));
      toast.success("Draft ready — review before applying");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI could not draft a biography");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#FFE0D1] bg-[#FFF8F4] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A3412]">
          <Sparkles className="h-3.5 w-3.5" />
          AI biography assistant
        </p>
        <p className="text-[11.5px] text-[#B45309]">Draft only — never auto-published</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <select
          className={settingsInputClass}
          value={mode}
          onChange={(event) => setMode(event.target.value as BioAssistMode)}
          aria-label="AI biography mode"
        >
          {MODES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className={settingsInputClass}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          placeholder="Language (optional)"
        />
        <SettingsButton variant="secondary" loading={loading} onClick={() => void generate()}>
          Draft with AI
        </SettingsButton>
      </div>
      {draft ? (
        <div className="mt-3 space-y-2">
          <textarea
            className={settingsTextareaClass}
            rows={5}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, maxLength))}
          />
          <div className="flex flex-wrap gap-2">
            <SettingsButton
              onClick={() => {
                onApply(draft.slice(0, maxLength));
                setDraft(null);
                toast.success("Draft applied — save your profile to publish");
              }}
            >
              Use this draft
            </SettingsButton>
            <SettingsButton variant="ghost" onClick={() => setDraft(null)}>
              Discard
            </SettingsButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
