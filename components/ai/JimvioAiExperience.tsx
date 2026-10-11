"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AiChatMessage } from "@/components/marketplace/ai/ai-chat-message";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { CopilotQuickActions } from "@/components/copilot/CopilotQuickActions";
import { useCopilotChat } from "@/components/copilot/use-copilot-chat";
import { AiComposer } from "@/components/ai/AiComposer";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";
import { getCopilotContextMeta } from "@/lib/ai/copilot/context";
import { getQuickActionsForContext } from "@/lib/ai/copilot/quick-actions";
import { EARNING_OPTIONS, EARNING_WELCOME } from "@/lib/ai/earning-guide";
import { loadCopilotDraft, loadCopilotReturnPath, saveCopilotDraft } from "@/lib/ai/copilot/session";
import { useAIStore } from "@/lib/store/use-ai-store";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

type JimvioAiExperienceProps = {
  variant?: "page" | "dock";
  clearToken?: number;
};

export function JimvioAiExperience({ variant = "page", clearToken = 0 }: JimvioAiExperienceProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const pageContext = useAIStore((s) => s.pageContext);
  const status = useAIStore((s) => s.status);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const initialQuery = useAIStore((s) => s.initialQuery);
  const earnGuideToken = useAIStore((s) => s.earnGuideToken);
  const { messages, isSending, sendMessage, clearHistory, setMessages } = useCopilotChat();
  const processedInitial = useRef("");
  const processedEarn = useRef(0);
  const [query, setQuery] = useState(() => loadCopilotDraft());
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const reducedMotion = usePrefersReducedMotion();
  const contextMeta = useMemo(() => getCopilotContextMeta(pageContext), [pageContext]);
  const quickActions = useMemo(() => getQuickActionsForContext("home", 8), []);
  const chips = useMemo(() => getQuickActionsForContext("home", 4), []);

  useEffect(() => {
    if (!clearToken) return;
    clearHistory();
  }, [clearHistory, clearToken]);

  useEffect(() => {
    if (!earnGuideToken || processedEarn.current === earnGuideToken) return;
    processedEarn.current = earnGuideToken;
    setMessages((prev) => {
      if (prev.some((message) => message.id === "earn-intro")) return prev;
      return [
        {
          id: "earn-intro",
          role: "ai",
          content: `${EARNING_WELCOME}\n\nWhat would you like to start with?`,
          followups: [...EARNING_OPTIONS],
        },
        ...prev,
      ];
    });
  }, [earnGuideToken, setMessages]);

  useEffect(() => {
    if (!initialQuery.trim() || processedInitial.current === initialQuery) return;
    processedInitial.current = initialQuery;
    void sendMessage(initialQuery.trim());
  }, [initialQuery, sendMessage]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || messages.length === 0 || !stickToBottomRef.current) return;
    node.scrollTo({ top: node.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, isSending, reducedMotion]);

  const handleSend = useCallback(
    (text = query, actionId?: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;
      const accepted = sendMessage(trimmed, { actionId });
      if (!accepted) return;
      stickToBottomRef.current = true;
      setQuery("");
      saveCopilotDraft("");
    },
    [isSending, query, sendMessage],
  );

  const navigateTo = useCallback(
    (href: string) => {
      if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
      else router.push(href);
    },
    [router],
  );

  const goBack = () => {
    const back = loadCopilotReturnPath();
    openAssistant();
    router.push(back && back !== pathname ? back : "/");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {variant === "page" ? (
        <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#374151] hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </button>
          {status === "offline" ? (
            <p className="text-xs font-medium text-[#B45309]" role="status">
              Jimvio AI is unavailable right now. Your conversation is still here.
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          stickToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          variant === "dock" ? "px-3 py-2.5" : "px-4 py-4",
        )}
      >
        <div className={cn("mx-auto flex w-full max-w-3xl flex-col", variant === "dock" ? "gap-3" : "gap-4")}>
          {messages.length === 0 ? (
            <div className={cn("text-center", variant === "dock" ? "px-0.5 pb-0.5 pt-1" : "px-1 pb-2 pt-2 sm:pt-6")}>
              <JimvioAIMascot
                size={variant === "page" ? "md" : "xs"}
                showRings={variant === "page"}
                className={cn("mx-auto", variant === "dock" ? "mb-2" : "mb-3")}
              />
              <h1
                className={cn(
                  "tracking-tight text-[#111827]",
                  variant === "dock"
                    ? "text-[1.05rem] font-bold leading-snug"
                    : "text-[1.65rem] font-black sm:text-4xl",
                )}
              >
                How can I help you on <span style={{ color: JIMVIO_ORANGE }}>Jimvio</span>?
              </h1>
              <p
                className={cn(
                  "mx-auto max-w-xl text-[#6B7280]",
                  variant === "dock" ? "mt-1.5 text-[12px] leading-5" : "mt-3 text-sm leading-6 sm:text-[15px]",
                )}
              >
                Ask about selling, affiliates, UGC, dropshipping, communities, or live sessions. Earnings are not guaranteed.
              </p>
              <div className={cn("text-left", variant === "dock" ? "mt-3" : "mt-6")}>
                <CopilotQuickActions
                  actions={quickActions}
                  disabled={isSending}
                  onSelect={(action) => handleSend(action.prompt, action.id)}
                />
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <AiChatMessage
                key={message.id}
                message={message}
                onNavigate={navigateTo}
                onRegenerate={
                  message.role === "ai" ? (id) => void sendMessage("", { regenerateFromId: id }) : undefined
                }
                actionsDisabled={isSending}
                onFollowup={(text) => handleSend(text)}
              />
            ))
          )}
        </div>
      </div>

      <div className={cn("shrink-0", variant === "dock" ? "pb-1" : "pb-2")}>
        {messages.length === 0 && variant === "dock" ? null : (
          <div className="mx-auto mb-2 w-full max-w-3xl px-3 sm:px-4">
            <CopilotQuickActions
              actions={chips}
              disabled={isSending}
              variant="chips"
              onSelect={(action) => handleSend(action.prompt, action.id)}
            />
          </div>
        )}
        <AiComposer
          value={query}
          onChange={(next) => {
            setQuery(next);
            saveCopilotDraft(next);
          }}
          onSubmit={() => handleSend()}
          sending={isSending}
          placeholder={
            messages.length === 0
              ? "Ask about products, campaigns, or communities..."
              : contextMeta.placeholder
          }
          autoFocus={variant === "dock"}
          reserveKeyboardInset={variant !== "dock"}
        />
      </div>
    </div>
  );
}
