"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Brain,
  Send,
  Package,
  ShieldCheck,
  ArrowRight,
  Loader2,
  TrendingUp,
  Megaphone,
  Store,
  Percent,
  Users,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/lib/store/use-ai-store";

const SMART_QUERIES = [
  {
    icon: TrendingUp,
    label: "Profitable products",
    query: "What are the most profitable products to promote on Jimvio right now?",
  },
  {
    icon: Percent,
    label: "Top commissions",
    query: "Which affiliate products have the highest commission rates today?",
  },
  {
    icon: Megaphone,
    label: "UGC campaigns",
    query: "What UGC campaigns are paying creators the most right now?",
  },
  {
    icon: Store,
    label: "Start selling",
    query: "How do I launch and sell products on Jimvio as a new vendor?",
  },
  {
    icon: Users,
    label: "Grow community",
    query: "How can I build and monetize a community on Jimvio?",
  },
  {
    icon: Radio,
    label: "Host live events",
    query: "How can I host live events and monetize my audience on Jimvio?",
  },
];

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "products" | "comparison";
  data?: {
    id: string;
    name: string;
    price: string;
    mqo: string;
    slug?: string;
  }[];
  links?: { label: string; href: string }[];
  thinking?: boolean;
}

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ThinkingBubble() {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-[#fd5000] animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
        Jimvio AI is thinking…
      </span>
    </div>
  );
}

export function AISourcingAssistant() {
  const router = useRouter();
  const { isAssistantOpen: isOpen, closeAssistant: onClose, initialQuery } = useAIStore();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedInitial = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(
    async (text = query) => {
      if (!text.trim() || isSending) return;

      const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
      const chatHistory = [...messages, userMsg];
      setMessages((prev) => [...prev, userMsg]);
      setQuery("");
      setIsSending(true);

      const aiId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory.map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to reach AI");
        }

        const aiMode = res.headers.get("X-Jimvio-AI-Mode");
        setIsDemoMode(aiMode === "demo");

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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? { ...m, content: fullContent, thinking: !fullContent.trim() }
                    : m
                )
              );
            } catch {
              // skip malformed stream chunk
            }
          }
        }

        if (sseBuffer.startsWith("data: ")) {
          const data = sseBuffer.slice(6).trim();
          if (data && data !== "[DONE]") {
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || "";
              if (content) fullContent += content;
            } catch {
              // ignore trailing partial chunk
            }
          }
        }

        let finalContent = fullContent;
        let productData: Message["data"];
        let quickLinks: { label: string; href: string }[] | undefined;

        const productMatch = fullContent.match(/\[PRODUCTS:\s*"(.*)"\]/);
        const linksMatch = fullContent.match(/\[LINKS:\s*(.*)\]/);

        if (productMatch) {
          const searchQuery = productMatch[1];
          finalContent = finalContent.replace(productMatch[0], "").trim();
          try {
            const prefetched = await fetch(
              `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`
            );
            const d = await prefetched.json();
            if (d.products?.length > 0) {
              productData = d.products.map(
                (p: {
                  id: string;
                  name: string;
                  price?: number | null;
                  price_usd?: number | null;
                  inventory_quantity?: number | null;
                  slug?: string;
                }) => {
                  const amount = p.price_usd ?? p.price ?? 0;
                  return {
                    id: p.id,
                    name: p.name,
                    price: amount > 0 ? `$${Number(amount).toLocaleString()}` : "View price",
                    mqo: `${p.inventory_quantity ?? 1} pcs`,
                    slug: p.slug,
                  };
                }
              );
            }
          } catch {
            // product suggestions are optional
          }
        }

        if (linksMatch) {
          try {
            quickLinks = linksMatch[1].split(",").map((item) => {
              const cleaned = item.replace(/"/g, "").trim();
              const parts = cleaned.split("|");
              return {
                label: parts[0]?.trim() || "Open",
                href: parts[1]?.trim() || "/",
              };
            });
            finalContent = finalContent.replace(linksMatch[0], "").trim();
          } catch {
            // ignore parse errors
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: finalContent.trim(),
                  thinking: false,
                  type: productData ? "products" : "text",
                  data: productData,
                  links: quickLinks,
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
                    ? "I'm ready to help! Add **GOOGLE_GENERATIVE_AI_API_KEY** or **OPENAI_API_KEY** to your `.env` to enable full AI responses. Until then, browse the marketplace and UGC campaigns to get started."
                    : `Something went wrong: **${errorMsg}**. Please try again in a moment.`,
                }
              : m
          )
        );
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [query, messages, isSending]
  );

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

  if (!isOpen || !portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[#fd5000] to-[#ff7a45] text-white">
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
              {isDemoMode ? "Demo mode · renew API keys in .env" : "Online · ready to help"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid size-9 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="size-5" />
        </button>
      </header>

      {isDemoMode && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-[12px] text-amber-800 dark:text-amber-200 sm:px-6">
          Live AI is unavailable. Showing guided Jimvio answers until you add a valid{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">OPENAI_API_KEY</code> or{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">GOOGLE_GENERATIVE_AI_API_KEY</code> in{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">.env</code>.
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="py-6 text-center sm:py-10">
              <JimvioAIMascot size="sm" showRings className="mx-auto mb-5" />
              <h3 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
                How can I help you <span className="text-[#fd5000]">earn more</span>?
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                Ask about products, commissions, UGC campaigns, selling, communities, or your next growth step.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SMART_QUERIES.map((sq) => (
                  <button
                    key={sq.label}
                    type="button"
                    onClick={() => handleSend(sq.query)}
                    disabled={isSending}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-colors hover:border-[#fd5000]/30 hover:bg-[var(--color-surface-secondary)] disabled:opacity-50"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#fd5000]/10 text-[#fd5000]">
                      <sq.icon className="size-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{sq.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="size-8 shrink-0 border border-[var(--color-border)]">
                <AvatarFallback
                  className={cn(
                    "text-[10px] font-bold",
                    msg.role === "user"
                      ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                      : "bg-[#fd5000]/10 text-[#fd5000]"
                  )}
                >
                  {msg.role === "user" ? "You" : <Brain className="size-3.5" />}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "min-w-0 max-w-[85%] space-y-2",
                  msg.role === "user" ? "items-end text-right" : "items-start text-left"
                )}
              >
                {msg.thinking && !msg.content.trim() && <ThinkingBubble />}

                {msg.content.trim() && (
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 text-[14px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                    )}
                  >
                    {msg.role === "ai" ? renderMarkdownLite(msg.content) : msg.content}
                    {msg.role === "ai" && msg.thinking && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#fd5000]" />
                    )}
                  </div>
                )}

                {msg.links && msg.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.links.map((link) => (
                      <button
                        key={link.href + link.label}
                        type="button"
                        onClick={() => navigateTo(link.href)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-semibold text-[#fd5000] transition-colors hover:bg-[#fd5000]/5"
                      >
                        {link.label}
                        <ArrowRight className="size-3" />
                      </button>
                    ))}
                  </div>
                )}

                {msg.type === "products" && msg.data && msg.data.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    {msg.data.map((p) => (
                      <Link
                        key={p.id}
                        href={p.slug ? `/marketplace/${p.slug}` : "/marketplace"}
                        onClick={onClose}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[#fd5000]/30"
                      >
                        <div className="mb-3 flex h-24 items-center justify-center rounded-md bg-[var(--color-surface-secondary)]">
                          <Package className="size-8 text-[var(--color-text-muted)]" />
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <ShieldCheck className="size-3 text-[#fd5000]" />
                          <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Suggested product</span>
                        </div>
                        <h4 className="line-clamp-2 text-[13px] font-bold text-[var(--color-text-primary)]">{p.name}</h4>
                        <div className="mt-2 flex items-center justify-between text-[12px]">
                          <span className="font-bold text-[#fd5000]">{p.price}</span>
                          <span className="text-[var(--color-text-muted)]">MOQ {p.mqo}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mx-auto flex w-full max-w-3xl items-center gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#fd5000]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSending}
              placeholder={messages.length === 0 ? "Ask Jimvio AI anything…" : "Ask a follow-up…"}
              className="h-12 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] pl-10 pr-4 text-[14px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/40 focus:bg-[var(--color-surface)] disabled:opacity-60"
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim() || isSending}
            className="h-12 shrink-0 rounded-lg px-4 font-bold"
            style={{ background: query.trim() && !isSending ? "#fd5000" : undefined }}
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[var(--color-text-muted)]">
          Jimvio AI can make mistakes. Verify important earnings and product details.
        </p>
      </footer>
    </div>,
    document.body
  );
}
