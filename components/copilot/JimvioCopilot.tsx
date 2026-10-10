"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  Maximize2,
  Minus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";
import { getCopilotContextMeta } from "@/lib/ai/copilot/context";
import { getQuickActionsForContext } from "@/lib/ai/copilot/quick-actions";
import { EARNING_OPTIONS, EARNING_WELCOME } from "@/lib/ai/earning-guide";
import { useAIStore } from "@/lib/store/use-ai-store";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { AiChatMessage } from "@/components/marketplace/ai/ai-chat-message";
import { CopilotQuickActions } from "./CopilotQuickActions";
import { useCopilotChat } from "./use-copilot-chat";

const BRAND_ORANGE = JIMVIO_ORANGE;
const COMPOSER_MAX_HEIGHT = 128;

function syncComposerHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const previous = el.style.height;
  el.style.height = "auto";
  const next = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  el.style.height = previous === next ? previous : next;
}

function CopilotStatusDot({ status }: { status: string }) {
  const color =
    status === "streaming" || status === "thinking"
      ? "bg-amber-500"
      : status === "offline"
        ? "bg-red-500"
        : "bg-emerald-500";
  const label =
    status === "streaming"
      ? "Responding"
      : status === "thinking"
        ? "Thinking"
        : status === "offline"
          ? "Offline"
          : "Ready";

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
      <span className={cn("size-1.5 rounded-full motion-reduce:animate-none animate-pulse", color)} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function JimvioCopilot() {
  const router = useRouter();
  const {
    isAssistantOpen,
    closeAssistant,
    initialQuery,
    earnGuideToken,
    panelMode,
    toggleMinimize,
    toggleExpand,
    pageContext,
    status,
  } = useAIStore();

  const { messages, isSending, sendMessage, clearHistory, setMessages } = useCopilotChat();
  const [query, setQuery] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const processedInitial = useRef("");
  const processedEarn = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const [keyboardInset, setKeyboardInset] = useState(0);

  const contextMeta = useMemo(() => getCopilotContextMeta(pageContext), [pageContext]);
  const quickActions = useMemo(() => getQuickActionsForContext(pageContext, 8), [pageContext]);
  const footerActions = useMemo(() => getQuickActionsForContext(pageContext, 5), [pageContext]);

  const navigateTo = useCallback(
    (href: string) => {
      closeAssistant();
      if (href.startsWith("http")) window.open(href, "_blank");
      else router.push(href);
    },
    [closeAssistant, router],
  );

  const handleSend = useCallback(
    (text = query, actionId?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setQuery("");
      void sendMessage(trimmed, { actionId });
    },
    [query, sendMessage],
  );

  const handleFeedback = (id: string, feedback: "up" | "down") => {
    // Optimistic UI — backend feedback API connects later
    void id;
    void feedback;
  };

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!isAssistantOpen || !earnGuideToken || processedEarn.current === earnGuideToken) return;
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
  }, [earnGuideToken, isAssistantOpen, setMessages]);

  useEffect(() => {
    if (isAssistantOpen && initialQuery.trim() && processedInitial.current !== initialQuery) {
      processedInitial.current = initialQuery;
      void sendMessage(initialQuery.trim());
    }
  }, [isAssistantOpen, initialQuery, sendMessage]);

  useEffect(() => {
    if (!isAssistantOpen) {
      processedInitial.current = "";
      setQuery("");
    }
  }, [isAssistantOpen]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, isSending, reducedMotion]);

  useEffect(() => {
    if (!isAssistantOpen || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const apply = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      setKeyboardInset((prev) => (prev === inset ? prev : inset));
    };

    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      setKeyboardInset(0);
    };
  }, [isAssistantOpen]);

  useEffect(() => {
    if (!isAssistantOpen || panelMode === "minimized") return;
    const el = inputRef.current;
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
  }, [isAssistantOpen, panelMode]);

  useLayoutEffect(() => {
    if (!isAssistantOpen || panelMode === "minimized") return;
    syncComposerHeight(inputRef.current);
  }, [query, isAssistantOpen, panelMode]);

  if (!portalReady) return null;

  const minimized = panelMode === "minimized";
  const expanded = panelMode === "expanded";

  if (!isAssistantOpen) return null;

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={toggleMinimize}
        aria-label="Open Jimvio AI"
        className="fixed right-4 z-[9999] inline-flex h-12 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 text-[13px] font-bold text-[#111827] shadow-lg transition-[transform,opacity] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50 motion-reduce:transition-none motion-reduce:hover:scale-100"
        style={{
          bottom: `max(16px, calc(env(safe-area-inset-bottom, 0px) + 16px + ${keyboardInset}px))`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        }}
      >
        <span
          className="grid size-7 place-items-center rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND_ORANGE}, #ff7a45)` }}
        >
          <Sparkles className="size-3.5" />
        </span>
        Jimvio AI
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Jimvio AI"
      className={cn(
        "fixed z-[9999] flex flex-col overflow-hidden border border-[#E5E7EB] bg-white text-[#111827] shadow-2xl",
        "transition-[width,height,opacity] duration-300 ease-out motion-reduce:transition-none",
        expanded
          ? "inset-x-3 top-[calc(var(--navbar-height,56px)+12px)] sm:inset-x-auto sm:right-4 sm:top-auto sm:h-[min(820px,calc(100dvh-96px))] sm:w-[min(720px,calc(100vw-32px))]"
          : "right-3 w-[min(420px,calc(100vw-24px))] sm:right-4 sm:h-[min(640px,calc(100dvh-96px))]",
      )}
      style={{
        borderRadius: expanded ? "20px" : "18px",
        boxShadow: "0 24px 64px rgba(17,24,39,0.16)",
        bottom: `max(12px, calc(env(safe-area-inset-bottom, 0px) + 12px + ${keyboardInset}px))`,
        height: expanded
          ? undefined
          : `min(640px, calc(100dvh - var(--navbar-height, 56px) - 24px - ${keyboardInset}px))`,
        maxHeight: `calc(100dvh - var(--navbar-height, 56px) - 24px - env(safe-area-inset-bottom, 0px) - ${keyboardInset}px)`,
        animation: reducedMotion ? undefined : "jimvio-copilot-enter 280ms ease-out",
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND_ORANGE}, #ff7a45)` }}
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-bold text-[#111827]">
              Jimvio AI
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <CopilotStatusDot status={status} />
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                {contextMeta.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              aria-label="Clear conversation"
              className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={expanded ? "Dock panel" : "Expand panel"}
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            {expanded ? <ChevronDown className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize Jimvio AI"
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label="Close Jimvio AI"
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 sm:px-4">
        <p className="text-[11px] leading-snug text-[#6B7280] sm:text-[12px]">
          {contextMeta.description}
        </p>
        {status === "offline" ? (
          <p className="mt-1 text-[11px] font-medium text-[#B45309]" role="status">
            Jimvio AI is unavailable right now. Your conversation is still here.
          </p>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:thin]"
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
          {messages.length === 0 && (
            <div className="py-2 text-center sm:py-4">
              <JimvioAIMascot size="sm" showRings className="mx-auto mb-4" />
              <h3 className="text-[18px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[22px]">
                How can I help on{" "}
                <span style={{ color: BRAND_ORANGE }}>{contextMeta.label}</span>?
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-[var(--color-text-muted)] sm:text-[13px]">
                Ask about selling, affiliates, UGC, dropshipping, communities, or live sessions.
                Earnings are not guaranteed.
              </p>
              <div className="mt-5">
                <CopilotQuickActions
                  actions={quickActions}
                  disabled={isSending}
                  onSelect={(action) => handleSend(action.prompt, action.id)}
                />
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <AiChatMessage
              key={msg.id}
              message={msg}
              onNavigate={navigateTo}
              onClose={closeAssistant}
              onRegenerate={
                msg.role === "ai" ? (id) => void sendMessage("", { regenerateFromId: id }) : undefined
              }
              onFollowup={(text) => handleSend(text)}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#E5E7EB] bg-white px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-3">
        <CopilotQuickActions
          actions={footerActions}
          disabled={isSending}
          variant="chips"
          onSelect={(action) => handleSend(action.prompt, action.id)}
        />

        <form
          className="mt-2.5 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Sparkles
              className="pointer-events-none absolute left-3 top-3 size-4"
              style={{ color: BRAND_ORANGE }}
              aria-hidden
            />
            <textarea
              ref={inputRef}
              value={query}
              rows={2}
              onChange={(e) => {
                setQuery(e.target.value);
                syncComposerHeight(e.currentTarget);
              }}
              onFocus={(e) => {
                const node = e.currentTarget;
                window.setTimeout(() => {
                  node.scrollIntoView({ block: "nearest", inline: "nearest" });
                }, 280);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isSending}
              placeholder={
                messages.length === 0 ? contextMeta.placeholder : "Ask a follow-up…"
              }
              aria-label="Message Jimvio AI"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              style={{
                color: "#111827",
                WebkitTextFillColor: "#111827",
                caretColor: "#111827",
                backgroundColor: "#ffffff",
              }}
              className="jimvio-ai-composer max-h-32 min-h-[76px] w-full resize-none overflow-x-hidden overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-3 text-base leading-6 text-[#111827] outline-none placeholder:text-[#889096] focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus-visible:outline-none disabled:opacity-60"
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim() || isSending}
            aria-label="Send message"
            className="h-11 shrink-0 rounded-xl px-3.5 font-bold text-white transition-[transform,opacity] duration-200 hover:scale-[1.02] hover:opacity-90 disabled:opacity-50"
            style={{ background: query.trim() && !isSending ? BRAND_ORANGE : undefined }}
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-[10px] text-[var(--color-text-muted)]">
          Jimvio AI can be wrong. Confirm payments, orders, and earnings in the product.
        </p>
      </footer>
    </div>,
    document.body,
  );
}
