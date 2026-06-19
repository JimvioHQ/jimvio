"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  TrendingUp,
  Megaphone,
  Store,
  Users,
  DollarSign,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/store/use-ai-store";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import {
  MAX_CHAT_HISTORY,
  JIMVIO_ORANGE,
  parseAiTriggers,
  stripTriggersForDisplay,
  trimChatHistory,
} from "@/lib/ai/chat-shared";
import { AiChatMessage, type AiChatMessageData } from "./ai/ai-chat-message";

const BRAND_ORANGE = JIMVIO_ORANGE;

const QUICK_ACTIONS = [
  { icon: DollarSign, label: "Earn Money", query: "How can I start earning money on Jimvio today?" },
  { icon: Store, label: "Find Products", query: "What are the best products to promote right now?" },
  { icon: Megaphone, label: "Join Campaigns", query: "Which UGC campaigns should I join as a creator?" },
  { icon: Users, label: "Create Community", query: "How do I build and monetize a community on Jimvio?" },
] as const;

const SMART_QUERIES = [
  { icon: TrendingUp, label: "Profitable products", query: "What are the most profitable products to promote on Jimvio right now?" },
  { icon: Target, label: "Top commissions", query: "Which affiliate products have the highest commission rates today?" },
  { icon: Megaphone, label: "UGC campaigns", query: "What UGC campaigns are paying creators the most right now?" },
  { icon: Store, label: "Start selling", query: "How do I launch and sell products on Jimvio as a new vendor?" },
] as const;

async function fetchRecommendations(queries: {
  productQuery?: string;
  campaignQuery?: string;
  communityQuery?: string;
}) {
  const q = queries.productQuery || queries.campaignQuery || queries.communityQuery || "";
  if (!q) return { products: [], campaigns: [], communities: [] };

  try {
    const res = await fetch(`/api/ai/recommendations?q=${encodeURIComponent(q)}&type=all`);
    if (!res.ok) return { products: [], campaigns: [], communities: [] };
    const data = await res.json();

    return {
      products: queries.productQuery ? data.products ?? [] : [],
      campaigns: queries.campaignQuery ? data.campaigns ?? [] : [],
      communities: queries.communityQuery ? data.communities ?? [] : [],
    };
  } catch {
    return { products: [], campaigns: [], communities: [] };
  }
}

export function AISourcingAssistant() {
  const router = useRouter();
  const { isAssistantOpen: isOpen, closeAssistant: onClose, initialQuery } = useAIStore();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<AiChatMessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedInitial = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRaf = useRef<number | null>(null);
  const pendingContent = useRef("");

  const sendMessage = useCallback(
    async (text: string, options?: { regenerateFromId?: string }) => {
      if (isSending) return;

      let baseMessages = messages;
      let messageText = text.trim();

      if (options?.regenerateFromId) {
        const idx = messages.findIndex((m) => m.id === options.regenerateFromId);
        if (idx > 0) {
          const userBefore = messages[idx - 1];
          if (userBefore?.role === "user") {
            baseMessages = messages.slice(0, idx);
            messageText = userBefore.content;
          }
        }
      }

      if (!messageText) return;

      const userMsg: AiChatMessageData = {
        id: `${Date.now()}-user`,
        role: "user",
        content: messageText,
      };

      const chatHistory = trimChatHistory([
        ...baseMessages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        { role: "user", content: userMsg.content },
      ]).slice(-MAX_CHAT_HISTORY);

      setMessages((prev) => {
        if (options?.regenerateFromId) {
          return prev.slice(0, prev.findIndex((m) => m.id === options.regenerateFromId));
        }
        return [...prev, userMsg];
      });
      setQuery("");
      setIsSending(true);

      const aiId = `${Date.now()}-ai`;
      setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);

      const flushStream = () => {
        const content = pendingContent.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, content: stripTriggersForDisplay(content), thinking: !content.trim() }
              : m
          )
        );
        streamRaf.current = null;
      };

      const scheduleStreamUpdate = (content: string) => {
        pendingContent.current = content;
        if (streamRaf.current == null) {
          streamRaf.current = requestAnimationFrame(flushStream);
        }
      };

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to reach AI");
        }

        setIsDemoMode(res.headers.get("X-Jimvio-AI-Mode") === "demo");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream found");
        const decoder = new TextDecoder();
        let fullContent = "";
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || "";
              if (!content) continue;
              fullContent += content;
              scheduleStreamUpdate(fullContent);
            } catch {
              // skip malformed chunk
            }
          }
        }

        if (streamRaf.current != null) {
          cancelAnimationFrame(streamRaf.current);
          streamRaf.current = null;
        }

        const parsed = parseAiTriggers(fullContent);
        const recs = await fetchRecommendations({
          productQuery: parsed.productQuery,
          campaignQuery: parsed.campaignQuery,
          communityQuery: parsed.communityQuery,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: parsed.cleaned,
                  thinking: false,
                  products: recs.products.length ? recs.products : undefined,
                  campaigns: recs.campaigns.length ? recs.campaigns : undefined,
                  communities: recs.communities.length ? recs.communities : undefined,
                  links: parsed.links,
                  followups: parsed.followups,
                  showCalculator: parsed.showCalculator,
                }
              : m
          )
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const isConfigError =
          errorMsg.toLowerCase().includes("key") || errorMsg.includes("GOOGLE_GENERATIVE_AI");

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  thinking: false,
                  content: isConfigError
                    ? "I'm ready to help! Add **OPENAI_API_KEY** or **GOOGLE_GENERATIVE_AI_API_KEY** to your `.env` to enable live AI. Browse marketplace and UGC campaigns to get started."
                    : `Something went wrong: **${errorMsg}**. Please try again.`,
                }
              : m
          )
        );
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [messages, isSending]
  );

  const handleSend = useCallback((text = query) => sendMessage(text), [query, sendMessage]);

  useEffect(() => {
    if (isOpen && initialQuery.trim() && processedInitial.current !== initialQuery) {
      processedInitial.current = initialQuery;
      handleSend(initialQuery);
    }
  }, [isOpen, initialQuery, handleSend]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setQuery("");
      processedInitial.current = "";
      setIsSending(false);
      setIsDemoMode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  const navigateTo = (href: string) => {
    onClose();
    if (href.startsWith("http")) window.open(href, "_blank");
    else router.push(href);
  };

  const handleFeedback = (id: string, feedback: "up" | "down") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m))
    );
  };

  if (!isOpen || !portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-bg)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#FFE0D1]/80 bg-[#FFFDFB] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 place-items-center rounded-xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND_ORANGE}, #ff7a45)` }}
          >
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Jimvio AI</h2>
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span
                className={cn(
                  "size-1.5 rounded-full animate-pulse",
                  isDemoMode ? "bg-amber-500" : "bg-emerald-500"
                )}
              />
              {isDemoMode ? "Demo mode · renew API keys in .env" : "Online · creator commerce assistant"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid size-9 place-items-center rounded-lg border border-[#FFE0D1] text-[var(--color-text-muted)] transition-colors hover:bg-[#FF5A1F]/5 hover:text-[var(--color-text-primary)]"
        >
          <X className="size-5" />
        </button>
      </header>

      {isDemoMode && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-[12px] text-amber-800 dark:text-amber-200 sm:px-6">
          Live AI is unavailable. Showing guided Jimvio answers until you add a valid API key in{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">.env</code>.
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
          {messages.length === 0 && (
            <div className="py-6 text-center sm:py-10">
              <JimvioAIMascot size="sm" showRings className="mx-auto mb-5" />
              <h3 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
                How can I help you <span style={{ color: BRAND_ORANGE }}>earn more</span>?
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                Short answers. Clear steps. Real Jimvio opportunities.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SMART_QUERIES.map((sq) => (
                  <button
                    key={sq.label}
                    type="button"
                    onClick={() => handleSend(sq.query)}
                    disabled={isSending}
                    className="flex items-center gap-3 rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] px-4 py-3 text-left transition-colors hover:border-[#FF5A1F]/40 disabled:opacity-50"
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FF5A1F]/10"
                      style={{ color: BRAND_ORANGE }}
                    >
                      <sq.icon className="size-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{sq.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <AiChatMessage
              key={msg.id}
              message={msg}
              onNavigate={navigateTo}
              onClose={onClose}
              onRegenerate={msg.role === "ai" ? (id) => sendMessage("", { regenerateFromId: id }) : undefined}
              onFollowup={handleSend}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      </div>

      <footer className="border-t border-[#FFE0D1]/80 bg-[#FFFDFB] px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleSend(action.query)}
                disabled={isSending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#FFE0D1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] disabled:opacity-50"
              >
                <action.icon className="size-3.5" style={{ color: BRAND_ORANGE }} />
                {action.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <Sparkles
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
                style={{ color: BRAND_ORANGE }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSending}
                placeholder={messages.length === 0 ? "Ask Jimvio AI anything…" : "Ask a follow-up…"}
                className="h-12 w-full rounded-xl border border-[#FFE0D1] bg-white pl-10 pr-4 text-[14px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[#FF5A1F]/50 disabled:opacity-60"
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || isSending}
              className="h-12 shrink-0 rounded-xl px-4 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: query.trim() && !isSending ? BRAND_ORANGE : undefined }}
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[var(--color-text-muted)]">
            Jimvio AI can make mistakes. Verify important earnings and product details.
          </p>
        </div>
      </footer>
    </div>,
    document.body
  );
}
