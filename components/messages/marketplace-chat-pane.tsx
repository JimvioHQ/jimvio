"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { MessageBubble, type MessageRow } from "@/components/messages/message-bubble";
import { ChatInput } from "@/components/messages/chat-input";
import { QuoteRequestModal } from "@/components/messages/quote-request-modal";
import { QuoteReplyModal } from "@/components/messages/quote-reply-modal";
import { ProductShareModal } from "@/components/messages/product-share-modal";
import { useCartStore } from "@/lib/store/use-cart-store";
import {
  MARKETPLACE_PAGE_SIZE,
  marketplaceReadKey,
  mergeTimeline,
  previewMarketplaceMessage,
} from "@/lib/messaging/marketplace-thread";

const COLS = "id, body, sender_id, created_at, message_type, reply_to_id, metadata";

export type MarketplaceChatPaneProps = {
  conversationId: string;
  userId: string;
  /** The viewer is the store side of this conversation. */
  isVendorSide: boolean;
  vendorId: string;
  peerName: string;
  peerAvatar: string | null;
  peerVerified?: boolean;
  /** e.g. "Marketplace · you're buying" */
  contextLabel: string;
  storeHref?: string | null;
  onBack?: () => void;
  onActivity?: (preview: string, at: string) => void;
};

function PeerAvatar({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center text-[12px] font-semibold text-muted-foreground">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span>{name.trim()[0]?.toUpperCase() ?? "?"}</span>}
    </div>
  );
}

/**
 * One marketplace (buyer ↔ store) conversation: paginated history, realtime
 * delivery with resync on reconnect, quotes, offers and product sharing.
 */
export function MarketplaceChatPane(props: MarketplaceChatPaneProps) {
  const { conversationId, userId, isVendorSide, vendorId, peerName, peerAvatar, peerVerified, contextLabel, storeHref, onBack, onActivity } = props;
  const supabase = useMemo(() => createClient(), []);
  const refreshCounts = useCartStore((s) => s.refreshCounts);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [quoteReplyTarget, setQuoteReplyTarget] = useState<MessageRow | null>(null);
  const [showProductShare, setShowProductShare] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const markRead = useCallback(
    (lastId?: string) => {
      void fetch("/api/c/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationKey: marketplaceReadKey(conversationId), lastReadMessageId: lastId ?? null }),
      })
        .then(() => refreshCounts())
        .catch(() => {});
    },
    [conversationId, refreshCounts]
  );

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversation_messages")
      .select(COLS)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(MARKETPLACE_PAGE_SIZE);
    if (error) throw error;
    return ((data ?? []) as MessageRow[]).slice().reverse();
  }, [supabase, conversationId]);

  // Initial page + realtime; a resubscribe (network back, tab visible) reconciles anything missed.
  useEffect(() => {
    let alive = true;
    setMessages([]);
    setLoading(true);
    setLoadError(null);
    stickToBottom.current = true;

    const resync = async (initial: boolean) => {
      try {
        const rows = await fetchLatest();
        if (!alive) return;
        setMessages((prev) => (initial ? rows : mergeTimeline(prev, rows)));
        if (initial) setHasMore(rows.length === MARKETPLACE_PAGE_SIZE);
        setLoadError(null);
        markRead(rows.at(-1)?.id);
      } catch {
        if (alive && initial) setLoadError("Messages couldn't load. Check your connection.");
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    void resync(true);

    let subscribedOnce = false;
    const channel = supabase
      .channel(`market_conv:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: { new: MessageRow }) => {
          if (!alive || !payload.new?.id) return;
          setMessages((prev) => mergeTimeline(prev, [payload.new]));
          onActivity?.(previewMarketplaceMessage(payload.new.body, payload.new.message_type), payload.new.created_at);
          if (payload.new.sender_id !== userId && document.visibilityState === "visible") markRead(payload.new.id);
        }
      )
      .subscribe((status: string) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribedOnce) void resync(false);
        subscribedOnce = true;
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void resync(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, supabase, fetchLatest, userId]);

  // Keep the newest message in view unless the reader scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadEarlier() {
    const oldest = messages[0];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data, error } = await supabase
      .from("conversation_messages")
      .select(COLS)
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(MARKETPLACE_PAGE_SIZE);
    setLoadingMore(false);
    if (error) {
      setActionError("Earlier messages couldn't load. Try again.");
      return;
    }
    const rows = ((data ?? []) as MessageRow[]).slice().reverse();
    stickToBottom.current = false;
    setHasMore(rows.length === MARKETPLACE_PAGE_SIZE);
    setMessages((prev) => mergeTimeline(rows, prev));
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  const appendOwn = useCallback(
    (row?: Record<string, unknown>) => {
      stickToBottom.current = true;
      if (row && typeof row.id === "string") {
        const msg = row as unknown as MessageRow;
        setMessages((prev) => mergeTimeline(prev, [msg]));
        onActivity?.(previewMarketplaceMessage(msg.body, msg.message_type), msg.created_at);
      }
    },
    [onActivity]
  );

  async function insertMessage(payload: { body?: string | null; message_type: string; reply_to_id?: string | null; metadata?: Record<string, unknown> }) {
    setActionError(null);
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: payload.body ?? "",
        message_type: payload.message_type,
        reply_to_id: payload.reply_to_id ?? null,
        metadata: payload.metadata ?? {},
      })
      .select(COLS)
      .single();
    setSendingQuote(false);
    if (error) {
      setActionError("That couldn't be sent. Try again.");
      return false;
    }
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    appendOwn(data as Record<string, unknown>);
    setShowQuoteRequest(false);
    setQuoteReplyTarget(null);
    setShowProductShare(false);
    setReplyTo(null);
    return true;
  }

  const byId = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="h-14 flex items-center gap-3 px-3 sm:px-4 border-b border-border flex-shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <PeerAvatar src={peerAvatar} name={peerName} />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 text-[14px] font-semibold leading-tight truncate">{peerName} <BlueVerifiedBadge verified={Boolean(peerVerified)} size="sm" label="Verified account" /></p>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <Store className="h-3 w-3 flex-shrink-0" aria-hidden />
            {contextLabel}
          </p>
        </div>
        {storeHref && (
          <Link href={storeHref} className="hidden sm:inline-flex text-[12px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted">
            View store
          </Link>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-5 space-y-5"
        aria-live="polite"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading messages" />
          </div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-[13px] text-muted-foreground">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Send className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">Start the conversation</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Send a message to {peerName}</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <Button size="sm" variant="ghost" onClick={loadEarlier} disabled={loadingMore} className="text-[12px]">
                  {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Load earlier messages
                </Button>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id}>
                <MessageBubble
                  msg={m}
                  isOwn={m.sender_id === userId}
                  replyToMsg={m.reply_to_id ? (byId[m.reply_to_id] ?? null) : null}
                  onReply={setReplyTo}
                />
                {isVendorSide &&
                  m.sender_id !== userId &&
                  m.message_type === "quote_request" &&
                  !messages.some((r) => r.reply_to_id === m.id && r.message_type === "quote_reply") && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => setQuoteReplyTarget(m)}
                        className="h-8 rounded-lg bg-[#FF5A1F] hover:bg-[#e04a12] text-white font-semibold text-[11px] px-4 border-none"
                      >
                        Create offer
                      </Button>
                    </div>
                  )}
              </div>
            ))}
          </>
        )}
      </div>

      {actionError && (
        <p role="alert" className="px-4 pt-2 text-[12px] text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}
      <div className={cn("flex-shrink-0 pb-[env(safe-area-inset-bottom)]")}>
        <ChatInput
          conversationId={conversationId}
          userId={userId}
          onSent={appendOwn}
          replyTo={replyTo ? { id: replyTo.id } : null}
          onCancelReply={() => setReplyTo(null)}
          isVendor={isVendorSide}
          onRequestQuote={!isVendorSide ? () => setShowQuoteRequest(true) : undefined}
          onShareProduct={() => setShowProductShare(true)}
        />
      </div>

      {showQuoteRequest && (
        <QuoteRequestModal
          onClose={() => setShowQuoteRequest(false)}
          onSubmit={async (data: { body?: string; quantity?: number; expected_price?: string; delivery_country?: string }) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_request",
              reply_to_id: replyTo?.id ?? null,
              metadata: { quantity: data.quantity, expected_price: data.expected_price, delivery_country: data.delivery_country },
            });
          }}
          loading={sendingQuote}
        />
      )}

      {quoteReplyTarget && (
        <QuoteReplyModal
          onClose={() => setQuoteReplyTarget(null)}
          onSubmit={async (data: { body?: string; offer_price?: string; delivery_time?: string; status?: string }) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_reply",
              reply_to_id: quoteReplyTarget.id,
              metadata: { offer_price: data.offer_price, delivery_time: data.delivery_time, status: data.status },
            });
          }}
          loading={sendingQuote}
          quoteData={quoteReplyTarget.metadata as { quantity?: number; expected_price?: string; delivery_country?: string }}
        />
      )}

      {showProductShare && (
        <ProductShareModal
          onClose={() => setShowProductShare(false)}
          onSelect={async (product: { product_id: string; slug: string; name: string; price: number; image?: string }) => {
            await insertMessage({
              body: "",
              message_type: "product",
              metadata: { product_id: product.product_id, slug: product.slug, name: product.name, price: product.price, image: product.image },
            });
          }}
          vendorId={vendorId}
        />
      )}
    </div>
  );
}
