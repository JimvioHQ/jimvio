"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Clapperboard,
  Sparkles,
  Store,
  Users,
  Zap,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { MARKETPLACE_GROWTH_PATHS } from "@/lib/marketplace/experience";
import { useAIStore } from "@/lib/store/use-ai-store";
import { cn } from "@/lib/utils";

type ProductType = "physical" | "digital";

type Props = {
  productType?: ProductType;
  listingCount?: number;
  onSearchPick?: (term: string) => void;
};

const GROWTH_ICONS: Record<(typeof MARKETPLACE_GROWTH_PATHS)[number]["id"], LucideIcon> = {
  affiliates: BadgeDollarSign,
  ugc: Clapperboard,
  dropshipping: Store,
  communities: Users,
};

function getDiscoveryChips(type: ProductType) {
  const shared = [
    {
      id: "flash",
      label: "Flash deals",
      icon: Zap,
      action: "scroll" as const,
      target: "flash-deals-section",
    },
    {
      id: "ai-deals",
      label: "AI deal finder",
      icon: Sparkles,
      action: "ai" as const,
      prompt:
        type === "digital"
          ? "Show me the best deals on digital products, courses, ebooks, and templates."
          : "Show me the best deals and discounts on physical products right now.",
    },
    {
      id: "affiliate",
      label: "High commission",
      icon: TrendingUp,
      action: "link" as const,
      href: "/affiliates",
    },
    {
      id: "rated",
      label: "Top rated",
      icon: Star,
      action: "search" as const,
      term: "top rated",
    },
  ];

  if (type === "digital") {
    return [
      ...shared,
      {
        id: "courses",
        label: "Courses & tools",
        icon: Sparkles,
        action: "search" as const,
        term: "course",
      },
    ];
  }

  return [
    ...shared,
    {
      id: "shipping",
      label: "Free shipping",
      icon: Zap,
      action: "search" as const,
      term: "free shipping",
    },
  ];
}

export function MarketplaceEngagementHub({
  productType = "physical",
  onSearchPick,
}: Props) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const chips = getDiscoveryChips(productType);

  function handleChip(chip: (typeof chips)[number]) {
    if (chip.action === "scroll" && "target" in chip) {
      document.getElementById(chip.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (chip.action === "ai" && "prompt" in chip) {
      openAssistant(chip.prompt);
      return;
    }
    if (chip.action === "search" && "term" in chip) {
      onSearchPick?.(chip.term);
      return;
    }
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ boxShadow: "var(--shadow-sm)" }}
      aria-label="Grow and discover on Jimvio"
    >
      <div
        className="flex flex-col gap-1 border-b border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{ background: "var(--color-surface-secondary)" }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            More than a marketplace
          </p>
          <h3 className="text-sm font-black text-[var(--color-text-primary)] sm:text-[15px]">
            Shop, earn, create &amp; sell — all in one place
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
        {MARKETPLACE_GROWTH_PATHS.map((path) => {
          const Icon = GROWTH_ICONS[path.id];
          return (
            <Link
              key={path.id}
              href={path.href}
              aria-label={`${path.title}. ${path.cta}`}
              className={cn(
                "group flex min-h-[108px] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-all",
                "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] hover:shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
                "active:scale-[0.98]",
              )}
            >
              <span className="mb-2 grid size-9 place-items-center rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-surface)]">
                <Icon className="size-4" strokeWidth={2.25} aria-hidden />
              </span>
              <p className="text-[12px] font-bold leading-tight text-[var(--color-accent-hover)] sm:text-[13px]">
                {path.title}
              </p>
              <p className="mt-1 flex-1 text-[10px] leading-snug text-[var(--color-text-muted)] sm:text-[11px]">
                {path.description}
              </p>
              <span className="mt-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)] sm:text-[11px]">
                {path.cta}
                <ArrowRight className="size-3" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Quick discovery</p>
          <button
            type="button"
            onClick={() =>
              openAssistant(
                productType === "digital"
                  ? "Recommend digital products I can buy or promote on Jimvio."
                  : "Recommend physical products trending on Jimvio that I can buy or promote.",
              )
            }
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-accent)" }}
          >
            <Sparkles className="size-3" />
            Ask Jimvio AI
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const Icon = chip.icon;
            if (chip.action === "link" && "href" in chip) {
              return (
                <Link
                  key={chip.id}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <Icon className="size-3.5 shrink-0" />
                  {chip.label}
                </Link>
              );
            }
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChip(chip)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <Icon className="size-3.5 shrink-0" />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
