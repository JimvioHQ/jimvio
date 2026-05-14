"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Send, Loader2 } from "lucide-react";

interface ConvItem {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread?: boolean;
}

interface MsgItem {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
}

export default function MessagesPage() {
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgItem[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let dead = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await createClient()
          .from("community_inbox_conversations")
          .select(`id,user_high,user_low,updated_at,community_inbox_messages(body,created_at,sender_id)`)
          .or(`user_high.eq.${currentUserId},user_low.eq.${currentUserId}`)
          .order("updated_at", { ascending: false }).limit(50);

        if (dead || !data) return;
        const peerIds = data.map((c: any) => c.user_high === currentUserId ? c.user_low : c.user_high);
        const { data: profs } = await createClient().from("profiles").select("id,full_name,avatar_url,username").in("id", peerIds);
        const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));

        setConvs(data.map((c: any) => {
          const peerId = c.user_high === currentUserId ? c.user_low : c.user_high;
          const peer = pm.get(peerId) as any;
          const msgs = [...(c.community_inbox_messages ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const last = msgs[0];
          return {
            id: c.id, peerId,
            peerName: peer?.full_name || peer?.username || "Member",
            peerAvatar: peer?.avatar_url ?? null,
            lastMessage: last?.body || "No messages yet",
            lastMessageTime: last?.created_at || c.updated_at,
            unread: last && last.sender_id !== currentUserId,
          };
        }));
      } finally { if (!dead) setLoading(false); }
    }
    load();
    return () => { dead = true; };
  }, [currentUserId]);

  useEffect(() => {
    if (!activeConvId || !currentUserId) return;
    let dead = false;
    async function load() {
      setLoadingMsgs(true);
      try {
        const { data } = await createClient()
          .from("community_inbox_messages")
          .select("id,body,sender_id,created_at")
          .eq("conversation_id", activeConvId)
          .order("created_at", { ascending: true });
        if (!dead) setMessages(data ?? []);
      } finally { if (!dead) setLoadingMsgs(false); }
    }
    load();
    return () => { dead = true; };
  }, [activeConvId, currentUserId]);

  async function sendMessage() {
    if (!draft.trim() || !activeConvId || !currentUserId) return;
    setSending(true);
    try {
      const { error } = await createClient()
        .from("community_inbox_messages")
        .insert({
          conversation_id: activeConvId,
          sender_id: currentUserId,
          body: draft.trim(),
        });
      if (!error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          body: draft.trim(),
          sender_id: currentUserId,
          created_at: new Date().toISOString(),
        }]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  if (!currentUserId) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex h-screen bg-bg">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="p-4 text-center text-text-muted">
              No messages yet
            </div>
          ) : (
            convs.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 border-b border-border cursor-pointer hover:bg-surface ${
                  activeConvId === conv.id ? "bg-surface" : ""
                }`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {conv.peerName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.peerName}</div>
                    <div className="text-sm text-text-muted truncate">{conv.lastMessage}</div>
                  </div>
                  {conv.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {activeConvId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMsgs ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-surface animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-text-muted">No messages</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        msg.sender_id === currentUserId
                          ? "bg-primary text-white"
                          : "bg-surface text-text-primary"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-bg"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}