"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Store, ChevronRight, User, ArrowLeft, MoreVertical, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageBubble, type MessageRow } from "@/components/messages/message-bubble";
import { ChatInput } from "@/components/messages/chat-input";
import { QuoteRequestModal } from "@/components/messages/quote-request-modal";
import { QuoteReplyModal } from "@/components/messages/quote-reply-modal";
import { ProductShareModal } from "@/components/messages/product-share-modal";
import Link from "next/link";

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
              vendors.push({ id: v.id, business_name: v.business_name ?? "Store", business_slug: v.business_slug ?? "" });
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
      : (selectedConv.vendors?.business_name ?? "Store Owner")
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-border border-t-orange-500 rounded-none animate-spin" />
        <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Loading Chats...</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-500 max-w-7xl mx-auto"
    >
      {/* Header - Simpler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
         <div className="space-y-1">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Messages</h1>
            <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest leading-none">Chat with vendors and customers</p>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden rounded-none bg-surface dark:bg-surface border border-border shadow-none relative">
          {/* Conversation List Sidebar */}
          <div className={cn(
             "w-full lg:w-80 border-r border-border flex flex-col shrink-0 lg:flex",
             mobileShowChat && "hidden"
          )}>
             <div className="p-4 border-b border-border space-y-4">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-300 dark:text-stone-700" />
                   <input 
                      type="text" 
                      placeholder="Search chats..." 
                      className="w-full h-9 pl-9 pr-4 rounded-none bg-surface-secondary dark:bg-surface-secondary border-none text-[12px] placeholder:text-stone-300 dark:placeholder:text-stone-700 text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar text-stone-900 dark:text-white">
                {conversations.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-none bg-surface-secondary dark:bg-surface-secondary flex items-center justify-center text-stone-200 dark:text-stone-800 dark:text-text-secondary">
                         <MessageSquare className="h-6 w-6" />
                      </div>
                      <p className="text-[12px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">No conversations</p>
                   </div>
                ) : (
                   conversations.map(c => {
                      const name = c.is_vendor_side ? (c.buyer?.full_name ?? "Buyer") : (c.vendors?.business_name ?? "Store");
                      const avatar = c.is_vendor_side ? c.buyer?.avatar_url : c.vendors?.business_logo;
                      const active = selectedId === c.id;
                      
                      return (
                         <button
                           key={c.id}
                           onClick={() => { setSelectedId(c.id); setMobileShowChat(true); }}
                           className={cn(
                             "w-full flex items-center gap-3 p-3 rounded-none transition-all duration-200 group text-left",
                             active ? "bg-surface-secondary dark:bg-surface-secondary border border-border" : "hover:bg-surface-secondary/50 dark:hover:bg-zinc-800/20 border border-transparent"
                           )}
                         >
                           <div className="w-10 h-10 rounded-none overflow-hidden bg-surface-secondary dark:bg-surface-secondary border border-border shrink-0">
                              {avatar ? (
                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase">
                                   {name[0]}
                                </div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                 <span className="text-[13px] font-bold text-stone-900 dark:text-white truncate tracking-tight">{name}</span>
                                 {c.last_at && <span className="text-[9px] font-bold text-stone-300 dark:text-stone-700 uppercase shrink-0">{timeAgo(c.last_at)}</span>}
                              </div>
                              <p className="text-[11px] font-medium text-stone-400 dark:text-text-muted truncate mt-0.5">
                                 {c.last_message}
                              </p>
                           </div>
                         </button>
                      );
                   })
                )}
             </div>
          </div>

          {/* Chat Area */}
          <div className={cn(
             "flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface",
             !selectedId && "hidden lg:flex lg:bg-surface-secondary/30 dark:lg:bg-zinc-950/30",
             !mobileShowChat && "hidden lg:flex"
          )}>
             {selectedId ? (
                <>
                   {/* Chat Header */}
                   <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface dark:bg-surface shrink-0">
                      <div className="flex items-center gap-4">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setMobileShowChat(false)}
                           className="lg:hidden h-8 w-8 rounded-none text-stone-400 dark:text-stone-600"
                         >
                            <ArrowLeft className="h-4 w-4" />
                         </Button>
                         <div className="w-8 h-8 rounded-none overflow-hidden bg-surface-secondary dark:bg-surface-secondary border border-border shrink-0">
                            {otherPartyAvatar ? <img src={otherPartyAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-400 dark:text-stone-600">{otherPartyName[0]}</div>}
                         </div>
                         <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-stone-900 dark:text-white truncate tracking-tight leading-none">{otherPartyName}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <div className="w-1.5 h-1.5 rounded-none bg-emerald-500" />
                               <span className="text-[9px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Active</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-stone-400 dark:text-stone-600 hover:text-stone-900 dark:text-white dark:hover:text-white">
                            <Plus className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none text-stone-400 dark:text-stone-600 hover:text-stone-900 dark:text-white dark:hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                         </Button>
                      </div>
                   </div>

                   {/* Messages Viewport */}
                   <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
                      {messages.map(m => (
                         <div key={m.id}>
                            <MessageBubble 
                              msg={m} 
                              isOwn={m.sender_id === userId}
                              replyToMsg={m.reply_to_id ? messagesById[m.reply_to_id] : null}
                              onReply={setReplyTo}
                            />
                            {isVendor && m.sender_id !== userId && m.message_type === "quote_request" && !messages.some(r => r.reply_to_id === m.id) && (
                               <div className="mt-4 flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => { setQuoteReplyTarget(m); setShowQuoteReply(true); }}
                                    className="h-8 rounded-none bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest px-4 border-none shadow-none hover:bg-orange-700"
                                  >
                                    Create Offer
                                  </Button>
                               </div>
                            )}
                         </div>
                      ))}
                      <div ref={messagesEndRef} />
                   </div>

                   {/* Input Area */}
                   <div className="p-4 md:p-6 bg-surface dark:bg-surface border-t border-border">
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
                   </div>
                </>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 text-stone-900 dark:text-white">
                   <div className="w-16 h-16 rounded-none bg-surface-secondary dark:bg-surface-secondary border border-border flex items-center justify-center text-stone-200 dark:text-stone-800 dark:text-text-secondary">
                      <MessageSquare className="h-8 w-8" />
                   </div>
                   <div>
                      <h2 className="text-[14px] font-bold text-stone-900 dark:text-white uppercase tracking-widest">Select a Conversation</h2>
                      <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-1">Establish a link with vendors or customers</p>
                   </div>
                </div>
             )}
          </div>
      </div>

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

