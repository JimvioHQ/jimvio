"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Box,
  Calendar,
  Clapperboard,
  ClipboardList,
  Crown,
  DollarSign,
  Download,
  FileText,
  Gift,
  Globe,
  Grid3X3,
  Handshake,
  Laptop,
  Link2,
  Megaphone,
  Monitor,
  Package,
  PenLine,
  Percent,
  Plus,
  Radio,
  Search,
  Share2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Video,
  Wallet,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { MODEL_UNAVAILABLE_REPLY } from "@/lib/ai/chat-turn";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/store/use-ai-store";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";
import { useHomeAutoCycle } from "./use-home-auto-cycle";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import {
  AffiliateCoinsVisual,
  BrandMegaphoneVisual,
  BuildCommunitiesVisual,
  BuyProductsVisual,
  BuyerBagVisual,
  CommunityPeopleVisual,
  CreateCampaignsVisual,
  CreatorMediaVisual,
  EarnCommissionsVisual,
  JoinCampaignsVisual,
  SellProductsVisual,
} from "./journey-visuals";
import {
  DEFAULT_JOURNEY_PATH,
  getJourneyPath,
  JOURNEY_PATHS,
  type JourneyCard,
  type JourneyIconId,
  type JourneyPathId,
  type JourneySecondary,
  type JourneyVisualId,
} from "./action-hub-data";

const ORANGE = "#FF5A1F";
const NAVY = "#111827";
const MUTED = "#6B7280";
const PEACH = "#FFF8F5";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

const ICON_MAP: Record<JourneyIconId, LucideIcon> = {
  users: Users,
  shoppingBag: ShoppingBag,
  store: Store,
  trendingUp: TrendingUp,
  wand: Wand2,
  package: Package,
  radio: Radio,
  bookOpen: BookOpen,
  fileText: FileText,
  percent: Percent,
  laptop: Laptop,
  box: Box,
  clipboard: ClipboardList,
  link: Link2,
  sparkles: Sparkles,
  handshake: Handshake,
  clapperboard: Clapperboard,
  penLine: PenLine,
  search: Search,
  download: Download,
  globe: Globe,
  video: Video,
  share2: Share2,
  shoppingCart: ShoppingCart,
  userCog: UserCog,
  dollarSign: DollarSign,
  calendar: Calendar,
  barChart: BarChart3,
  grid: Grid3X3,
  badgeCheck: BadgeCheck,
  truck: Truck,
  shield: Shield,
  gift: Gift,
  wallet: Wallet,
  plus: Plus,
  megaphone: Megaphone,
  crown: Crown,
  monitor: Monitor,
};

function JourneyVisual({ id }: { id: JourneyVisualId }) {
  switch (id) {
    case "communities":
      return <CommunityPeopleVisual accent={ORANGE} />;
    case "courses":
      return <CreatorMediaVisual accent={ORANGE} />;
    case "post":
      return <JoinCampaignsVisual accent={ORANGE} />;
    case "buy":
      return <BuyProductsVisual accent={ORANGE} />;
    case "deals":
      return <EarnCommissionsVisual accent={ORANGE} />;
    case "digital":
      return <CreatorMediaVisual accent={ORANGE} />;
    case "sell":
      return <SellProductsVisual accent={ORANGE} />;
    case "sellToStore":
      return <BuyerBagVisual accent={ORANGE} />;
    case "commerce":
      return <EarnCommissionsVisual accent={ORANGE} />;
    case "affiliate":
      return <AffiliateCoinsVisual accent={ORANGE} />;
    case "monetize":
      return <CreateCampaignsVisual accent={ORANGE} />;
    case "partnerships":
      return <BrandMegaphoneVisual accent={ORANGE} />;
    case "ugc":
      return <CreateCampaignsVisual accent={ORANGE} />;
    case "clipping":
      return <CreatorMediaVisual accent={ORANGE} />;
    case "findProducts":
      return <BuyProductsVisual accent={ORANGE} />;
    case "import":
      return <SellProductsVisual accent={ORANGE} />;
    case "fulfill":
      return <BuildCommunitiesVisual accent={ORANGE} />;
    case "goLive":
      return <CreatorMediaVisual accent={ORANGE} />;
    case "multiPlatform":
      return <BrandMegaphoneVisual accent={ORANGE} />;
    case "liveCommerce":
      return <BuyerBagVisual accent={ORANGE} />;
    default:
      return null;
  }
}

function PathIcon({ id, className }: { id: JourneyIconId; className?: string }) {
  const Icon = ICON_MAP[id];
  return <Icon className={className} strokeWidth={2.1} aria-hidden />;
}

function CtaControl({
  href,
  label,
  variant = "primary",
}: {
  href: string;
  label: string;
  variant?: JourneyCard["ctaVariant"];
}) {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 motion-reduce:transition-none";

  if (variant === "link") {
    return (
      <Link
        href={href}
        className={cn(base, "px-0 text-[#FF5A1F] hover:gap-2.5")}
        aria-label={label}
      >
        {label}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    );
  }

  if (variant === "outline") {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "border border-[#FF5A1F]/55 bg-white px-4 text-[#FF5A1F] hover:bg-[#FFF4EF] hover:shadow-[0_6px_16px_rgba(255,90,31,0.12)]",
        )}
        aria-label={label}
      >
        {label}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        "bg-[#FF5A1F] px-4 text-white shadow-[0_8px_18px_rgba(255,90,31,0.28)] hover:bg-[#e84e16] hover:shadow-[0_10px_22px_rgba(255,90,31,0.34)] active:scale-[0.98] motion-reduce:active:scale-100",
      )}
      aria-label={label}
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function PrimaryCard({ card }: { card: JourneyCard }) {
  const featured = Boolean(card.featured);

  return (
    <article
      className={cn(
        "group relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-[22px] border bg-white p-4 sm:min-h-[220px] sm:p-5",
        "shadow-[0_8px_24px_rgba(17,24,39,0.045)] transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(17,24,39,0.08)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured
          ? "border-[rgba(255,90,31,0.28)] bg-[linear-gradient(165deg,#FFF8F5_0%,#FFFFFF_55%)]"
          : "border-[rgba(17,24,39,0.07)] hover:border-[rgba(255,90,31,0.22)]",
      )}
    >
      {featured ? (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF5A1F]">
          <Sparkles className="size-3" aria-hidden />
          Featured
        </span>
      ) : (
        <span className="mb-3 inline-flex size-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
          <PathIcon id={card.icon} className="size-4" />
        </span>
      )}

      <div className="relative z-[1] flex flex-1 flex-col pr-[38%] sm:pr-[40%]">
        {featured ? (
          <span className="mb-2 inline-flex size-9 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
            <PathIcon id={card.icon} className="size-4" />
          </span>
        ) : null}
        <h3 className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-[#111827] sm:text-[17px]">
          {card.title}
        </h3>
        <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-[#6B7280] sm:text-[13px]">
          {card.description}
        </p>
        <div className="mt-4">
          <CtaControl href={card.href} label={card.cta} variant={card.ctaVariant} />
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-2 right-1 h-[112px] w-[118px] sm:bottom-3 sm:right-2 sm:h-[124px] sm:w-[130px]",
          "drop-shadow-[0_10px_18px_rgba(17,24,39,0.1)] transition-transform duration-300 group-hover:-translate-y-1",
          "motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
        )}
        aria-hidden
      >
        <JourneyVisual id={card.visual} />
      </div>
    </article>
  );
}

function SecondaryCard({ item }: { item: JourneySecondary }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-[72px] items-center gap-3 rounded-[16px] border border-[rgba(17,24,39,0.07)] bg-white px-3.5 py-3",
        "shadow-[0_4px_14px_rgba(17,24,39,0.03)] transition-[transform,border-color,box-shadow] duration-200",
        "hover:-translate-y-0.5 hover:border-[rgba(255,90,31,0.22)] hover:shadow-[0_10px_22px_rgba(17,24,39,0.06)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      aria-label={`${item.title}. ${item.description}`}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
        <PathIcon id={item.icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-tight tracking-[-0.01em] text-[#111827]">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-[#6B7280]">
          {item.description}
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-[#9CA3AF] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#FF5A1F] motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}

function JourneySelector({
  activePath,
  onSelect,
}: {
  activePath: JourneyPathId;
  onSelect: (id: JourneyPathId) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tablistId = useId();

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(`[data-path-id="${activePath}"]`);
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left =
      active.getBoundingClientRect().left -
      root.getBoundingClientRect().left +
      root.scrollLeft -
      (root.clientWidth - active.clientWidth) / 2;
    root.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [activePath]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const idx = JOURNEY_PATHS.findIndex((p) => p.id === activePath);
    if (idx < 0) return;
    let next = idx;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = (idx + 1) % JOURNEY_PATHS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = (idx - 1 + JOURNEY_PATHS.length) % JOURNEY_PATHS.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = JOURNEY_PATHS.length - 1;
    } else {
      return;
    }
    onSelect(JOURNEY_PATHS[next].id);
    requestAnimationFrame(() => {
      scrollerRef.current
        ?.querySelector<HTMLElement>(`[data-path-id="${JOURNEY_PATHS[next].id}"]`)
        ?.focus();
    });
  };

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      id={tablistId}
      aria-label="Choose a Jimvio path"
      onKeyDown={onKeyDown}
      className={cn(
        "jimvio-journey-tabs flex gap-1.5 overflow-x-auto overscroll-x-contain rounded-[20px] border border-[rgba(17,24,39,0.07)] bg-white p-1.5",
        "shadow-[0_10px_28px_rgba(17,24,39,0.05)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "snap-x snap-mandatory sm:gap-1 lg:gap-0.5",
      )}
    >
      {JOURNEY_PATHS.map((path) => {
        const active = path.id === activePath;
        return (
          <button
            key={path.id}
            type="button"
            role="tab"
            id={`journey-tab-${path.id}`}
            data-path-id={path.id}
            aria-selected={active}
            aria-controls="jimvio-journey-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(path.id)}
            className={cn(
              "snap-start flex min-h-[64px] min-w-[108px] flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-2.5 py-2 text-center",
              "transition-[background-color,color,box-shadow,transform] duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
              active
                ? "bg-[#FF5A1F] text-white shadow-[0_8px_18px_rgba(255,90,31,0.28)]"
                : "bg-transparent text-[#111827] hover:bg-[#FFF4EF]",
            )}
          >
            <PathIcon
              id={path.icon}
              className={cn("size-4", active ? "text-white" : "text-[#FF5A1F]")}
            />
            <span className="text-[12.5px] font-bold leading-none tracking-[-0.01em] sm:text-[13px]">
              {path.label}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium leading-none sm:text-[10.5px]",
                active ? "text-white/85" : "text-[#6B7280]",
              )}
            >
              {path.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Writes the placeholder on the input node so typing does not rerender the panel. */
function useTypedPlaceholder(
  inputRef: RefObject<HTMLInputElement | null>,
  phrase: string,
  active: boolean,
) {
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduced) {
      node.placeholder = phrase;
      return;
    }

    let cancelled = false;
    let paused = false;
    let timer = 0;
    let charIndex = 0;
    let deleting = false;

    const stop = () => {
      paused = true;
      window.clearTimeout(timer);
      node.placeholder = phrase;
    };

    const tick = () => {
      if (cancelled || paused) return;
      if (node.value.length > 0 || document.activeElement === node) {
        stop();
        return;
      }
      if (!deleting) {
        charIndex += 1;
        node.placeholder = phrase.slice(0, charIndex);
        if (charIndex >= phrase.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1100);
          return;
        }
        timer = window.setTimeout(tick, 56);
        return;
      }
      charIndex -= 1;
      node.placeholder = phrase.slice(0, Math.max(charIndex, 0));
      if (charIndex <= 0) {
        deleting = false;
        timer = window.setTimeout(tick, 420);
        return;
      }
      timer = window.setTimeout(tick, 32);
    };

    const onFocus = () => stop();
    const onInput = () => {
      if (node.value.length > 0) stop();
    };
    const onBlur = () => {
      if (node.value.length > 0) {
        stop();
        return;
      }
      paused = false;
      charIndex = 0;
      deleting = false;
      node.placeholder = "";
      timer = window.setTimeout(tick, 360);
    };

    node.addEventListener("focus", onFocus);
    node.addEventListener("input", onInput);
    node.addEventListener("blur", onBlur);
    timer = window.setTimeout(tick, 480);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("input", onInput);
      node.removeEventListener("blur", onBlur);
      node.placeholder = phrase;
    };
  }, [active, inputRef, phrase]);
}

function AiPanel({
  title,
  description,
  placeholder,
  suggestions,
  pathId,
}: {
  title: string;
  description: string;
  placeholder: string;
  suggestions: string[];
  pathId: JourneyPathId;
}) {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const setPageContext = useAIStore((s) => s.setPageContext);
  const aiStatus = useAIStore((s) => s.status);
  const [query, setQuery] = useState("");
  const [emptyHint, setEmptyHint] = useState(false);
  const [asked, setAsked] = useState(false);
  const askLockRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useTypedPlaceholder(
    inputRef,
    placeholder,
    pathId === "dropship" && query.length === 0,
  );

  const ask = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setEmptyHint(true);
        setAsked(false);
        inputRef.current?.focus();
        return;
      }
      if (askLockRef.current) return;
      askLockRef.current = true;
      setEmptyHint(false);
      setAsked(true);
      setPageContext("home", "/");
      openAssistant(trimmed);
      window.setTimeout(() => {
        askLockRef.current = false;
      }, 350);
    },
    [openAssistant, setPageContext],
  );

  return (
    <div
      className="rounded-[22px] border border-[rgba(255,90,31,0.14)] p-4 sm:p-5 lg:p-6"
      style={{ background: PEACH }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_6px_16px_rgba(255,90,31,0.12)]"
          aria-hidden
        >
          <Sparkles className="size-6 text-[#FF5A1F]" strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[#111827] sm:text-[17px]">
            {title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280] sm:text-[13.5px]">
            {description}
          </p>

          <form
            className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              ask(query);
            }}
          >
            <label className="sr-only" htmlFor={`jimvio-ai-input-${pathId}`}>
              {placeholder}
            </label>
            <div className="relative min-w-0 flex-1">
              <Sparkles
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#FF5A1F]"
                aria-hidden
              />
              <input
                ref={inputRef}
                id={`jimvio-ai-input-${pathId}`}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim()) setEmptyHint(false);
                }}
                placeholder={placeholder}
                autoComplete="off"
                aria-invalid={emptyHint}
                aria-describedby={
                  emptyHint ||
                  (asked &&
                    (aiStatus === "thinking" ||
                      aiStatus === "streaming" ||
                      aiStatus === "offline"))
                    ? `jimvio-ai-status-${pathId}`
                    : undefined
                }
                className={cn(
                  "h-12 w-full min-w-0 rounded-full border border-[rgba(17,24,39,0.08)] bg-white pl-10 pr-4 text-[14px] text-[#111827]",
                  "placeholder:text-[#9CA3AF] shadow-[0_4px_14px_rgba(17,24,39,0.04)]",
                  "outline-none transition-[border-color,box-shadow] focus:border-[#FF5A1F]/45 focus:ring-2 focus:ring-[#FF5A1F]/15",
                )}
              />
            </div>
            <button
              type="submit"
              className={cn(
                "inline-flex h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FF5A1F] px-5 text-[14px] font-bold text-white sm:w-auto sm:min-w-[158px]",
                "shadow-[0_8px_18px_rgba(255,90,31,0.28)] transition-[background-color,transform] duration-200",
                "hover:bg-[#e84e16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
                "active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none",
              )}
            >
              Ask Jimvio AI
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </form>
          {emptyHint ||
          (asked &&
            (aiStatus === "thinking" || aiStatus === "streaming" || aiStatus === "offline")) ? (
            <div id={`jimvio-ai-status-${pathId}`} className="mt-2" aria-live="polite">
              {emptyHint ? (
                <p role="alert" className="text-[12.5px] font-medium text-[#9A3412]">
                  Enter a question first, then ask Jimvio AI.
                </p>
              ) : null}
              {asked && (aiStatus === "thinking" || aiStatus === "streaming") ? (
                <p className="text-[12.5px] font-medium text-[#6B7280]">
                  Jimvio AI is responding…
                </p>
              ) : null}
              {asked && aiStatus === "offline" ? (
                <p role="alert" className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-[#9A3412]">
                  {MODEL_UNAVAILABLE_REPLY}
                  <button
                    type="button"
                    onClick={() => ask(query)}
                    className="font-bold text-[#FF5A1F] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
                  >
                    Try again
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested prompts">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  ask(suggestion);
                }}
                className={cn(
                  "rounded-full border border-[rgba(17,24,39,0.08)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#374151]",
                  "transition-[border-color,color,background-color] duration-150 hover:border-[#FF5A1F]/35 hover:bg-[#FFF4EF] hover:text-[#FF5A1F]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
                  "motion-reduce:transition-none",
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PathContent({ pathId }: { pathId: JourneyPathId }) {
  const path = getJourneyPath(pathId);

  return (
    <div key={pathId} className="jimvio-path-content space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#FF5A1F]">
            {path.eyebrow}
          </p>
          <h3 className="mt-1.5 text-[clamp(1.25rem,2.4vw,1.65rem)] font-bold leading-tight tracking-[-0.03em] text-[#111827]">
            {path.headline}
          </h3>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[#6B7280] sm:text-[14px]">
            {path.description}
          </p>
        </div>
        {path.exploreAllHref && path.exploreAllLabel ? (
          <Link
            href={path.exploreAllHref}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[#FF5A1F] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
          >
            {path.exploreAllLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {path.cards.map((card) => (
          <PrimaryCard key={card.id} card={card} />
        ))}
      </div>

      <div>
        <h4 className="mb-3 text-[14px] font-bold tracking-[-0.01em] text-[#111827] sm:text-[15px]">
          {path.moreWaysTitle}
        </h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {path.secondary.map((item) => (
            <SecondaryCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <AiPanel
        key={pathId}
        pathId={pathId}
        title={path.ai.title}
        description={path.ai.description}
        placeholder={path.ai.placeholder}
        suggestions={path.ai.suggestions}
      />
    </div>
  );
}

export function WhatToDoToday() {
  const cycle = useHomeAutoCycle(JOURNEY_PATHS.length);
  const activePath = JOURNEY_PATHS[cycle.index]?.id ?? DEFAULT_JOURNEY_PATH;
  const path = getJourneyPath(activePath);
  const onSelect = (id: JourneyPathId) => {
    const next = JOURNEY_PATHS.findIndex((item) => item.id === id);
    if (next >= 0) cycle.select(next);
  };

  return (
    <SectionReveal
      className="jimvio-action-hub jimvio-home-section relative overflow-x-clip"
      aria-labelledby="jimvio-action-hub-title"
      threshold={0.08}
    >
      <style>{ACTION_HUB_CSS}</style>

      <div className={shell} {...cycle.interaction}>
        <header className="mx-auto mb-4 max-w-2xl text-center sm:mb-5">
          <RevealItem
            index={0}
            as="h2"
            id="jimvio-action-hub-title"
            className="text-[clamp(1.45rem,3.2vw,2.1rem)] font-black leading-[1.12] tracking-[-0.035em]"
            style={
              {
                color: NAVY,
                ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms`,
              } as CSSProperties
            }
          >
            What do you want to{" "}
            <span className="text-[#FF5A1F]">build today?</span>
          </RevealItem>

          <RevealItem
            index={1}
            as="p"
            className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed sm:mt-3.5 sm:text-[15px]"
            style={
              {
                color: MUTED,
                ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms`,
              } as CSSProperties
            }
          >
            Create, earn, sell and grow — all in one place. Choose a path and turn your next idea
            into something real.
          </RevealItem>
        </header>

        <RevealItem index={3} as="div" className="mb-5 sm:mb-6">
          <JourneySelector activePath={activePath} onSelect={onSelect} />
        </RevealItem>

        <div
          id="jimvio-journey-panel"
          role="tabpanel"
          aria-labelledby={`journey-tab-${activePath}`}
          className="jimvio-journey-panel"
        >
          <PathContent pathId={activePath} />
        </div>

        <p className="sr-only">
          Showing {path.label} path: {path.headline}
        </p>
      </div>
    </SectionReveal>
  );
}

const ACTION_HUB_CSS = `
.jimvio-action-hub .jimvio-path-content {
  animation: jimvio-path-in 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes jimvio-path-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-action-hub .jimvio-path-content {
    animation: none;
  }
}
`;
