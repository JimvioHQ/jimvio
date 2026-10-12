"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CampaignCopilotOutput } from "@/lib/ugc/enterprise/campaign-copilot";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import {
  EnterpriseOutlineButton,
  EnterprisePrimaryButton,
  cardClass,
  fieldClass,
} from "./enterprise-ui";

const PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;
const TYPES = ["ugc", "clipping", "music_clipping", "promotion"] as const;
const DRAFT_KEY = "jimvio-campaign-center-draft-v1";

export function CampaignCopilotPage() {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("1000");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "instagram"]);
  const [type, setType] = useState<(typeof TYPES)[number]>("ugc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<CampaignCopilotOutput | null>(null);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const generate = async () => {
    if (!product.trim()) {
      toast.error("Enter a product name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/ai/campaign-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.trim(),
          niche: niche.trim() || undefined,
          goal: goal.trim() || undefined,
          budget: Number(budget) || undefined,
          platforms,
          campaignType: type,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Copilot failed");
      setOutput(json.output as CampaignCopilotOutput);
      toast.success("Campaign draft generated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copilot failed");
    } finally {
      setBusy(false);
    }
  };

  const openInCreate = () => {
    if (!output?.draftForm) {
      toast.error("Generate a draft first");
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(output.draftForm));
      toast.success("Draft saved — opening Create Campaign");
      router.push("/ugc/campaign-center/create");
    } catch {
      toast.error("Could not save draft");
    }
  };

  const updateOutput = <K extends keyof CampaignCopilotOutput>(key: K, value: CampaignCopilotOutput[K]) => {
    setOutput((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <UGCPageShell
      titleKey="copilot"
      subtitleKey="copilotSubtitle"
      actions={
        <EnterprisePrimaryButton onClick={() => void generate()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </EnterprisePrimaryButton>
      }
    >
      <div className={`${cardClass} space-y-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-[#374151]">
            Product
            <input className={fieldClass} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Acme Serum" />
          </label>
          <label className="text-[12px] font-semibold text-[#374151]">
            Niche
            <input className={fieldClass} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="skincare" />
          </label>
          <label className="text-[12px] font-semibold text-[#374151] sm:col-span-2">
            Goal
            <input className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Drive awareness and conversions" />
          </label>
          <label className="text-[12px] font-semibold text-[#374151]">
            Budget
            <input className={fieldClass} value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" />
          </label>
          <label className="text-[12px] font-semibold text-[#374151]">
            Type
            <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[#374151]">Platforms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={
                  platforms.includes(p)
                    ? "rounded-full bg-[#FFF0E8] px-3 py-1 text-[12px] font-semibold text-[#FF5A1F]"
                    : "rounded-full bg-[#F3F4F6] px-3 py-1 text-[12px] font-semibold text-[#6B7280]"
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <UGCPageError message={error} onRetry={() => void generate()} /> : null}

      {!output && !error ? (
        <UGCPageEmpty
          title="No draft yet"
          description="Fill in product details and generate an editable campaign brief."
          illustration="campaigns"
        />
      ) : null}

      {output ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <EnterprisePrimaryButton onClick={openInCreate}>Open in Create Campaign</EnterprisePrimaryButton>
            <EnterpriseOutlineButton onClick={() => void generate()} disabled={busy}>
              Regenerate
            </EnterpriseOutlineButton>
          </div>

          <div className={`${cardClass} space-y-3`}>
            <label className="block text-[12px] font-semibold text-[#374151]">
              Title
              <input
                className={fieldClass}
                value={output.improvedTitle}
                onChange={(e) => {
                  updateOutput("improvedTitle", e.target.value);
                  setOutput((prev) =>
                    prev
                      ? { ...prev, draftForm: { ...prev.draftForm, title: e.target.value } }
                      : prev,
                  );
                }}
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#374151]">
              Brief
              <textarea
                className={`${fieldClass} min-h-[120px]`}
                value={output.brief}
                onChange={(e) => updateOutput("brief", e.target.value)}
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#374151]">
              Description
              <textarea
                className={`${fieldClass} min-h-[120px]`}
                value={output.improvedDescription}
                onChange={(e) => {
                  updateOutput("improvedDescription", e.target.value);
                  setOutput((prev) =>
                    prev
                      ? { ...prev, draftForm: { ...prev.draftForm, description: e.target.value } }
                      : prev,
                  );
                }}
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#374151]">
              Objectives (one per line)
              <textarea
                className={`${fieldClass} min-h-[100px]`}
                value={output.objectives.join("\n")}
                onChange={(e) =>
                  updateOutput(
                    "objectives",
                    e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  )
                }
              />
            </label>
            <label className="block text-[12px] font-semibold text-[#374151]">
              Creator requirements (one per line)
              <textarea
                className={`${fieldClass} min-h-[100px]`}
                value={output.creatorRequirements.join("\n")}
                onChange={(e) =>
                  updateOutput(
                    "creatorRequirements",
                    e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  )
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#FFF8F5] p-3">
                <p className="text-[11px] font-bold text-[#9CA3AF]">Budget</p>
                <p className="text-lg font-bold text-[#111827]">{output.estimatedBudget}</p>
              </div>
              <div className="rounded-xl bg-[#FFF8F5] p-3">
                <p className="text-[11px] font-bold text-[#9CA3AF]">Creators</p>
                <p className="text-lg font-bold text-[#111827]">~{output.estimatedCreators}</p>
              </div>
              <div className="rounded-xl bg-[#FFF8F5] p-3">
                <p className="text-[11px] font-bold text-[#9CA3AF]">Estimated reach</p>
                <p className="text-lg font-bold text-[#111827]">~{output.predictedReach.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
