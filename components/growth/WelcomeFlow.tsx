"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Handshake, Store, Wand2 } from "lucide-react";

const intents = [
  { id: "browse", title: "Browse", description: "Discover products, people, and ideas.", href: "/marketplace", icon: Compass },
  { id: "create", title: "Create", description: "Build your audience and publish.", href: "/creator", icon: Wand2 },
  { id: "sell", title: "Sell", description: "Start a storefront and earn.", href: "/dashboard/activate/vendor", icon: Store },
  { id: "join", title: "Join", description: "Find a community that fits.", href: "/communities", icon: Handshake },
] as const;

export function WelcomeFlow() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [variant, setVariant] = useState<"control" | "variant">("control");

  useEffect(() => {
    fetch("/api/growth/experiments?key=welcome_cta_copy")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const assignedVariant = data?.variant === "variant" ? "variant" : "control";
        if (assignedVariant === "variant") {
          setVariant("variant");
        }
        void fetch("/api/growth/experiments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: "welcome_cta_copy", variant: assignedVariant }),
        });
      })
      .catch(() => undefined);
  }, []);

  async function selectIntent(intent: (typeof intents)[number]) {
    setPending(intent.id);
    await fetch("/api/growth/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "complete_welcome", intent: intent.id }),
    });
    void fetch("/api/growth/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "growth.welcome_intent_selected", properties: { intent: intent.id } }),
    });
    router.push(intent.href);
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#fd5000]">Welcome to Jimvio</p>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">What brings you here?</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-6 text-[var(--color-text-muted)]">
        Pick a starting point. We&apos;ll personalize your first steps — you can explore everything else anytime.
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
        <li>Choose how you want to start</li>
        <li>Follow the checklist on your dashboard</li>
        <li>Use Settings → Feedback or Help → Send Feedback anytime</li>
      </ol>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {intents.map((intent) => {
          const Icon = intent.icon;
          return (
            <button
              key={intent.id}
              type="button"
              onClick={() => selectIntent(intent)}
              disabled={Boolean(pending)}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition hover:border-[#fd5000] hover:shadow-sm disabled:opacity-60"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#fd5000] dark:bg-orange-950/30">
                <Icon className="h-5 w-5" />
              </span>
              <span className="block font-semibold text-[var(--color-text-primary)]">{pending === intent.id ? "Saving…" : variant === "variant" ? `Start with ${intent.title}` : intent.title}</span>
              <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{intent.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
