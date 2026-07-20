"use client";

import { useEffect, useState } from "react";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { Checklist, WelcomeIntent } from "@/lib/growth/onboarding-checklist";

type Onboarding = {
  welcome_intent: WelcomeIntent | null;
  checklist: Checklist;
  progress_percent: number;
};

export function ProgressTracker() {
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);

  useEffect(() => {
    fetch("/api/growth/onboarding")
      .then((response) => response.ok ? response.json() : null)
      .then(setOnboarding)
      .catch(() => undefined);
  }, []);

  if (!onboarding?.welcome_intent || onboarding.progress_percent >= 100) return null;
  return (
    <div className="mt-5">
      <OnboardingChecklist
        intent={onboarding.welcome_intent}
        checklist={onboarding.checklist ?? {}}
        onUpdated={(checklist, progress_percent) => setOnboarding({ ...onboarding, checklist, progress_percent })}
      />
    </div>
  );
}
