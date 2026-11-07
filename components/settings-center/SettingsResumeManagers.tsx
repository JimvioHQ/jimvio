"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, GraduationCap, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import type {
  IdentityProfilePayload,
  IdentityResumeEntry,
  IdentityResumeEntryType,
} from "@/lib/identity/types";
import {
  SettingsButton,
  SettingsCard,
  SettingsField,
  settingsInputClass,
  settingsTextareaClass,
} from "./settings-ui";

type ResumeDraft = {
  title: string;
  organization: string;
  description: string;
  startedOn: string;
  endedOn: string;
  isCurrent: boolean;
};

const emptyDraft = (): ResumeDraft => ({
  title: "",
  organization: "",
  description: "",
  startedOn: "",
  endedOn: "",
  isCurrent: false,
});

/**
 * Additive Identity 2.0 managers for experience, education/credentials, and
 * contact preferences. Does not replace existing profile/social/portfolio settings.
 */
export function SettingsResumeManagers({
  initialPayload,
}: {
  initialPayload: IdentityProfilePayload;
}) {
  const [resume, setResume] = useState<IdentityResumeEntry[]>(initialPayload.resume);
  const [contactPreferences, setContactPreferences] = useState(
    initialPayload.profile.contactPreferences,
  );
  const [experienceDraft, setExperienceDraft] = useState<ResumeDraft>(emptyDraft());
  const [educationDraft, setEducationDraft] = useState<ResumeDraft>(emptyDraft());
  const [educationType, setEducationType] = useState<"education" | "certification">("education");
  const [busy, setBusy] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const experience = useMemo(
    () => resume.filter((entry) => entry.entryType === "experience" || entry.entryType === "industry"),
    [resume],
  );
  const education = useMemo(
    () => resume.filter((entry) => entry.entryType === "education" || entry.entryType === "certification"),
    [resume],
  );

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  async function addEntry(entryType: IdentityResumeEntryType, draft: ResumeDraft) {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/identity/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          title: draft.title.trim(),
          organization: draft.organization.trim() || null,
          description: draft.description.trim() || null,
          startedOn: draft.startedOn || null,
          endedOn: draft.isCurrent ? null : draft.endedOn || null,
          isCurrent: draft.isCurrent,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add entry");
      if (json.entry) setResume((current) => [...current, json.entry]);
      toast.success("Entry added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add entry");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/identity/resume?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete entry");
      setResume((current) => current.filter((entry) => entry.id !== id));
      toast.success("Entry removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function saveContactPreferences() {
    setSavingContact(true);
    try {
      const res = await fetch("/api/identity/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPreferences }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save contact preferences");
      toast.success("Contact preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingContact(false);
    }
  }

  return (
    <div id="identity-managers" className="mt-8 space-y-5 scroll-mt-24">
      <div>
        <h2 className="text-[18px] font-semibold text-[#111827]">Experience, credentials & services</h2>
        <p className="mt-1 text-[13.5px] text-[#6B7280]">
          Additions for Jimvio Identity 2.0. Your existing profile, social, skills, and portfolio
          settings above stay unchanged.
        </p>
      </div>

      <div id="identity-managers-experience" className="scroll-mt-24">
        <SettingsCard
          title="Experience manager"
          description="Roles and impact shown in Experience & Impact. Enable Resume visibility in Privacy settings to show these publicly."
          icon={<Briefcase className="h-4 w-4" />}
        >
          <ResumeEditor
            entries={experience}
            draft={experienceDraft}
            setDraft={setExperienceDraft}
            busy={busy}
            onAdd={() =>
              void addEntry("experience", experienceDraft).then(() => setExperienceDraft(emptyDraft()))
            }
            onDelete={(id) => void deleteEntry(id)}
            addLabel="Add experience"
          />
        </SettingsCard>
      </div>

      <div id="identity-managers-education" className="scroll-mt-24">
        <SettingsCard
          title="Education & credentials manager"
          description="Degrees and certifications. Self-reported entries are never shown as issuer-verified."
          icon={<GraduationCap className="h-4 w-4" />}
        >
          <div className="mb-3">
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">Entry type</label>
            <select
              className={settingsInputClass}
              value={educationType}
              onChange={(event) =>
                setEducationType(event.target.value as "education" | "certification")
              }
            >
              <option value="education">Education</option>
              <option value="certification">Certification / credential</option>
            </select>
          </div>
          <ResumeEditor
            entries={education}
            draft={educationDraft}
            setDraft={setEducationDraft}
            busy={busy}
            onAdd={() =>
              void addEntry(educationType, educationDraft).then(() => setEducationDraft(emptyDraft()))
            }
            onDelete={(id) => void deleteEntry(id)}
            addLabel={educationType === "education" ? "Add education" : "Add credential"}
          />
        </SettingsCard>
      </div>

      <div id="identity-managers-services" className="scroll-mt-24">
        <SettingsCard
          title="Services & contact manager"
          description="Inquiry and booking preferences for Services & Contact."
          icon={<Wrench className="h-4 w-4" />}
        >
          <div className="space-y-2">
            {(
              [
                ["in_app", "In-app messages"],
                ["email", "Email inquiries"],
                ["booking", "Bookings"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
              >
                <span className="text-[14px] font-medium text-[#111827]">{label}</span>
                <input
                  type="checkbox"
                  checked={contactPreferences[key]}
                  onChange={(event) =>
                    setContactPreferences((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F] focus:ring-[#FF5A1F]/30"
                />
              </label>
            ))}
          </div>
          <div className="mt-3">
            <SettingsButton onClick={() => void saveContactPreferences()} loading={savingContact}>
              Save contact preferences
            </SettingsButton>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function ResumeEditor({
  entries,
  draft,
  setDraft,
  busy,
  onAdd,
  onDelete,
  addLabel,
}: {
  entries: IdentityResumeEntry[];
  draft: ResumeDraft;
  setDraft: React.Dispatch<React.SetStateAction<ResumeDraft>>;
  busy: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#111827]">{entry.title}</p>
            <p className="text-[12.5px] text-[#6B7280]">
              {entry.organization || entry.entryType}
              {entry.isCurrent ? " · Current" : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(entry.id)}
            className="rounded-lg p-2 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            aria-label={`Delete ${entry.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsField label="Title" htmlFor={`resume-title-${addLabel}`}>
          <input
            id={`resume-title-${addLabel}`}
            className={settingsInputClass}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </SettingsField>
        <SettingsField label="Organization" htmlFor={`resume-org-${addLabel}`}>
          <input
            id={`resume-org-${addLabel}`}
            className={settingsInputClass}
            value={draft.organization}
            onChange={(event) =>
              setDraft((current) => ({ ...current, organization: event.target.value }))
            }
          />
        </SettingsField>
      </div>
      <SettingsField label="Description" htmlFor={`resume-desc-${addLabel}`}>
        <textarea
          id={`resume-desc-${addLabel}`}
          className={settingsTextareaClass}
          rows={3}
          value={draft.description}
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.target.value }))
          }
        />
      </SettingsField>
      <div className="grid gap-3 sm:grid-cols-3">
        <SettingsField label="Start date" htmlFor={`resume-start-${addLabel}`}>
          <input
            id={`resume-start-${addLabel}`}
            type="date"
            className={settingsInputClass}
            value={draft.startedOn}
            onChange={(event) =>
              setDraft((current) => ({ ...current, startedOn: event.target.value }))
            }
          />
        </SettingsField>
        <SettingsField label="End date" htmlFor={`resume-end-${addLabel}`}>
          <input
            id={`resume-end-${addLabel}`}
            type="date"
            className={settingsInputClass}
            value={draft.endedOn}
            disabled={draft.isCurrent}
            onChange={(event) =>
              setDraft((current) => ({ ...current, endedOn: event.target.value }))
            }
          />
        </SettingsField>
        <label className="mt-6 flex items-center gap-2 text-[13px] text-[#374151]">
          <input
            type="checkbox"
            checked={draft.isCurrent}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isCurrent: event.target.checked }))
            }
            className="h-4 w-4 rounded border-[#D1D5DB] text-[#FF5A1F]"
          />
          Current
        </label>
      </div>
      <SettingsButton onClick={onAdd} loading={busy}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </SettingsButton>
    </div>
  );
}
