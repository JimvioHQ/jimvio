"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";
import { getCopilotContextMeta } from "@/lib/ai/copilot/context";
import { getQuickActionsForContext } from "@/lib/ai/copilot/quick-actions";
import { useAIStore } from "@/lib/store/use-ai-store";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { AiChatMessage } from "@/components/marketplace/ai/ai-chat-message";
import { CopilotQuickActions } from "./CopilotQuickActions";
import { useCopilotChat } from "./use-copilot-chat";

const BRAND_ORANGE = JIMVIO_ORANGE;

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
      <span className={cn("size-1.5 rounded-full animate-pulse", color)} aria-hidden />
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
    panelMode,
    toggleMinimize,
    toggleExpand,
    pageContext,
    status,
  } = useAIStore();

  const { messages, isSending, sendMessage, clearHistory } = useCopilotChat();
  const [query, setQuery] = useState("");
  const [portalReady, setPortalReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const processedInitial = useRef("");

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (isAssistantOpen && panelMode !== "minimized") {
      inputRef.current?.focus();
    }
  }, [isAssistantOpen, panelMode]);

  if (!portalReady) return null;

  const minimized = panelMode === "minimized";
  const expanded = panelMode === "expanded";

  if (!isAssistantOpen) return null;

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={toggleMinimize}
        aria-label="Open Jimvio AI Copilot"
        className="fixed bottom-4 right-4 z-[9999] inline-flex h-12 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-bold text-[var(--color-text-primary)] shadow-lg transition-[transform,opacity] duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
        style={{
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          willChange: "transform",
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
      aria-label="Jimvio AI Copilot"
      className={cn(
        "fixed z-[9999] flex flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl",
        "transition-[width,height,transform,opacity] duration-300 ease-out",
        expanded
          ? "inset-x-3 bottom-3 top-[calc(var(--navbar-height,64px)+12px)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(820px,calc(100vh-96px))] sm:w-[min(720px,calc(100vw-32px))]"
          : "bottom-4 right-4 h-[min(640px,calc(100vh-96px))] w-[min(420px,calc(100vw-24px))]",
      )}
      style={{
        borderRadius: expanded ? "20px" : "18px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        transform: "translateZ(0)",
        willChange: "transform, opacity",
        animation: "jimvio-copilot-enter 280ms ease-out",
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
            <h2 className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">
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
              className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={expanded ? "Dock panel" : "Expand panel"}
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            {expanded ? <ChevronDown className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize copilot"
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label="Close copilot"
            className="grid size-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-3 py-2 sm:px-4">
        <p className="text-[11px] leading-snug text-[var(--color-text-muted)] sm:text-[12px]">
          {contextMeta.description}
        </p>
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
                Premium copilot preview — streaming layout ready for OpenAI, Gemini, Claude, or
                DeepSeek.
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

      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-4">
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
              rows={1}
              onChange={(e) => setQuery(e.target.value)}
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
              aria-label="Message Jimvio Copilot"
              className="max-h-28 min-h-[44px] w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-10 pr-3 text-[14px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/15 disabled:opacity-60"
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
          Jimvio Copilot preview — verify important product and earnings details.
        </p>
      </footer>
    </div>,
    document.body,
  );
}
