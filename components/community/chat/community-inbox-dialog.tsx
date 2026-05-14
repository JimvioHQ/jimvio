"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Profile = { full_name: string | null; avatar_url: string | null; username: string | null };

type InboxMsg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: Profile | Profile[] | null;
};

function oneProfile(p: InboxMsg["profiles"]): Profile | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function CommunityInboxDialog({
  open,
  onOpenChange,
  communityId,
  peerUserId,
  peerName,
  peerAvatarUrl,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  peerUserId: string | null;
  peerName: string;
  peerAvatarUrl: string | null;
  currentUserId: string | null;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (convId: string) => {
      const res = await fetch(`/api/communities/${communityId}/inbox/${convId}/messages`);
      const data = await res.json();
      if (!res.ok) return;
      setMessages(data.messages ?? []);
    },
    [communityId]
  );

  useEffect(() => {
    if (!open || !peerUserId) {
      setConversationId(null);
      setMessages([]);
      setText("");
      return;
    }

    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        const res = await fetch(`/api/communities/${communityId}/inbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerUserId }),
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const cid = data.conversationId as string;
        setConversationId(cid);
        await loadMessages(cid);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [open, peerUserId, communityId, loadMessages]);

  useEffect(() => {
    if (!open || !conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_inbox_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        // both realtime payload callbacks
        async (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const row = payload.new as Record<string, unknown>;
          const senderId = String(row.sender_id);
          const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", senderId).maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next: InboxMsg = {
              id: String(row.id),
              sender_id: senderId,
              body: String(row.body ?? ""),
              created_at: String(row.created_at),
              profiles: prof,
            };
            return [...prev, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const t = text.trim();
    if (!t || !conversationId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/communities/${communityId}/inbox/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message?.id)) return prev;
        return [...prev, data.message as InboxMsg];
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[10050]"
        className="z-[10051] flex max-h-[85vh] max-w-md flex-col gap-0 border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text-primary)]"
      >
        <DialogHeader className="border-b border-[var(--color-border)] px-4 py-3 text-left">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              {peerAvatarUrl ? (
                <Image src={peerAvatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-black text-[var(--color-accent)]">{peerName[0]}</div>
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-black text-[var(--color-text-primary)]">Message {peerName}</DialogTitle>
              <p className="text-xs text-[var(--color-text-muted)]">Private inbox in this community</p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No messages yet — say hello.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const own = !!currentUserId && m.sender_id === currentUserId;
                const p = oneProfile(m.profiles);
                return (
                  <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-sm px-3 py-2 text-sm shadow-none",
                        own
                          ? "bg-[var(--color-accent-light)] text-[var(--color-text-primary)]"
                          : "border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      {!own && <p className="mb-0.5 text-[10px] font-bold text-[var(--color-accent)]">{p?.full_name || p?.username || "Member"}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{format(new Date(m.created_at), "HH:mm")}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              className="min-h-[44px] flex-1 resize-none rounded-sm border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-sm bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
              disabled={sending || !text.trim() || !conversationId}
              onClick={() => void send()}
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

