"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Clapperboard,
  DollarSign,
  Megaphone,
  Package,
  Radio,
  ShoppingBag,
  Sparkles,
  SquarePen,
  Store,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { AiComposer } from "@/components/ai/AiComposer";
import { useCopilotChat } from "@/components/copilot/use-copilot-chat";
import { CopilotQuickActions } from "@/components/copilot/CopilotQuickActions";
import { AiChatMessage } from "@/components/marketplace/ai/ai-chat-message";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { getQuickActionsForContext } from "@/lib/ai/copilot/quick-actions";
import { loadCopilotDraft, saveCopilotDraft } from "@/lib/ai/copilot/session";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

type WelcomeIntent = "browse" | "create" | "sell" | "join";

type StartCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  intent: WelcomeIntent;
  icon: LucideIcon;
};

const START_CARDS: StartCard[] = [
  {
    id: "shop",
    title: "Shop & Discover",
    description: "Shop physical and digital products from sellers worldwide.",
    href: "/marketplace",
    intent: "browse",
    icon: ShoppingBag,
  },
  {
    id: "store",
    title: "Sell & Run a Store",
    description: "List products, manage orders, inventory and payouts.",
    href: "/commerce/stores",
    intent: "sell",
    icon: Store,
  },
  {
    id: "products",
    title: "Create Products",
    description: "Add a listing or manage the products you already sell.",
    href: "/seller/products",
    intent: "sell",
    icon: Package,
  },
  {
    id: "dropship",
    title: "Dropshipping",
    description: "Discover suppliers, import products and manage fulfilment.",
    href: "/commerce",
    intent: "sell",
    icon: Box,
  },
  {
    id: "affiliates",
    title: "Earn with Affiliates",
    description: "Share product links and track commissions.",
    href: "/affiliates",
    intent: "create",
    icon: DollarSign,
  },
  {
    id: "ugc",
    title: "UGC & Clipping",
    description: "Join campaigns, create UGC and earn from clips.",
    href: "/ugc",
    intent: "create",
    icon: Video,
  },
  {
    id: "content",
    title: "Create Content",
    description: "Publish posts, videos and Shorts to grow your audience.",
    href: "/create/post",
    intent: "create",
    icon: SquarePen,
  },
  {
    id: "community",
    title: "Build a Community",
    description: "Host live sessions, create spaces, teach and connect.",
    href: "/communities/create",
    intent: "join",
    icon: Users,
  },
  {
    id: "spaces",
    title: "Community Spaces",
    description: "Open spaces inside a community you manage.",
    href: "/communities/spaces",
    intent: "join",
    icon: Clapperboard,
  },
  {
    id: "live",
    title: "Go Live",
    description: "Start or schedule a live session from the live hub.",
    href: "/communities/live",
    intent: "create",
    icon: Radio,
  },
  {
    id: "digital",
    title: "Digital Products",
    description: "Publish a download, course, or other digital listing.",
    href: "/marketplace/new",
    intent: "sell",
    icon: Sparkles,
  },
  {
    id: "marketing",
    title: "Grow with AI & Marketing",
    description: "Promote with posts, affiliate links, and campaigns.",
    href: "/affiliates",
    intent: "create",
    icon: Megaphone,
  },
];

const STEPS = ["Choose how you want to start", "Ask Jimvio AI if you want a guide", "Open the real workflow and confirm it"];

export function WelcomeFlow() {
  const router = useRouter();
  const { messages, isSending, sendMessage } = useCopilotChat();
  const chips = useMemo(() => getQuickActionsForContext("home", 4), []);
  const [query, setQuery] = useState(() => loadCopilotDraft());
  const [pending, setPending] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"control" | "variant">("control");

  useEffect(() => {
    const last = threadRef.current?.lastElementChild;
    if (!last) return;
    last.scrollIntoView({ block: "center", inline: "nearest" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/growth/experiments?key=welcome_cta_copy")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const assignedVariant = data?.variant === "variant" ? "variant" : "control";
        if (assignedVariant === "variant") setVariant("variant");
        void fetch("/api/growth/experiments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: "welcome_cta_copy", variant: assignedVariant }),
        });
      })
      .catch(() => undefined);
  }, []);

  function selectCard(card: StartCard) {
    setPending(card.id);
    void fetch("/api/growth/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "complete_welcome", intent: card.intent }),
    }).catch(() => undefined);
    void fetch("/api/growth/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "growth.welcome_intent_selected",
        properties: { intent: card.id },
      }),
    }).catch(() => undefined);
    router.push(card.href);
  }

  function send(text = query, actionId?: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setQuery("");
    saveCopilotDraft("");
    void sendMessage(trimmed, { actionId });
  }

  return (
    <div
      className="relative overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 42% at 50% 0%, rgba(255,122,69,0.16), transparent 58%), radial-gradient(ellipse 36% 28% at 6% 18%, rgba(255,176,140,0.2), transparent 70%), radial-gradient(ellipse 34% 26% at 94% 24%, rgba(255,214,196,0.5), transparent 70%), #fffaf7",
      }}
    >
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <div className="text-center">
          <JimvioAIMascot size="md" showRings className="mx-auto mb-2" />
          <p className="text-[11px] font-bold tracking-[0.22em] text-[#FF5A1F]">WELCOME TO JIMVIO</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1A1D23] sm:text-5xl">
            What brings you <span style={{ color: JIMVIO_ORANGE }}>here</span>?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#6B7280] sm:text-[15px]">
            Choose where you would like to begin. Jimvio AI can help you get started, and every tool stays available whenever you need it.
          </p>
        </div>

        {messages.length === 0 ? (
          <ol className="mx-auto mt-5 flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-2 rounded-full border border-[#F3D2C4] bg-white/80 px-3 py-1.5 text-left text-xs font-medium text-[#6B7280]"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#FFF1EA] text-[11px] font-bold text-[#FF5A1F]">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <div ref={threadRef} className="mx-auto mt-6 flex max-w-3xl flex-col gap-4 [&>*]:scroll-mt-24">
            {messages.map((message) => (
              <AiChatMessage
                key={message.id}
                message={message}
                onNavigate={(href) => {
                  if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
                  else router.push(href);
                }}
                onRegenerate={(id) => void sendMessage("", { regenerateFromId: id })}
                onFollowup={(text) => send(text)}
              />
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {START_CARDS.map((card) => {
            const Icon = card.icon;
            const title = variant === "variant" ? `Start with ${card.title}` : card.title;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => selectCard(card)}
                disabled={Boolean(pending)}
                className="rounded-2xl border border-[#F3D2C4] bg-white p-4 text-left shadow-[0_8px_24px_rgba(255,122,69,0.05)] transition hover:border-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 disabled:opacity-60"
              >
                <span className="mb-3 grid size-9 place-items-center rounded-xl bg-[#FFF1EA] text-[#FF5A1F]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="block text-sm font-bold text-[#1F2937]">
                  {pending === card.id ? "Opening…" : title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#6B7280]">{card.description}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-5 max-w-3xl">
          <CopilotQuickActions
            actions={chips}
            disabled={isSending}
            variant="chips"
            onSelect={(action) => send(action.prompt, action.id)}
          />
        </div>
      </section>
      <AiComposer
        value={query}
        onChange={(next) => {
          setQuery(next);
          saveCopilotDraft(next);
        }}
        onSubmit={() => send()}
        disabled={isSending}
        placeholder="Ask about products, campaigns, or communities..."
      />
    </div>
  );
}
