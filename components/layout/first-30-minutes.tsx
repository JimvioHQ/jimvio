"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AffiliateCoinsVisual,
  BrandMegaphoneVisual,
  BuyProductsVisual,
  CommunityPeopleVisual,
  CreateCampaignsVisual,
  CreatorMediaVisual,
  SellProductsVisual,
} from "./journey-visuals";
import {
  getOnboardingRole,
  ONBOARDING_ROLES,
  type OnboardingRole,
  type OnboardingRoleId,
} from "./first-30-minutes-data";

const ORANGE = "#FF5A1F";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

function RoleVisual({ role }: { role: OnboardingRole }) {
  switch (role.visual) {
    case "marketplace":
      return <BuyProductsVisual accent={ORANGE} />;
    case "brands":
      return <BrandMegaphoneVisual accent={ORANGE} />;
    case "affiliates":
      return <AffiliateCoinsVisual accent={ORANGE} />;
    case "dropship":
      return <SellProductsVisual accent={ORANGE} />;
    case "creators":
      return <CreateCampaignsVisual accent={ORANGE} />;
    case "live":
      return <CreatorMediaVisual accent={ORANGE} />;
    case "community":
      return <CommunityPeopleVisual accent={ORANGE} />;
    case "digital":
      return <CreatorMediaVisual accent={ORANGE} />;
    default:
      return <BuyProductsVisual accent={ORANGE} />;
  }
}

function RoleSelector({
  active,
  onSelect,
}: {
  active: OnboardingRoleId;
  onSelect: (id: OnboardingRoleId) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const idx = ONBOARDING_ROLES.findIndex((r) => r.id === active);
    if (idx < 0) return;
    let next = idx;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = (idx + 1) % ONBOARDING_ROLES.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = (idx - 1 + ONBOARDING_ROLES.length) % ONBOARDING_ROLES.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = ONBOARDING_ROLES.length - 1;
    } else return;
    onSelect(ONBOARDING_ROLES[next].id);
    requestAnimationFrame(() => {
      scrollerRef.current
        ?.querySelector<HTMLElement>(`[data-role-id="${ONBOARDING_ROLES[next].id}"]`)
        ?.focus();
    });
  };

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      id={listId}
      aria-label="Choose your Jimvio path"
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-max min-w-full gap-5 border-b border-[rgba(17,24,39,0.08)] sm:gap-7",
        "snap-x snap-mandatory",
      )}
    >
      {ONBOARDING_ROLES.map((role) => {
        const selected = role.id === active;
        return (
          <button
            key={role.id}
            type="button"
            role="tab"
            data-role-id={role.id}
            id={`onboard-tab-${role.id}`}
            aria-selected={selected}
            aria-controls="jimvio-onboard-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(role.id)}
            className={cn(
              "snap-start -mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-0.5 pb-3 pt-2 text-[13px] font-semibold tracking-[-0.01em] sm:text-[14.5px]",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
              selected
                ? "border-[#FF5A1F] text-[#FF5A1F]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]",
            )}
          >
            <span className="whitespace-nowrap">{role.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

function ProgressRing() {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-[120px]" aria-hidden>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={c * 0.98}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[18px] font-black text-[#111827]">0%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
          Complete
        </span>
      </div>
    </div>
  );
}

function RoleBoard({ role }: { role: OnboardingRole }) {
  return (
    <div
      key={role.id}
      id="jimvio-onboard-panel"
      role="tabpanel"
      aria-labelledby={`onboard-tab-${role.id}`}
      className="jimvio-onboard-panel grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
    >
      {/* Left */}
      <article className="flex flex-col rounded-[22px] border border-[rgba(17,24,39,0.07)] bg-white p-5 shadow-[0_8px_22px_rgba(17,24,39,0.04)] sm:p-6">
        <span className="inline-flex w-fit rounded-full bg-[#FFF1EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
          {role.badge}
        </span>
        <h3 className="mt-3 text-[20px] font-black tracking-[-0.03em] text-[#111827] sm:text-[22px]">
          {role.headline}
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#6B7280]">{role.description}</p>

        <ul className="mt-4 space-y-2">
          {role.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] font-medium text-[#374151]">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F] text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-5 h-[100px] w-[120px]" aria-hidden>
          <RoleVisual role={role} />
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-5 sm:flex-row">
          <Link
            href={role.primaryCta.href}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 text-[13.5px] font-bold text-white shadow-[0_8px_18px_rgba(255,90,31,0.28)] transition-colors hover:bg-[#e84e16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            {role.primaryCta.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <Link
            href={role.secondaryCta.href}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[rgba(17,24,39,0.12)] bg-white px-4 text-[13.5px] font-bold text-[#111827] transition-colors hover:border-[rgba(255,90,31,0.35)] hover:bg-[#FFF8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            {role.secondaryCta.label}
          </Link>
        </div>
      </article>

      {/* Middle timeline */}
      <article className="flex flex-col rounded-[22px] border border-[rgba(17,24,39,0.07)] bg-white p-5 shadow-[0_8px_22px_rgba(17,24,39,0.04)] sm:p-6">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-[#111827] sm:text-[18px]">
          Your 30-minute setup plan
        </h3>
        <p className="mt-1.5 text-[13px] text-[#6B7280]">
          Follow these simple steps to get started on this path.
        </p>

        <ol className="relative mt-5 flex-1 space-y-3 border-l border-dashed border-[rgba(255,90,31,0.35)] pl-4">
          {role.steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className={cn(
                  "relative rounded-[14px] px-3 py-2.5",
                  i === 0 ? "bg-[#FFF4EF]" : "bg-transparent",
                )}
              >
                <span className="absolute -left-[21px] top-3.5 size-2.5 rounded-full bg-[#FF5A1F] ring-4 ring-white" />
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#FF5A1F] shadow-sm">
                    <Icon className="size-3.5" strokeWidth={2.2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                      {step.time}
                    </p>
                    <p className="text-[13.5px] font-bold text-[#111827]">{step.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-[rgba(17,24,39,0.06)] pt-4">
          {role.workflow.map((w, i) => {
            const Icon = w.icon;
            return (
              <div key={w.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(17,24,39,0.08)] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-semibold text-[#4B5563]">
                  <Icon className="size-3 text-[#FF5A1F]" aria-hidden />
                  {w.label}
                </span>
                {i < role.workflow.length - 1 ? (
                  <ArrowRight className="size-3 text-[#D1D5DB]" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </article>

      {/* Right progress */}
      <article className="flex flex-col rounded-[22px] border border-[rgba(17,24,39,0.07)] bg-white p-5 shadow-[0_8px_22px_rgba(17,24,39,0.04)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-black tracking-[-0.02em] text-[#111827]">
              Your first 30 minutes
            </h3>
            <p className="mt-1 text-[12.5px] text-[#6B7280]">
              Get from zero to your first result.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1EB] px-2.5 py-1 text-[11px] font-bold text-[#FF5A1F]">
            <Clock className="size-3.5" aria-hidden />
            30 min
          </span>
        </div>

        <div className="mt-5">
          <ProgressRing />
        </div>

        <ul className="mt-5 space-y-2.5">
          {role.steps.map((step) => (
            <li key={step.checklist} className="flex items-center gap-2.5 text-[13px] text-[#374151]">
              <span
                className="size-4 shrink-0 rounded-full border-2 border-[#D1D5DB]"
                aria-hidden
              />
              <span>
                <span className="font-semibold text-[#111827]">{step.checklist}</span>
                <span className="ml-1.5 text-[11px] text-[#9CA3AF]">{step.time}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-start gap-2.5 rounded-[14px] bg-[#FFF4EF] p-3.5 pt-4">
          <Trophy className="mt-0.5 size-5 shrink-0 text-[#FF5A1F]" aria-hidden />
          <p className="text-[12.5px] leading-relaxed font-medium text-[#374151]">
            {role.progressHint}
          </p>
        </div>
      </article>
    </div>
  );
}

export function First30Minutes() {
  const [activeRole, setActiveRole] = useState<OnboardingRoleId>("buyers-sellers");
  const role = getOnboardingRole(activeRole);

  return (
    <section
      className="jimvio-first-30 relative overflow-x-clip py-12 sm:py-14 lg:py-16"
      aria-labelledby="jimvio-first-30-title"
    >
      <style>{`
        .jimvio-onboard-panel { animation: jimvio-onboard-in 260ms cubic-bezier(0.16,1,0.3,1); }
        @keyframes jimvio-onboard-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jimvio-onboard-panel { animation: none; }
        }
      `}</style>

      <div className={shell}>
        <header className="mb-6 max-w-2xl sm:mb-7">
          <h2
            id="jimvio-first-30-title"
            className="text-[clamp(1.7rem,3.4vw,2.35rem)] font-black tracking-[-0.04em] text-[#111827]"
          >
            Your first 30 minutes on Jimvio
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280] sm:text-[16px]">
            Choose your path and get your Jimvio setup ready in 30 minutes.
          </p>
        </header>

        <div className="mb-5 min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:mb-6 [&::-webkit-scrollbar]:hidden">
          <RoleSelector active={activeRole} onSelect={setActiveRole} />
        </div>

        <RoleBoard role={role} />

        <p className="sr-only" aria-live="polite">
          Showing onboarding path for {role.label}
        </p>
      </div>
    </section>
  );
}
