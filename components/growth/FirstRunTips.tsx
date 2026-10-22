"use client";

import Link from "next/link";
import { Lightbulb, X } from "lucide-react";
import { useEffect, useState } from "react";

const TIPS = [
  {
    id: "profile",
    text: "Complete your profile so people recognize you across Jimvio.",
    href: "/settings/profile",
    cta: "Edit profile",
  },
  {
    id: "notifications",
    text: "Choose which updates you want — stay in control of your inbox.",
    href: "/settings/notifications",
    cta: "Notification settings",
  },
  {
    id: "explore",
    text: "Join a community or follow creators to personalize your feed.",
    href: "/communities",
    cta: "Explore communities",
  },
];

export function FirstRunTips({ dismissed = [] }: { dismissed?: string[] }) {
  const [hidden, setHidden] = useState(dismissed);
  useEffect(() => {
    fetch("/api/growth/onboarding")
      .then((response) => (response.ok ? response.json() : null))
      .then((onboarding) => {
        if (Array.isArray(onboarding?.tips_dismissed)) setHidden(onboarding.tips_dismissed);
      })
      .catch(() => undefined);
  }, []);
  const visible = TIPS.filter((tip) => !hidden.includes(tip.id));
  if (!visible.length) return null;

  async function dismiss(tipId: string) {
    setHidden((current) => [...current, tipId]);
    await fetch("/api/growth/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "dismiss_tip", tipId }),
    });
  }

  return (
    <aside className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <Lightbulb className="h-4 w-4 text-[#fd5000]" /> Getting started
      </div>
      <div className="space-y-3">
        {visible.map((tip) => (
          <div key={tip.id} className="flex items-start justify-between gap-3 text-sm text-[var(--color-text-muted)]">
            <div>
              <p>{tip.text}</p>
              <Link href={tip.href} className="mt-1 inline-block text-xs font-semibold text-[#fd5000] hover:underline">
                {tip.cta}
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss tip"
              onClick={() => dismiss(tip.id)}
              className="text-[var(--color-text-muted)] hover:text-[#fd5000]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
