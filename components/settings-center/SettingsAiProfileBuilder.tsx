"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ProfileBuilderDraft } from "@/lib/identity/ai-builder";
import {
  SettingsButton,
  SettingsCard,
  SettingsStatus,
  settingsTextareaClass,
} from "./settings-ui";

/**
 * Optional AI organizer for Identity sections. Produces editable drafts only.
 */
export function SettingsAiProfileBuilder() {
  const [sourceText, setSourceText] = useState("");
  const [draft, setDraft] = useState<ProfileBuilderDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function organize() {
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/identity/ai/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not organize profile draft");
      setDraft(json.draft as ProfileBuilderDraft);
      toast.success("Draft organized — review before saving anything");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not organize profile draft";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function applySafeFields() {
    if (!draft) return;
    setApplying(true);
    try {
      const payload: Record<string, unknown> = {};
      if (draft.headline) payload.headline = draft.headline;
      if (draft.bio) payload.bio = draft.bio;
      if (draft.skills?.length) payload.skills = draft.skills;
      if (draft.languages?.length) payload.languages = draft.languages;
      if (draft.industries?.length) payload.industries = draft.industries;

      if (Object.keys(payload).length === 0) {
        toast.error("No overview fields to apply. Add experience manually from the managers below.");
        return;
      }

      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save overview fields");

      // Experience/education are never auto-inserted — require explicit per-entry adds.
      const experience = draft.experience ?? [];
      const education = draft.education ?? [];
      for (const entry of experience) {
        if (!entry.title?.trim()) continue;
        await fetch("/api/identity/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: "experience",
            title: entry.title,
            organization: entry.organization ?? null,
            description: entry.description ?? null,
            startedOn: entry.startedOn ?? null,
            endedOn: entry.endedOn ?? null,
            isCurrent: Boolean(entry.isCurrent),
          }),
        });
      }
      for (const entry of education) {
        if (!entry.title?.trim()) continue;
        await fetch("/api/identity/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: "education",
            title: entry.title,
            organization: entry.organization ?? null,
            description: entry.description ?? null,
            startedOn: entry.startedOn ?? null,
            endedOn: entry.endedOn ?? null,
          }),
        });
      }

      toast.success("Approved draft fields saved. Reload your public profile to confirm.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply draft");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div id="identity-ai-builder" className="scroll-mt-24">
      <SettingsCard
        title="AI Universal Profile Builder"
        description="Paste a short description or CV excerpt. Jimvio AI organizes a draft for your review. It never invents jobs, schools, credentials, or stats."
        icon={<Sparkles className="h-4 w-4" />}
      >
        <textarea
          className={settingsTextareaClass}
          rows={6}
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Paste your professional summary, CV text, or notes about what you do…"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <SettingsButton loading={loading} onClick={() => void organize()}>
            Organize into Identity draft
          </SettingsButton>
        </div>
        {error ? <div className="mt-3"><SettingsStatus tone="error">{error}</SettingsStatus></div> : null}
        {draft ? (
          <div className="mt-4 space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-[13px] text-[#374151]">
            {draft.headline ? <p><span className="font-semibold">Headline:</span> {draft.headline}</p> : null}
            {draft.bio ? <p><span className="font-semibold">Bio:</span> {draft.bio}</p> : null}
            {draft.skills?.length ? (
              <p><span className="font-semibold">Skills:</span> {draft.skills.join(", ")}</p>
            ) : null}
            {draft.experience?.length ? (
              <div>
                <p className="font-semibold">Experience drafts ({draft.experience.length})</p>
                <ul className="mt-1 list-disc pl-5">
                  {draft.experience.map((entry, index) => (
                    <li key={`${entry.title}-${index}`}>
                      {entry.title}
                      {entry.organization ? ` · ${entry.organization}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft.education?.length ? (
              <div>
                <p className="font-semibold">Education drafts ({draft.education.length})</p>
                <ul className="mt-1 list-disc pl-5">
                  {draft.education.map((entry, index) => (
                    <li key={`${entry.title}-${index}`}>
                      {entry.title}
                      {entry.organization ? ` · ${entry.organization}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft.notes?.length ? (
              <p className="text-[#B45309]"><span className="font-semibold">Needs confirmation:</span> {draft.notes.join(" · ")}</p>
            ) : null}
            <SettingsButton loading={applying} onClick={() => void applySafeFields()}>
              I reviewed this — save approved fields
            </SettingsButton>
          </div>
        ) : null}
      </SettingsCard>
    </div>
  );
}
