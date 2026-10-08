"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/store/use-ai-store";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import {
  AffiliateCoinsVisual,
  BrandMegaphoneVisual,
  BuildCommunitiesVisual,
  BuyerBagVisual,
  CommunityPeopleVisual,
  CreateCampaignsVisual,
  CreatorMediaVisual,
  EarnCommissionsVisual,
  JoinCampaignsVisual,
  SellProductsVisual,
} from "./journey-visuals";
import {
  JOURNEY_CARDS,
  type JourneyCardConfig,
  type JourneyVisualKey,
} from "./choose-your-journey-data";

const ORANGE = "#FF5A1F";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

function WalletVisual() {
  return (
    <svg viewBox="0 0 160 130" className="h-full w-full" aria-hidden>
      <ellipse cx="80" cy="118" rx="42" ry="7" fill="rgba(17,24,39,0.07)" />
      <rect
        x="36"
        y="42"
        width="88"
        height="58"
        rx="12"
        fill="#FFFFFF"
        stroke="rgba(17,24,39,0.1)"
      />
      <rect x="36" y="42" width="88" height="18" rx="10" fill={ORANGE} />
      <rect x="48" y="68" width="36" height="8" rx="4" fill="#E5E7EB" />
      <rect x="48" y="82" width="24" height="6" rx="3" fill="#F3F4F6" />
      <circle cx="108" cy="80" r="10" fill={`${ORANGE}22`} stroke={ORANGE} strokeWidth="2" />
      <path
        d="M104 80h8M108 76v8"
        stroke={ORANGE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="92" y="28" width="18" height="28" rx="3" fill="#16a34a" opacity="0.9" />
      <rect x="100" y="22" width="18" height="28" rx="3" fill="#22c55e" />
    </svg>
  );
}

function AiVisual() {
  return (
    <svg viewBox="0 0 160 130" className="h-full w-full" aria-hidden>
      <ellipse cx="80" cy="118" rx="40" ry="7" fill="rgba(17,24,39,0.07)" />
      <circle cx="80" cy="68" r="36" fill="#FFFFFF" stroke="rgba(17,24,39,0.1)" />
      <circle cx="80" cy="68" r="28" fill="#FFF4EF" />
      <circle cx="68" cy="64" r="4.5" fill="#111827" />
      <circle cx="92" cy="64" r="4.5" fill="#111827" />
      <path
        d="M70 78 Q80 86 90 78"
        fill="none"
        stroke={ORANGE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="72" y="40" width="16" height="8" rx="3" fill={ORANGE} />
      <circle cx="110" cy="42" r="8" fill={`${ORANGE}20`} />
      <path
        d="M110 37v10M105 42h10"
        stroke={ORANGE}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LiveVisual() {
  return (
    <svg viewBox="0 0 160 130" className="h-full w-full" aria-hidden>
      <ellipse cx="80" cy="118" rx="40" ry="7" fill="rgba(17,24,39,0.07)" />
      <rect
        x="48"
        y="48"
        width="64"
        height="52"
        rx="14"
        fill="#FFFFFF"
        stroke="rgba(17,24,39,0.1)"
      />
      <rect x="58" y="60" width="44" height="20" rx="6" fill={ORANGE} />
      <text
        x="80"
        y="74"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        LIVE
      </text>
      <path
        d="M80 42v8"
        stroke={ORANGE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="80" cy="38" r="5" fill={ORANGE} />
      <path
        d="M58 40 Q80 22 102 40"
        fill="none"
        stroke={`${ORANGE}70`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M50 34 Q80 12 110 34"
        fill="none"
        stroke={`${ORANGE}40`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JourneyVisual({ id }: { id: JourneyVisualKey }) {
  switch (id) {
    case "marketplace":
      return <BuyerBagVisual accent={ORANGE} />;
    case "commerce":
      return <SellProductsVisual accent={ORANGE} />;
    case "affiliates":
      return <EarnCommissionsVisual accent={ORANGE} />;
    case "ugc":
      return <CreateCampaignsVisual accent={ORANGE} />;
    case "communities":
      return <CommunityPeopleVisual accent={ORANGE} />;
    case "digital":
      return <JoinCampaignsVisual accent={ORANGE} />;
    case "monetize":
      return <AffiliateCoinsVisual accent={ORANGE} />;
    case "campaigns":
      return <BrandMegaphoneVisual accent={ORANGE} />;
    case "live":
      return <LiveVisual />;
    case "global":
      return <BuildCommunitiesVisual accent={ORANGE} />;
    case "wallet":
      return <WalletVisual />;
    case "ai":
      return <AiVisual />;
    default:
      return <CreatorMediaVisual accent={ORANGE} />;
  }
}

function JourneyCard({ card }: { card: JourneyCardConfig }) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const setPageContext = useAIStore((s) => s.setPageContext);

  const openAi = () => {
    setPageContext("home", "/");
    openAssistant("Help me get started on Jimvio.");
  };

  const body = (
    <>
      <div className="flex flex-col items-start gap-1.5 px-2 pt-2 sm:flex-row sm:gap-3 sm:px-5 sm:pt-5">
        <div
          className={cn(
            "jimvio-eco-visual relative h-9 w-9 shrink-0 sm:h-[80px] sm:w-[80px]",
            "drop-shadow-[0_8px_16px_rgba(17,24,39,0.1)] transition-transform duration-300",
            "group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
          )}
          aria-hidden
        >
          <JourneyVisual id={card.visual} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[17px]">
            {card.title}
          </h3>
          <p className="mt-0.5 text-[10.5px] leading-[1.35] text-[#6B7280] sm:mt-1.5 sm:text-[13px] sm:leading-relaxed">
            {card.description}
          </p>
        </div>
      </div>

      <ul className="mt-1.5 space-y-0.5 px-2 sm:mt-4 sm:space-y-2 sm:px-5">
        {card.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-1 text-[10.5px] font-medium leading-snug text-[#374151] sm:items-center sm:gap-2.5 sm:text-[13px]"
          >
            <span className="mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F]/12 text-[#FF5A1F] sm:mt-0 sm:size-5">
              <Check className="size-2 sm:size-3" strokeWidth={2.8} aria-hidden />
            </span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="mt-auto px-1.5 pb-1.5 pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-4">
        <span
          className={cn(
            "jimvio-eco-cta flex min-h-10 items-center justify-center rounded-[10px] px-2 text-center",
            "bg-[#FFF1EB] text-[11px] font-bold leading-tight tracking-[-0.01em] text-[#FF5A1F] sm:min-h-11 sm:rounded-[12px] sm:text-[13.5px]",
            "transition-[background-color,color] duration-200",
            "group-hover:bg-[#FFE4D8] motion-reduce:transition-none",
          )}
        >
          {card.cta}
        </span>
      </div>
    </>
  );

  const className = cn(
    "group jimvio-eco-card flex h-full flex-col overflow-hidden rounded-[14px] border border-[rgba(17,24,39,0.07)] sm:rounded-[20px]",
    "bg-[linear-gradient(180deg,#FFFCFB_0%,#FFFFFF_42%)] shadow-[0_8px_24px_rgba(17,24,39,0.045)]",
    "transition-[transform,box-shadow,border-color] duration-300",
    "hover:-translate-y-0.5 hover:border-[rgba(255,90,31,0.22)] hover:shadow-[0_14px_32px_rgba(17,24,39,0.08)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
  );

  if (card.action.type === "ai") {
    return (
      <button
        type="button"
        onClick={openAi}
        className={cn(className, "w-full text-left")}
        aria-label={`${card.title}. ${card.cta}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={card.action.href}
      className={className}
      aria-label={`${card.title}. ${card.cta}`}
    >
      {body}
    </Link>
  );
}

export function ChooseYourJourney() {
  return (
    <SectionReveal
      className="jimvio-journey-hub jimvio-home-section relative overflow-x-clip"
      aria-labelledby="jimvio-journey-title"
      threshold={0.08}
    >
      <div className={shell}>
        <header className="mb-4 text-center sm:mb-6">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-journey-title"
            className="text-[clamp(1.4rem,3vw,2.05rem)] font-black tracking-[-0.035em] text-[#111827]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            Choose Your <span className="text-[#FF5A1F]">Journey</span>
          </RevealItem>
          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B7280] sm:text-[15px]"
            style={{ ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms` }}
          >
            One account — create, earn, sell or buy depending on what you need right now.
          </RevealItem>
        </header>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-5 lg:grid-cols-4">
          {JOURNEY_CARDS.map((card, index) => (
            <RevealItem key={card.id} index={Math.min(index + 2, 8)} as="div" className="h-full">
              <JourneyCard card={card} />
            </RevealItem>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}
