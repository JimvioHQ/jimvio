"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { SettingsCard } from "./settings-ui";

const FIELD_HELP: Record<string, { public: string; private: string }> = {
  showBio: {
    public: "Visitors can read your biography.",
    private: "Your biography stays hidden from non-owners.",
  },
  showLocation: {
    public: "City and country appear on your profile.",
    private: "Location is hidden from public visitors.",
  },
  showWebsite: {
    public: "Your website link is shown.",
    private: "Website is hidden from public visitors.",
  },
  showSkills: {
    public: "Skills and languages are visible.",
    private: "Skills and languages stay private.",
  },
  showSocial: {
    public: "Public social icons appear beside Followers.",
    private: "External social links stay hidden.",
  },
  showResume: {
    public:
      "Experience, education, and credentials sections can show resume entries you added.",
    private:
      "Resume and work history remain private (opt-in). APIs also withhold entries for visitors.",
  },
  showPortfolio: {
    public: "Portfolio & Work can show public projects.",
    private: "Portfolio items are withheld from visitors.",
  },
  showBusiness: {
    public: "Business and creator presence can appear.",
    private: "Business/creator details stay limited.",
  },
  showServices: {
    public: "Services and booking options can appear.",
    private: "Services/booking cues stay limited.",
  },
  showContact: {
    public: "Contact preference flags can appear.",
    private: "Contact preference details stay limited.",
  },
};

export function SettingsPrivacyPreview({
  username,
  fields,
}: {
  username?: string | null;
  fields: Record<string, boolean>;
}) {
  const profileHref = username ? `/u/${encodeURIComponent(username)}` : null;
  const resumeOn = fields.showResume === true;

  return (
    <SettingsCard
      title="Public visitor preview"
      description="What visitors can see depends on the toggles above. Resume and work history stay private until you opt in."
      icon={<Eye className="h-4 w-4" />}
    >
      <div className="space-y-2 text-[13px]">
        <div
          className={`rounded-xl border px-3.5 py-3 ${
            resumeOn ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#FECACA] bg-[#FEF2F2]"
          }`}
        >
          <p className="font-semibold text-[#111827]">Resume and work history</p>
          <p className="mt-1 text-[#4B5563]">
            {resumeOn ? FIELD_HELP.showResume.public : FIELD_HELP.showResume.private}
          </p>
        </div>
        {(
          [
            "showBio",
            "showLocation",
            "showSkills",
            "showSocial",
            "showPortfolio",
            "showServices",
          ] as const
        ).map((key) => {
          const on = fields[key] !== false;
          const help = FIELD_HELP[key];
          return (
            <div key={key} className="rounded-xl border border-[#E5E7EB] px-3.5 py-2.5">
              <p className="font-medium text-[#111827]">{key.replace(/^show/, "")}</p>
              <p className="mt-0.5 text-[#6B7280]">{on ? help.public : help.private}</p>
            </div>
          );
        })}
      </div>
      {profileHref ? (
        <p className="mt-4 text-[13px] text-[#6B7280]">
          Open your public page in a private/incognito window to verify visitor view:{" "}
          <Link href={profileHref} className="font-semibold text-[#FF5A1F] hover:underline">
            {profileHref}
          </Link>
        </p>
      ) : null}
    </SettingsCard>
  );
}
