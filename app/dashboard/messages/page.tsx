"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Store, ChevronRight, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageBubble, type MessageRow } from "@/components/messages/message-bubble";
import { ChatInput } from "@/components/messages/chat-input";
import { QuoteRequestModal } from "@/components/messages/quote-request-modal";
import { QuoteReplyModal } from "@/components/messages/quote-reply-modal";
import { ProductShareModal } from "@/components/messages/product-share-modal";

type Conversation = {
  id: string;
  buyer_id: string;
  vendor_id: string;
  updated_at: string;
  vendors?: { id: string; business_name: string; business_slug: string; business_logo?: string } | null;
  buyer?: { full_name?: string; avatar_url?: string } | null;
  is_vendor_side: boolean;
  last_message?: string | null;
  last_at?: string | null;
};

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; business_name: string; business_slug: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [showQuoteReply, setShowQuoteReply] = useState(false);
  const [quoteReplyTarget, setQuoteReplyTarget] = useState<MessageRow | null>(null);
  const [showProductShare, setShowProductShare] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isVendor = !!vendorId;

  const loadConversations = useCallback(async (uid: string, vid: string | null) => {
    const list: Conversation[] = [];
    const { data: buyerConvs } = await supabase
      .from("conversations")
      .select("id, buyer_id, vendor_id, updated_at, vendors ( id, business_name, business_slug, business_logo )")
      .eq("buyer_id", uid)
      .order("updated_at", { ascending: false });
    (buyerConvs ?? []).forEach((c: any) => {
      const v = Array.isArray(c.vendors) ? c.vendors[0] : c.vendors;
      list.push({
        id: c.id,
        buyer_id: c.buyer_id,
        vendor_id: c.vendor_id,
        updated_at: c.updated_at,
        vendors: v,
        buyer: null,
        is_vendor_side: false,
      });
    });
    if (vid) {
      const { data: vendorConvs } = await supabase
        .from("conversations")
        .select("id, buyer_id, vendor_id, updated_at")
        .eq("vendor_id", vid)
        .order("updated_at", { ascending: false });
      const buyerIds = [...new Set((vendorConvs ?? []).map((c: any) => c.buyer_id).filter(Boolean))];
      let buyerProfiles: Record<string, { full_name?: string; avatar_url?: string }> = {};
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", buyerIds);
        buyerProfiles = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      }
      (vendorConvs ?? []).forEach((c: any) => {
        if (!list.some((l) => l.id === c.id)) {
          list.push({
            id: c.id,
            buyer_id: c.buyer_id,
            vendor_id: c.vendor_id,
            updated_at: c.updated_at,
            vendors: null,
            buyer: buyerProfiles[c.buyer_id] ?? null,
            is_vendor_side: true,
          });
        }
      });
    }
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setConversations(list);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) {
        setLoading(false);
        return;
      }
      supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle().then(({ data: v }) => {
        setVendorId(v?.id ?? null);
        loadConversations(user.id, v?.id ?? null);
      });
      supabase
        .from("orders")
        .select("vendor_id, vendors ( id, business_name, business_slug )")
        .eq("buyer_id", user.id)
        .then(({ data }) => {
          const seen = new Set<string>();
          const vendors: Array<{ id: string; business_name: string; business_slug: string }> = [];
          (data ?? []).forEach((o: any) => {
            const v = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
            if (v?.id && !seen.has(v.id)) {
              seen.add(v.id);
              vendors.push({ id: v.id, business_name: v.business_name ?? "Supplier", business_slug: v.business_slug ?? "" });
            }
          });
          setVendorOptions(vendors);
        });
      setLoading(false);
    });
  }, [loadConversations, supabase]);

  const conversationIds = conversations.map((c) => c.id).join(",");
  useEffect(() => {
    if (conversationIds.length === 0) return;
    const ids = conversationIds.split(",").filter(Boolean);
    supabase
      .from("conversation_messages")
      .select("conversation_id, body, message_type, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const byConv: Record<string, { body: string; message_type: string; created_at: string }> = {};
        (data ?? []).forEach((m: any) => {
          if (!byConv[m.conversation_id]) {
            byConv[m.conversation_id] = { body: m.body ?? "", message_type: m.message_type ?? "text", created_at: m.created_at };
          }
        });
        setConversations((prev) =>
          prev.map((c) => {
            const last = byConv[c.id];
            let preview = last?.body ?? "No messages yet";
            if (last?.message_type === "product") preview = "Shared a product";
            else if (last?.message_type === "quote_request") preview = "Quote request";
            else if (last?.message_type === "quote_reply") preview = "Sent an offer";
            else if (last?.message_type === "image" || last?.message_type === "file") preview = "Attachment";
            return { ...c, last_message: preview, last_at: last?.created_at ?? null };
          })
        );
      });
  }, [conversationIds, supabase]);

  const vendorParam = searchParams.get("vendor");
  const conversationParam = searchParams.get("conversation");
  useEffect(() => {
    if (!userId || loading) return;
    if (conversationParam) {
      setSelectedId(conversationParam);
      setMobileShowChat(true);
      return;
    }
    if (vendorParam) {
      const existing = conversations.find((c) => c.vendor_id === vendorParam);
      if (existing) {
        setSelectedId(existing.id);
        return;
      }
      supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", userId)
        .eq("vendor_id", vendorParam)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSelectedId(data.id);
            setMobileShowChat(true);
            loadConversations(userId, vendorId);
            return;
          }
          supabase
            .from("conversations")
            .insert({ buyer_id: userId, vendor_id: vendorParam })
            .select("id")
            .single()
            .then(({ data: created, error }) => {
              if (!error && created) {
                setConversations((prev) => {
                  const v = vendorOptions.find((x) => x.id === vendorParam);
                  return [{ id: created.id, buyer_id: userId, vendor_id: vendorParam, updated_at: new Date().toISOString(), vendors: v ?? null, buyer: null, is_vendor_side: false, last_message: null, last_at: null }, ...prev];
                });
                setSelectedId(created.id);
                setMobileShowChat(true);
              }
            });
        });
    }
  }, [userId, vendorParam, conversationParam, loading, vendorId, vendorOptions, conversations, loadConversations, supabase]);

  useEffect(() => {
    if (!selectedId || !userId) {
      setMessages([]);
      return;
    }
    supabase
      .from("conversation_messages")
      .select("id, body, sender_id, created_at, message_type, reply_to_id, metadata")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as MessageRow[]));

    const sub = supabase
      .channel(`messages:${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as MessageRow])
      )
      .subscribe();
    return () => {
      sub.unsubscribe();
    };
  }, [selectedId, userId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const otherPartyName = selectedConv
    ? selectedConv.is_vendor_side
      ? (selectedConv.buyer?.full_name ?? "Buyer")
      : (selectedConv.vendors?.business_name ?? "Supplier")
    : "";
  const otherPartyAvatar = selectedConv
    ? selectedConv.is_vendor_side
      ? selectedConv.buyer?.avatar_url
      : selectedConv.vendors?.business_logo
    : null;

  async function startConversation(vendorIdToUse: string) {
    if (!userId) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("buyer_id", userId)
      .eq("vendor_id", vendorIdToUse)
      .maybeSingle();
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ buyer_id: userId, vendor_id: vendorIdToUse })
      .select("id")
      .single();
    if (error) return;
    const v = vendorOptions.find((x) => x.id === vendorIdToUse);
    setConversations((prev) => [
      { id: created.id, buyer_id: userId, vendor_id: vendorIdToUse, updated_at: new Date().toISOString(), vendors: v ?? null, buyer: null, is_vendor_side: false, last_message: null, last_at: null },
      ...prev,
    ]);
    setSelectedId(created.id);
  }

  async function insertMessage(payload: { body?: string | null; message_type?: string; reply_to_id?: string | null; metadata?: Record<string, unknown> }) {
    if (!selectedId || !userId) return;
    await supabase.from("conversation_messages").insert({
      conversation_id: selectedId,
      sender_id: userId,
      body: payload.body ?? "",
      message_type: payload.message_type ?? "text",
      reply_to_id: payload.reply_to_id ?? null,
      metadata: payload.metadata ?? {},
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedId);
    setShowQuoteRequest(false);
    setShowQuoteReply(false);
    setQuoteReplyTarget(null);
    setShowProductShare(false);
    setSendingQuote(false);
  }

  const messagesById = Object.fromEntries(messages.map((m) => [m.id, m]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--navbar-height,108px)-2rem)] max-h-[800px]">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Messages</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Chat with suppliers and negotiate</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-[var(--color-border)] overflow-hidden rounded-2xl shadow-sm">
        <div className="flex flex-1 min-h-0 relative">
          {/* Conversation list - on mobile hidden when chat is open */}
          <div
            className={cn(
              "w-full md:w-80 flex flex-col border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-[var(--color-surface)] z-10",
              "absolute inset-0 md:relative md:flex",
              mobileShowChat && "hidden md:flex"
            )}
          >
            <div className="p-3 border-b border-[var(--color-border)] shrink-0">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {vendorOptions.length === 0 && conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
                  <Store className="h-10 w-10 mx-auto mb-2 text-[var(--color-border)]" />
                  <p>Order from a supplier or use &quot;Chat with Supplier&quot; on a product to start.</p>
                </div>
              ) : (
                <>
                  {conversations.map((c) => {
                    const name = c.is_vendor_side ? (c.buyer?.full_name ?? "Buyer") : (c.vendors?.business_name ?? "Supplier");
                    const avatar = c.is_vendor_side ? c.buyer?.avatar_url : c.vendors?.business_logo;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedId(c.id); setMobileShowChat(true); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 text-left border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)] transition-colors",
                          selectedId === c.id && "bg-[var(--color-accent-light)]"
                        )}
                      >
                        <div className="h-10 w-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center overflow-hidden shrink-0">
                          {avatar ? (
                            <img src={avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            c.is_vendor_side ? <User className="h-5 w-5 text-[var(--color-text-muted)]" /> : <Store className="h-5 w-5 text-[var(--color-text-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">{name}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{c.last_message ?? "No messages yet"}</p>
                        </div>
                        {c.last_at && <span className="text-xs text-[var(--color-text-muted)] shrink-0">{timeAgo(c.last_at)}</span>}
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                      </button>
                    );
                  })}
                  {vendorOptions.filter((v) => !conversations.some((c) => c.vendor_id === v.id)).length > 0 && (
                    <div className="p-2 border-t border-[var(--color-border)]">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] px-2 mb-2">Start conversation</p>
                      {vendorOptions
                        .filter((v) => !conversations.some((c) => c.vendor_id === v.id))
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => startConversation(v.id)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-secondary)] text-left"
                          >
                            <Store className="h-4 w-4 text-[var(--color-border)]" />
                            <span className="text-sm font-medium truncate">{v.business_name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chat area - on mobile full screen when conversation selected */}
          <div className={cn("flex-1 flex flex-col min-w-0 min-h-0", !selectedId ? "hidden" : mobileShowChat ? "flex" : "hidden md:flex")}>
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-secondary)]">Select a conversation</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Or start a chat from a product page</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 rounded-full shrink-0"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden shrink-0">
                    {otherPartyAvatar ? <img src={otherPartyAvatar} alt="" className="w-full h-full object-cover" /> : <User className="h-4 w-4 m-2 text-[var(--color-text-muted)]" />}
                  </div>
                  <p className="font-medium text-[var(--color-text-primary)] truncate">{otherPartyName}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <MessageBubble
                        msg={m}
                        isOwn={m.sender_id === userId}
                        replyToMsg={m.reply_to_id ? messagesById[m.reply_to_id] : null}
                        onReply={setReplyTo}
                      />
                      {isVendor && m.sender_id !== userId && m.message_type === "quote_request" && !messages.some((r) => r.reply_to_id === m.id && (r.metadata as Record<string, string>)?.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs"
                          onClick={() => { setQuoteReplyTarget(m); setShowQuoteReply(true); }}
                        >
                          Reply with offer
                        </Button>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <ChatInput
                  conversationId={selectedId}
                  userId={userId!}
                  onSent={() => {}}
                  replyTo={replyTo ? { id: replyTo.id } : null}
                  onCancelReply={() => setReplyTo(null)}
                  isVendor={isVendor}
                  onRequestQuote={!isVendor ? () => setShowQuoteRequest(true) : undefined}
                  onShareProduct={() => setShowProductShare(true)}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      {showQuoteRequest && (
        <QuoteRequestModal
          onClose={() => setShowQuoteRequest(false)}
          onSubmit={async (data) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_request",
              metadata: { quantity: data.quantity, expected_price: data.expected_price, delivery_country: data.delivery_country },
            });
            setSendingQuote(false);
          }}
          loading={sendingQuote}
        />
      )}

      {showQuoteReply && quoteReplyTarget && (
        <QuoteReplyModal
          onClose={() => { setShowQuoteReply(false); setQuoteReplyTarget(null); }}
          onSubmit={async (data) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_reply",
              metadata: { offer_price: data.offer_price, delivery_time: data.delivery_time, status: data.status },
            });
            setSendingQuote(false);
          }}
          loading={sendingQuote}
          quoteData={quoteReplyTarget.metadata as { quantity?: number; expected_price?: string; delivery_country?: string }}
        />
      )}

      {showProductShare && selectedConv && (
        <ProductShareModal
          onClose={() => setShowProductShare(false)}
          onSelect={async (product) => {
            await insertMessage({
              body: "",
              message_type: "product",
              metadata: {
                product_id: product.product_id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.image,
              },
            });
          }}
          vendorId={selectedConv.vendor_id}
        />
      )}

    </div>
  );
}
