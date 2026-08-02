"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CreatorCopilotOutput } from "@/lib/ugc/enterprise/creator-copilot";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterprisePrimaryButton,
  MetricCard,
  cardClass,
  fieldClass,
} from "./enterprise-ui";

export function CreatorCopilotPage() {
  const [campaignTitle, setCampaignTitle] = useState("");
  const [productName, setProductName] = useState("");
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("authentic");
  const [hashtags, setHashtags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<CreatorCopilotOutput | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/ai/creator-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignTitle: campaignTitle.trim() || undefined,
          productName: productName.trim() || undefined,
          niche: niche.trim() || undefined,
          goal: goal.trim() || undefined,
          tone: tone.trim() || undefined,
          requiredHashtags: hashtags
            .split(/[\s,]+/)
            .map((h) => h.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Creator copilot failed");
      setOutput(json.output as CreatorCopilotOutput);
      toast.success("Script pack ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creator copilot failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UGCPageShell
      title="Creator Copilot"
      subtitle="Scripts, hooks, captions, and scores for your next submission."
      actions={
        <EnterprisePrimaryButton onClick={() => void generate()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </EnterprisePrimaryButton>
      }
    >
      <div className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
        <label className="text-[12px] font-semibold text-[#374151]">
          Campaign title
          <input className={fieldClass} value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Product
          <input className={fieldClass} value={productName} onChange={(e) => setProductName(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Niche
          <input className={fieldClass} value={niche} onChange={(e) => setNiche(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151]">
          Tone
          <input className={fieldClass} value={tone} onChange={(e) => setTone(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151] sm:col-span-2">
          Goal
          <input className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-[#374151] sm:col-span-2">
          Required hashtags
          <input
            className={fieldClass}
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#brand #ugc"
          />
        </label>
      </div>

      {error ? <UGCPageError message={error} onRetry={() => void generate()} /> : null}
      {!output && !error ? (
        <UGCPageEmpty
          title="No script yet"
          description="Generate hooks, captions, and a timed script tailored to your campaign."
        />
      ) : null}

      {output ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Content score" value={output.contentScore} />
            <MetricCard label="Brand fit" value={output.brandFitScore} />
          </div>
          <div className={cardClass}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Script</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-[#111827]">{output.script}</pre>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={cardClass}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Hooks</p>
              <ul className="mt-2 space-y-2 text-sm text-[#111827]">
                {output.hooks.map((h) => (
                  <li key={h} className="rounded-xl bg-[#F8FAFC] px-3 py-2">{h}</li>
                ))}
              </ul>
            </div>
            <div className={cardClass}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Captions</p>
              <ul className="mt-2 space-y-2 text-sm text-[#111827]">
                {output.captions.map((c) => (
                  <li key={c} className="rounded-xl bg-[#F8FAFC] px-3 py-2">{c}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className={cardClass}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF]">Improvements</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#374151]">
              {output.improvements.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
