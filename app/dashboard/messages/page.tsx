"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare, ArrowLeft, Search,
  MoreVertical, Inbox, Send,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageBubble, type MessageRow } from "@/components/messages/message-bubble";
import { ChatInput } from "@/components/messages/chat-input";
import { QuoteRequestModal } from "@/components/messages/quote-request-modal";
import { QuoteReplyModal } from "@/components/messages/quote-reply-modal";
import { ProductShareModal } from "@/components/messages/product-share-modal";

/* ─── Types ──────────────────────────────────────────────────────────── */
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
  unread?: boolean;
};

type VendorOption = {
  id: string;
  business_name: string;
  business_slug: string;
};

type BuyerConvRow = {
  id: string;
  buyer_id: string;
  vendor_id: string;
  updated_at: string;
  vendors: { id: string; business_name: string; business_slug: string; business_logo?: string } | { id: string; business_name: string; business_slug: string; business_logo?: string }[] | null;
};

type VendorConvRow = {
  id: string;
  buyer_id: string;
  vendor_id: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type LastMessageRow = {
  conversation_id: string;
  body: string | null;
  message_type: string | null;
  created_at: string;
};

type OrderVendorRow = {
  vendor_id: string;
  vendors: { id: string; business_name?: string; business_slug?: string } | { id: string; business_name?: string; business_slug?: string }[] | null;
};

/* ─── Avatar ─────────────────────────────────────────────────────────── */
function Avatar({
  src, name, size = "md",
}: { src?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-[11px]", lg: "w-11 h-11 text-[13px]" }[size];
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className={cn(
      "rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center font-semibold text-muted-foreground",
      dim
    )}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <span>{initial}</span>
      }
    </div>
  );
}

/* ─── Conversation row ───────────────────────────────────────────────── */
function ConvRow({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  const name = conv.is_vendor_side
    ? (conv.buyer?.full_name ?? "Buyer")
    : (conv.vendors?.business_name ?? "Store");
  const avatar = conv.is_vendor_side ? conv.buyer?.avatar_url : conv.vendors?.business_logo;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 relative",
        active
          ? "bg-foreground/[0.05] dark:bg-white/[0.06]"
          : "hover:bg-foreground/[0.03] dark:hover:bg-white/[0.03]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-[#fd5000]" />
      )}

      <Avatar src={avatar} name={name} size="md" />

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            "text-[13px] truncate leading-none",
            active ? "font-semibold text-foreground" : "font-medium text-foreground/80"
          )}>
            {name}
          </span>
          {conv.last_at && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
              {timeAgo(conv.last_at)}
            </span>
          )}
        </div>
        <p className={cn(
          "text-[12px] truncate",
          conv.unread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {conv.last_message ?? "No messages yet"}
        </p>
      </div>

      {conv.unread && (
        <span className="w-2 h-2 rounded-full bg-[#fd5000] flex-shrink-0 mt-2" />
      )}
    </button>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        {sub && <p className="text-[12px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function MessagesPage() {
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [convsLoading, setConvsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [showQuoteReply, setShowQuoteReply] = useState(false);
  const [quoteReplyTarget, setQuoteReplyTarget] = useState<MessageRow | null>(null);
  const [showProductShare, setShowProductShare] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const urlParamsHandled = useRef(false);

  const isVendor = !!vendorId;
  const loading = authLoading || convsLoading;

  /* ── Load conversations ── */
  const loadConversations = useCallback(async (uid: string, vid: string | null) => {
    setConvsLoading(true);
    const list: Conversation[] = [];

    const { data: buyerConvs } = await supabase
      .from("conversations")
      .select("id, buyer_id, vendor_id, updated_at, vendors ( id, business_name, business_slug, business_logo )")
      .eq("buyer_id", uid)
      .order("updated_at", { ascending: false });

    (buyerConvs ?? [] as BuyerConvRow[]).forEach((c: BuyerConvRow) => {
      const v = Array.isArray(c.vendors) ? c.vendors[0] : c.vendors;
      list.push({
        id: c.id, buyer_id: c.buyer_id, vendor_id: c.vendor_id,
        updated_at: c.updated_at, vendors: v, buyer: null, is_vendor_side: false,
      });
    });

    if (vid) {
      const { data: vendorConvs } = await supabase
        .from("conversations")
        .select("id, buyer_id, vendor_id, updated_at")
        .eq("vendor_id", vid)
        .order("updated_at", { ascending: false });

      const buyerIds = [...new Set(
        (vendorConvs ?? [] as VendorConvRow[])
          .map((c: VendorConvRow) => c.buyer_id)
          .filter((id:any): id is string => Boolean(id))
      )];

      let buyerProfiles: Record<string, { full_name?: string; avatar_url?: string }> = {};

      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", buyerIds);

        buyerProfiles = Object.fromEntries(
          (profiles ?? [] as ProfileRow[]).map((p: ProfileRow) => [
            p.id,
            { full_name: p.full_name ?? undefined, avatar_url: p.avatar_url ?? undefined },
          ])
        );
      }

      (vendorConvs ?? [] as VendorConvRow[]).forEach((c: VendorConvRow) => {
        if (!list.some((l) => l.id === c.id)) {
          list.push({
            id: c.id, buyer_id: c.buyer_id, vendor_id: c.vendor_id,
            updated_at: c.updated_at, vendors: null,
            buyer: buyerProfiles[c.buyer_id] ?? null, is_vendor_side: true,
          });
        }
      });
    }

    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setConversations(list);
    setConvsLoading(false);
  }, [supabase]);

  /* ── Auth + initial load ── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { setAuthLoading(false); setConvsLoading(false); return; }

      setUserId(user.id);

      const { data: v } = await supabase
        .from("vendors").select("id").eq("user_id", user.id).maybeSingle();
      const vid = v?.id ?? null;
      setVendorId(vid);

      // FIX: correctly destructure { data } from supabase response
      supabase.from("orders")
        .select("vendor_id, vendors ( id, business_name, business_slug )")
        .eq("buyer_id", user.id)
        .then(({ data }: { data: OrderVendorRow[] | null }) => {
          const seen = new Set<string>();
          const vendors: VendorOption[] = [];
          (data ?? []).forEach((o: OrderVendorRow) => {
            const vv = Array.isArray(o.vendors) ? o.vendors[0] : o.vendors;
            if (vv?.id && !seen.has(vv.id)) {
              seen.add(vv.id);
              vendors.push({
                id: vv.id,
                business_name: vv.business_name ?? "Store",
                business_slug: vv.business_slug ?? "",
              });
            }
          });
          setVendorOptions(vendors);
        });

      setAuthLoading(false);
      await loadConversations(user.id, vid);
    });
  }, [supabase, loadConversations]);

  /* ── Last message previews ── */
  const convIdKey = useMemo(
    () => conversations.map(c => c.id).sort().join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations.map(c => c.id).join(",")]
  );

  useEffect(() => {
    if (!convIdKey) return;
    const ids = convIdKey.split(",").filter(Boolean);

    supabase.from("conversation_messages")
      .select("conversation_id, body, message_type, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: LastMessageRow[] | null }) => {
        const byConv: Record<string, LastMessageRow> = {};
        (data ?? []).forEach((m: LastMessageRow) => {
          if (!byConv[m.conversation_id]) byConv[m.conversation_id] = m;
        });

        setConversations(prev => prev.map(c => {
          const last = byConv[c.id];
          if (!last) return c;
          let preview = last.body ?? "";
          if (last.message_type === "product") preview = "📦 Shared a product";
          else if (last.message_type === "quote_request") preview = "💬 Quote request";
          else if (last.message_type === "quote_reply") preview = "✅ Sent an offer";
          else if (last.message_type === "image" || last.message_type === "file") preview = "📎 Attachment";
          return { ...c, last_message: preview || "No messages yet", last_at: last.created_at };
        }));
      });
  }, [convIdKey, supabase]);

  /* ── URL params: open or create conversation ── */
  const vendorParam = searchParams.get("vendor");
  const conversationParam = searchParams.get("conversation");

  useEffect(() => {
    if (!userId || loading || urlParamsHandled.current) return;
    urlParamsHandled.current = true;

    if (conversationParam) {
      setSelectedId(conversationParam);
      setMobileShowChat(true);
      return;
    }

    if (vendorParam) {
      const existing = conversations.find(c => c.vendor_id === vendorParam && !c.is_vendor_side);
      if (existing) { setSelectedId(existing.id); setMobileShowChat(true); return; }

      supabase.from("conversations")
        .select("id")
        .eq("buyer_id", userId)
        .eq("vendor_id", vendorParam)
        .maybeSingle()
        .then(({ data: found }: { data: { id: string } | null }) => {
          if (found) {
            setSelectedId(found.id);
            setMobileShowChat(true);
            setConversations(prev => {
              if (prev.some(c => c.id === found.id)) return prev;
              const vOpt = vendorOptions.find(x => x.id === vendorParam);
              return [{
                id: found.id, buyer_id: userId, vendor_id: vendorParam,
                updated_at: new Date().toISOString(),
                vendors: vOpt ?? null,
                buyer: null, is_vendor_side: false, last_message: null, last_at: null,
              }, ...prev];
            });
            return;
          }

          supabase.from("conversations")
            .insert({ buyer_id: userId, vendor_id: vendorParam })
            .select("id")
            .single()
            .then(({ data: created, error }: { data: { id: string } | null; error: unknown }) => {
              if (error || !created) return;
              const vOpt = vendorOptions.find(x => x.id === vendorParam);
              setConversations(prev => [{
                id: created.id, buyer_id: userId, vendor_id: vendorParam,
                updated_at: new Date().toISOString(),
                vendors: vOpt ?? null,
                buyer: null, is_vendor_side: false, last_message: null, last_at: null,
              }, ...prev]);
              setSelectedId(created.id);
              setMobileShowChat(true);
            });
        });
    }
  }, [userId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load messages for selected conversation ── */
  useEffect(() => {
    if (!selectedId || !userId) { setMessages([]); return; }

    supabase.from("conversation_messages")
      .select("id, body, sender_id, created_at, message_type, reply_to_id, metadata")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }: { data: MessageRow[] | null }) => {
        setMessages(data ?? []);
      });

    const sub = supabase
      .channel(`messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload: { new: MessageRow }) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [selectedId, userId, supabase]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Insert message ── */
  async function insertMessage(payload: {
    body?: string | null;
    message_type?: string;
    reply_to_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!selectedId || !userId) return;

    const { error } = await supabase.from("conversation_messages").insert({
      conversation_id: selectedId,
      sender_id: userId,
      body: payload.body ?? "",
      message_type: payload.message_type ?? "text",
      reply_to_id: payload.reply_to_id ?? null,
      metadata: payload.metadata ?? {},
    });

    if (error) {
      console.error("[MessagesPage] insertMessage failed:", error);
      return;
    }

    await supabase.from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedId);

    const msgType = payload.message_type ?? "text";
    let preview = payload.body ?? "";
    if (msgType === "product") preview = "📦 Shared a product";
    else if (msgType === "quote_request") preview = "💬 Quote request";
    else if (msgType === "quote_reply") preview = "✅ Sent an offer";

    setConversations(prev => prev.map(c =>
      c.id === selectedId
        ? { ...c, last_message: preview || "Sent a message", last_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : c
    ));

    setShowQuoteRequest(false);
    setShowQuoteReply(false);
    setQuoteReplyTarget(null);
    setShowProductShare(false);
    setSendingQuote(false);
    setReplyTo(null);
  }

  /* ── Derived state ── */
  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => {
      const name = c.is_vendor_side
        ? (c.buyer?.full_name ?? "Buyer")
        : (c.vendors?.business_name ?? "Store");
      return name.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const selectedConv = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const otherPartyName = selectedConv
    ? selectedConv.is_vendor_side
      ? (selectedConv.buyer?.full_name ?? "Buyer")
      : (selectedConv.vendors?.business_name ?? "Store")
    : "";

  const otherPartyAvatar = selectedConv
    ? selectedConv.is_vendor_side
      ? selectedConv.buyer?.avatar_url
      : selectedConv.vendors?.business_logo
    : null;

  const messagesById = useMemo(
    () => Object.fromEntries(messages.map(m => [m.id, m])),
    [messages]
  );

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-border border-t-[#fd5000] rounded-full animate-spin" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Loading…</p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <>
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-7xl mx-auto animate-in fade-in duration-400">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight">Messages</h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden rounded-2xl border border-border bg-card min-h-0">

          {/* ── Sidebar ── */}
          <div className={cn(
            "w-full lg:w-72 xl:w-80 flex flex-col flex-shrink-0 border-r border-border",
            mobileShowChat && "hidden lg:flex"
          )}>
            <div className="px-3 pt-3 pb-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/50 border-0 text-[12px] font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[#fd5000]/30 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
              {filteredConvs.length === 0 ? (
                <EmptyState
                  title={search ? "No results" : "No conversations"}
                  sub={search ? `Nothing matching "${search}"` : "Messages will appear here"}
                />
              ) : (
                filteredConvs.map(c => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    active={selectedId === c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setMobileShowChat(true);
                      setReplyTo(null);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Chat area ── */}
          <div className={cn(
            "flex-1 flex flex-col min-w-0",
            !mobileShowChat && "hidden lg:flex",
            !selectedId && "lg:flex"
          )}>
            {selectedId && selectedConv ? (
              <>
                <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setMobileShowChat(false); setReplyTo(null); }}
                      className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Avatar src={otherPartyAvatar} name={otherPartyName || "?"} size="sm" />
                    <div>
                      <p className="text-[13px] font-semibold leading-none">{otherPartyName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        Active now
                      </p>
                    </div>
                  </div>
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5"
                  style={{ scrollbarWidth: "none" }}
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center">
                        <Send className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">Start the conversation</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Send a message to {otherPartyName}
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map(m => (
                      <div key={m.id}>
                        <MessageBubble
                          msg={m}
                          isOwn={m.sender_id === userId}
                          replyToMsg={m.reply_to_id ? messagesById[m.reply_to_id] ?? null : null}
                          onReply={setReplyTo}
                        />
                        {isVendor
                          && m.sender_id !== userId
                          && m.message_type === "quote_request"
                          && !messages.some(r => r.reply_to_id === m.id && r.message_type === "quote_reply")
                          && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => { setQuoteReplyTarget(m); setShowQuoteReply(true); }}
                                className="h-8 rounded-lg bg-[#fd5000] hover:bg-[#e04700] text-white font-semibold text-[11px] px-4 border-none"
                              >
                                Create offer
                              </Button>
                            </div>
                          )
                        }
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
                  <ChatInput
                    conversationId={selectedId}
                    userId={userId!}
                    onSent={() => {
                      setConversations(prev =>
                        prev.map(c =>
                          c.id === selectedId
                            ? { ...c, last_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                            : c
                        )
                      );
                    }}
                    replyTo={replyTo ? { id: replyTo.id } : null}
                    onCancelReply={() => setReplyTo(null)}
                    isVendor={isVendor}
                    onRequestQuote={!isVendor ? () => setShowQuoteRequest(true) : undefined}
                    onShareProduct={() => setShowProductShare(true)}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">Select a conversation</p>
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[200px]">
                    Choose from the list on the left to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showQuoteRequest && (
        <QuoteRequestModal
          onClose={() => setShowQuoteRequest(false)}
          onSubmit={async (data: { body?: string; quantity?: number; expected_price?: string; delivery_country?: string }) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_request",
              reply_to_id: replyTo?.id ?? null,
              metadata: {
                quantity: data.quantity,
                expected_price: data.expected_price,
                delivery_country: data.delivery_country,
              },
            });
          }}
          loading={sendingQuote}
        />
      )}

      {showQuoteReply && quoteReplyTarget && (
        <QuoteReplyModal
          onClose={() => { setShowQuoteReply(false); setQuoteReplyTarget(null); }}
          onSubmit={async (data: { body?: string; offer_price?: string; delivery_time?: string; status?: string }) => {
            setSendingQuote(true);
            await insertMessage({
              body: data.body ?? "",
              message_type: "quote_reply",
              reply_to_id: quoteReplyTarget.id,
              metadata: {
                offer_price: data.offer_price,
                delivery_time: data.delivery_time,
                status: data.status,
              },
            });
          }}
          loading={sendingQuote}
          quoteData={quoteReplyTarget.metadata as {
            quantity?: number;
            expected_price?: string;
            delivery_country?: string;
          }}
        />
      )}

      {showProductShare && selectedConv && (
        <ProductShareModal
          onClose={() => setShowProductShare(false)}
          onSelect={async (product: { product_id: string; slug: string; name: string; price: number; image?: string }) => {
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
    </>
  );
}