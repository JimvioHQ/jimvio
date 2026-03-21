"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, X, Store, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageBubble, type MessageRow } from "@/components/messages/message-bubble";
import { ChatInput } from "@/components/messages/chat-input";
import { QuoteRequestModal } from "@/components/messages/quote-request-modal";
import { ProductShareModal } from "@/components/messages/product-share-modal";
import { cn } from "@/lib/utils";

export type ProductChatVendor = {
  id: string;
  business_name: string | null;
  business_logo?: string | null;
  business_slug?: string | null;
};

export type ProductChatProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[] | null;
};

export type OpenProductChatDetail = {
  vendor: ProductChatVendor;
  product?: ProductChatProduct | null;
  currentPath?: string;
};

type ProductChatWidgetProps = {
  /** Optional initial context (e.g. when on product page). Can also be set via openProductChat event. */
  vendor?: ProductChatVendor | null;
  product?: ProductChatProduct | null;
  currentPath?: string;
};

export function ProductChatWidget(props: ProductChatWidgetProps) {
  const { vendor: propVendor, product: propProduct, currentPath: propCurrentPath = "/marketplace" } = props;
  const supabase = createClient();
  const [activeVendor, setActiveVendor] = useState<ProductChatVendor | null>(propVendor ?? null);
  const [activeProduct, setActiveProduct] = useState<ProductChatProduct | null>(propProduct ?? null);
  const [activeCurrentPath, setActiveCurrentPath] = useState(propCurrentPath);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(!!propVendor);
  const [chatOpen, setChatOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [showProductShare, setShowProductShare] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [initialProductSent, setInitialProductSent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const vendor = activeVendor;
  const product = activeProduct;
  const currentPath = activeCurrentPath;
  const loginUrl = currentPath ? `/login?next=${encodeURIComponent(currentPath)}` : "/login";

  // Sync from props when they change (e.g. product page navigation)
  useEffect(() => {
    if (propVendor) setActiveVendor(propVendor);
    if (propProduct !== undefined) setActiveProduct(propProduct ?? null);
    if (propCurrentPath !== undefined) setActiveCurrentPath(propCurrentPath);
  }, [propVendor, propProduct, propCurrentPath]);

  const loadUserAndConversation = useCallback(async (v: ProductChatVendor) => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("vendor_id", v.id)
      .maybeSingle();
    if (existing) {
      setConversationId(existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ buyer_id: user.id, vendor_id: v.id })
        .select("id")
        .single();
      if (!error && created) setConversationId(created.id);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (vendor?.id) loadUserAndConversation(vendor);
    else {
      setUserId(null);
      setConversationId(null);
      setMessages([]);
      setLoading(false);
    }
  }, [vendor?.id, loadUserAndConversation]);

  // When we have conversation + requestOpen (from event), open chat or show login
  useEffect(() => {
    if (!requestOpen) return;
    if (userId && conversationId) {
      setChatOpen(true);
      setUnreadCount(0);
      setRequestOpen(false);
    } else if (!loading && !userId) {
      setShowLoginPrompt(true);
      setRequestOpen(false);
    }
  }, [requestOpen, userId, conversationId, loading]);

  // Send initial "I'm interested in this product" when user opens chat and conversation is empty
  useEffect(() => {
    if (!chatOpen || !conversationId || !userId || !product || initialProductSent) return;
    if (messages.length > 0) {
      setInitialProductSent(true);
      return;
    }
    const image = Array.isArray(product.images) ? product.images[0] : product.images?.[0];
    supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: "I'm interested in this product.",
        message_type: "product",
        metadata: {
          product_id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: image ?? undefined,
        },
      })
      .then(() => {
        setInitialProductSent(true);
        supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      });
  }, [chatOpen, conversationId, userId, product, initialProductSent, messages.length, supabase]);

  // Load messages and subscribe to realtime
  useEffect(() => {
    if (!conversationId || !userId) {
      setMessages([]);
      return;
    }
    supabase
      .from("conversation_messages")
      .select("id, body, sender_id, created_at, message_type, reply_to_id, metadata")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as MessageRow[]));

    const channel = supabase
      .channel(`product-chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageRow;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== userId && !chatOpen) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, userId, chatOpen, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    setUnreadCount(0);
  }, []);

  const handleChatButtonClick = useCallback(() => {
    if (!userId) {
      setShowLoginPrompt(true);
      return;
    }
    if (!conversationId) return;
    openChat();
  }, [userId, conversationId, openChat]);

  // Open from anywhere via custom event with optional detail (vendor, product, currentPath)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenProductChatDetail>).detail;
      if (detail?.vendor) {
        setActiveVendor(detail.vendor);
        setActiveProduct(detail.product ?? null);
        setActiveCurrentPath(detail.currentPath ?? typeof window !== "undefined" ? window.location.pathname : "/marketplace");
        setInitialProductSent(false);
        setRequestOpen(true);
      } else {
        handleChatButtonClick();
      }
    };
    window.addEventListener("openProductChat", handler);
    return () => window.removeEventListener("openProductChat", handler);
  }, [handleChatButtonClick]);

  async function insertMessage(payload: {
    body?: string | null;
    message_type?: string;
    reply_to_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!conversationId || !userId) return;
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: payload.body ?? "",
      message_type: payload.message_type ?? "text",
      reply_to_id: payload.reply_to_id ?? null,
      metadata: payload.metadata ?? {},
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    setShowQuoteRequest(false);
    setShowProductShare(false);
    setSendingQuote(false);
  }

  const messagesById = Object.fromEntries(messages.map((m) => [m.id, m]));

  if (!vendor) return null;

  return (
    <>
      {/* Mobile: floating chat button when chat is closed */}
      {!chatOpen && (
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
          <Button
            type="button"
            onClick={handleChatButtonClick}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] relative"
            aria-label="Chat with supplier"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-darker/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-7 w-7 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Sign in to chat</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Sign in to message the supplier and negotiate directly from this page.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full rounded-xl h-12 font-bold text-base">
                <Link href={loginUrl}>Sign in</Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => setShowLoginPrompt(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right-aside chat panel */}
      {chatOpen && conversationId && userId && (
        <>
          {/* Backdrop (mobile + desktop) */}
          <div
            className="fixed inset-0 z-[88] bg-ink-darker/45 backdrop-blur-[2px] md:bg-ink-darker/25"
            onClick={() => setChatOpen(false)}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed top-0 right-0 z-[90] flex flex-col h-full w-full md:w-[420px] md:max-w-[95vw]",
              "bg-[var(--color-surface)] shadow-2xl border-l border-[var(--color-border)]",
              "md:rounded-l-2xl md:top-4 md:right-4 md:h-[calc(100vh-2rem)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
              <div className="h-11 w-11 rounded-xl bg-[var(--color-surface-secondary)] overflow-hidden shrink-0 border border-[var(--color-border)]/80 flex items-center justify-center">
                {vendor.business_logo ? (
                  <img src={vendor.business_logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--color-text-primary)] truncate text-[15px]">
                  {vendor.business_name || "Supplier"}
                </p>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                  Online
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl shrink-0 hover:bg-[var(--color-surface-secondary)]"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[var(--color-bg)]/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3">
                    <MessageCircle className="h-7 w-7 text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">No messages yet</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Start the conversation with the supplier</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className="space-y-1">
                  <MessageBubble
                    msg={m}
                    isOwn={m.sender_id === userId}
                    replyToMsg={m.reply_to_id ? messagesById[m.reply_to_id] : null}
                    onReply={setReplyTo}
                  />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <ChatInput
                conversationId={conversationId}
                userId={userId}
                onSent={() => {}}
                replyTo={replyTo ? { id: replyTo.id } : null}
                onCancelReply={() => setReplyTo(null)}
                isVendor={false}
                onRequestQuote={() => setShowQuoteRequest(true)}
                onShareProduct={() => setShowProductShare(true)}
              />
            </div>
          </aside>
        </>
      )}

      {/* Modals */}
      {showQuoteRequest && (
        <QuoteRequestModal
          onClose={() => setShowQuoteRequest(false)}
          onSubmit={async (data) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_request",
              metadata: {
                quantity: data.quantity,
                expected_price: data.expected_price,
                delivery_country: data.delivery_country,
              },
            });
            setSendingQuote(false);
          }}
          loading={sendingQuote}
        />
      )}

      {showProductShare && conversationId && (
        <ProductShareModal
          onClose={() => setShowProductShare(false)}
          onSelect={async (p) => {
            await insertMessage({
              body: "",
              message_type: "product",
              metadata: {
                product_id: p.product_id,
                slug: p.slug,
                name: p.name,
                price: p.price,
                image: p.image,
              },
            });
          }}
          vendorId={vendor.id}
        />
      )}
    </>
  );
}
