"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format, isSameDay } from "date-fns";
import {
  ChevronDown,
  Copy,
  FileIcon,
  ImageIcon,
  Loader2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  StopCircle,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityChatFile, type ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { ChatEmojiPickerDialog } from "@/components/community/chat/chat-emoji-picker-dialog";
import { ChatRoomMembersAside } from "@/components/community/chat/chat-room-members-aside";

type Profile = { full_name: string | null; avatar_url: string | null; username: string | null };

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  thread_id: string | null;
  reactions: unknown;
  attachments?: unknown;
  profiles?: Profile | null;
  reply_count?: number | null;
  is_edited?: boolean | null;
  edited_at?: string | null;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥"] as const;

const MAX_ATTACH = 6;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function parseAttachments(raw: unknown): { url: string; name?: string; mime?: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is { url: string; name?: string; mime?: string } =>
      typeof x === "object" &&
      x !== null &&
      "url" in x &&
      typeof (x as { url: unknown }).url === "string"
  );
}

function deriveMessageType(atts: ChatAttachmentPayload[], body: string): string {
  if (atts.length === 0) return "text";
  const allImg = atts.every((a) => a.mime.startsWith("image/"));
  const allAudio = atts.every((a) => a.mime.startsWith("audio/"));
  if (body.trim()) return "text";
  if (allImg) return "image";
  if (allAudio) return "audio";
  return "file";
}

export function ChatRoom({
  roomId,
  roomName,
  communityId,
  hideHeader,
}: {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [threadReplyText, setThreadReplyText] = useState("");
  const [pendingMain, setPendingMain] = useState<ChatAttachmentPayload[]>([]);
  const [pendingThread, setPendingThread] = useState<ChatAttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [threadRoot, setThreadRoot] = useState<Msg | null>(null);
  const [threadReplies, setThreadReplies] = useState<Msg[]>([]);
  const [threadOpen, setThreadOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);
  const threadRootRef = useRef<Msg | null>(null);
  const threadOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const threadFileRef = useRef<HTMLInputElement>(null);
  const threadImageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatFilter, setChatFilter] = useState<"all" | "media">("all");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    threadRootRef.current = threadRoot;
  }, [threadRoot]);
  useEffect(() => {
    threadOpenRef.current = threadOpen;
  }, [threadOpen]);

  useEffect(() => {
    return () => {
      voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
      voiceStreamRef.current = null;
    };
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<Msg>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setThreadReplies((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setThreadRoot((r) => (r && r.id === id ? { ...r, ...patch } : r));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setThreadReplies((prev) => prev.filter((m) => m.id !== id));
    setThreadRoot((r) => {
      if (r?.id === id) {
        setThreadOpen(false);
        return null;
      }
      return r;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${roomId}?limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadThread = useCallback(async (rootId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("community_messages")
      .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
      .eq("thread_id", rootId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });
    setThreadReplies((data as Msg[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function enrichProfile(senderId: string): Promise<Profile | null> {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, username")
        .eq("id", senderId)
        .maybeSingle();
      return prof;
    }

    const channel = supabase
      .channel(`community_messages:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          const tid = row.thread_id as string | null | undefined;
          if (tid) {
            if (threadOpenRef.current && threadRootRef.current?.id === tid) {
              await loadThread(tid);
            }
            return;
          }
          const prof = await enrichProfile(String(row.sender_id));
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next: Msg = {
              id: String(row.id),
              body: String(row.body ?? ""),
              sender_id: String(row.sender_id),
              created_at: String(row.created_at),
              message_type: String(row.message_type ?? "text"),
              thread_id: null,
              reactions: row.reactions,
              attachments: row.attachments,
              profiles: prof,
              reply_count: (row.reply_count as number | undefined) ?? 0,
              is_edited: row.is_edited as boolean | undefined,
              edited_at: row.edited_at as string | undefined,
            };
            return [...prev, next].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const id = String(row.id);
          if (row.is_deleted) {
            removeMessage(id);
            return;
          }
          patchMessage(id, {
            body: String(row.body ?? ""),
            reactions: row.reactions,
            is_edited: row.is_edited as boolean | undefined,
            edited_at: row.edited_at as string | undefined,
            reply_count: (row.reply_count as number | null | undefined) ?? undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, loadThread, patchMessage, removeMessage]);

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, atBottom]);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadReplies]);

  async function handleFiles(files: FileList | null, target: "main" | "thread") {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) continue;
        const uploaded = await uploadCommunityChatFile(communityId, roomId, file);
        if (target === "main") {
          setPendingMain((prev) => {
            if (prev.length >= MAX_ATTACH) return prev;
            return [...prev, uploaded];
          });
        } else {
          setPendingThread((prev) => {
            if (prev.length >= MAX_ATTACH) return prev;
            return [...prev, uploaded];
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage(threadId?: string | null) {
    const isThread = !!threadId;
    const raw = isThread ? threadReplyText : text;
    const t = raw.trim();
    const queue = isThread ? pendingThread : pendingMain;
    if ((!t && queue.length === 0) || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: t,
          threadId: threadId ?? null,
          attachments: queue,
          message_type: deriveMessageType(queue, t),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const msg = data.message as Msg;
      if (msg.thread_id) {
        setThreadReplies((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
        setThreadReplyText("");
        setPendingThread([]);
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
        setText("");
        setPendingMain([]);
        setAtBottom(true);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  function pickVoiceMime(): string {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mp4;codecs=opus"];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  }

  async function sendVoiceMessage(uploaded: ChatAttachmentPayload) {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "",
          threadId: null,
          attachments: [uploaded],
          message_type: deriveMessageType([uploaded], ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const msg = data.message as Msg;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      setAtBottom(true);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function startVoiceRecording() {
    if (voiceRecording || sending || uploading) return;
    const mime = pickVoiceMime();
    if (!mime) {
      window.alert("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) voiceChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
        mediaRecorderRef.current = null;
        const blob = new Blob(voiceChunksRef.current, { type: mime });
        voiceChunksRef.current = [];
        setVoiceRecording(false);
        if (blob.size < 400) return;
        void (async () => {
          setUploading(true);
          try {
            const ext = mime.includes("mp4") ? "m4a" : "webm";
            const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || mime });
            const uploaded = await uploadCommunityChatFile(communityId, roomId, file);
            await sendVoiceMessage(uploaded);
          } catch (e) {
            console.error(e);
            window.alert("Could not send voice message.");
          } finally {
            setUploading(false);
          }
        })();
      };
      mr.start();
      setVoiceRecording(true);
    } catch (e) {
      console.error(e);
      window.alert("Microphone access was denied or unavailable.");
    }
  }

  function stopVoiceRecording() {
    if (!voiceRecording) return;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") mr.stop();
    else setVoiceRecording(false);
  }

  async function openThread(m: Msg) {
    setThreadRoot(m);
    setThreadOpen(true);
    await loadThread(m.id);
  }

  const appendEmoji = (native: string, target: "main" | "thread") => {
    if (target === "main") setText((s) => `${s}${native}`);
    else setThreadReplyText((s) => `${s}${native}`);
  };

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const res = await fetch(`/api/messages/${roomId}/${messageId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        patchMessage(messageId, { reactions: data.reactions });
      } catch (e) {
        console.error(e);
      }
    },
    [roomId, patchMessage]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!window.confirm("Delete this message for everyone?")) return;
      try {
        const res = await fetch(`/api/messages/${roomId}/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delete: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        removeMessage(messageId);
      } catch (e) {
        console.error(e);
      }
    },
    [roomId, removeMessage]
  );

  const saveEdit = useCallback(async () => {
    if (!editingMsg) return;
    const t = editBody.trim();
    if (!t) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/messages/${roomId}/${editingMsg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      patchMessage(editingMsg.id, data.message as Msg);
      setEditingMsg(null);
    } catch (e) {
      console.error(e);
    } finally {
      setEditSaving(false);
    }
  }, [editingMsg, editBody, roomId, patchMessage]);

  const filteredMessages = useMemo(() => {
    let list = messages;
    if (chatFilter === "media") {
      list = list.filter((m) => {
        const atts = parseAttachments(m.attachments);
        return atts.length > 0 || m.message_type === "image" || m.message_type === "file" || m.message_type === "audio";
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
      if (m.message_type === "system") return (m.body || "").toLowerCase().includes(q);
      return (
        (m.body || "").toLowerCase().includes(q) ||
        (m.profiles?.full_name || "").toLowerCase().includes(q) ||
        (m.profiles?.username || "").toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery, chatFilter]);

  const grouped = useMemo(() => {
    const rows: { day: Date; items: Msg[] }[] = [];
    for (const m of filteredMessages) {
      const d = new Date(m.created_at);
      const last = rows[rows.length - 1];
      if (!last || !isSameDay(last.day, d)) rows.push({ day: d, items: [m] });
      else last.items.push(m);
    }
    return rows;
  }, [filteredMessages]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAtBottom(true);
  }

  function onScrollMain() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setAtBottom(nearBottom);
  }

  return (
    <div className="relative flex flex-1 min-h-0 flex-col lg:flex-row">
      <ChatEmojiPickerDialog open={emojiOpen} onOpenChange={setEmojiOpen} onSelect={(native) => appendEmoji(native, threadOpen && threadRoot ? "thread" : "main")} />

      <Dialog open={!!editingMsg} onOpenChange={(open) => !open && setEditingMsg(null)}>
        <DialogContent
          overlayClassName="z-[10050]"
          className="z-[10051] max-w-md border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[var(--color-text-primary)]">Edit message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="mt-2 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-[var(--color-accent)]"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl border-[var(--color-border)]" onClick={() => setEditingMsg(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[var(--color-accent)] font-black text-white hover:bg-[var(--color-accent-hover)]"
              disabled={editSaving || !editBody.trim()}
              onClick={() => void saveEdit()}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-[var(--color-bg)]">
        {hideHeader ? (
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-sm font-bold text-[var(--color-accent)]">
                #
              </div>
              <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">Conversation</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                  searchOpen && "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                )}
                aria-label="Search"
                onClick={() => setSearchOpen((s) => !s)}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </header>
        ) : (
          <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-sm font-bold uppercase text-[var(--color-accent)]">
              {roomName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold leading-tight text-[var(--color-text-primary)]">#{roomName}</h2>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {messages.length} message{messages.length === 1 ? "" : "s"} · Live
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
                searchOpen && "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
              )}
              aria-label="Search in chat"
              onClick={() => setSearchOpen((s) => !s)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-[10055] min-w-[11rem] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-[var(--color-surface-secondary)]"
                  onClick={() => void navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.href : "")}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy chat link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
        )}

        {searchOpen && (
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-2 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              Close
            </Button>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">
          {(["all", "media"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setChatFilter(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-black transition-colors",
                chatFilter === key
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-primary)]"
              )}
            >
              {key === "all" ? "All" : "Media & files"}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-black text-[var(--color-text-primary)] lg:hidden"
            onClick={() => setPeopleOpen(true)}
          >
            <Users className="h-3.5 w-3.5" />
            People
          </button>
          <span className="ml-auto hidden items-center tabular-nums text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] sm:inline-flex">
            {filteredMessages.length}/{messages.length}
          </span>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScrollMain}
          className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg)] px-3 py-3 sm:px-4"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Start the conversation</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">
                Type a message, tap + for files or photos, or react with emoji. Messages sync live for everyone here.
              </p>
            </div>
          ) : messages.length > 0 && filteredMessages.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No messages match filters or search.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.day.toISOString()}>
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] shadow-sm">
                    {format(g.day, "MMM d, yyyy")}
                  </span>
                </div>
                <div className="space-y-4">
                  {g.items.map((m) =>
                    m.message_type === "system" ? (
                      <p key={m.id} className="py-1 text-center text-xs text-[var(--color-text-muted)]">
                        {m.body}
                      </p>
                    ) : (
                      <MessageRow
                        key={m.id}
                        m={m}
                        isOwn={!!userId && m.sender_id === userId}
                        userId={userId}
                        onOpenThread={() => openThread(m)}
                        onToggleReaction={toggleReaction}
                        onDelete={deleteMessage}
                        onEdit={(msg) => {
                          setEditingMsg(msg);
                          setEditBody(msg.body);
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ))
          )}
          {!atBottom && !loading && messages.length > 0 && (
            <div className="pointer-events-none sticky bottom-2 z-10 flex justify-center">
              <button
                type="button"
                onClick={scrollToBottom}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-black text-white shadow-lg shadow-[var(--color-accent)]/25 transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <ChevronDown className="h-4 w-4" />
                New messages
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files, "main")} />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,audio/*,video/*"
            onChange={(e) => handleFiles(e.target.files, "main")}
          />
          {pendingMain.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {pendingMain.map((a, i) => (
                <span
                  key={`${a.url}-${i}`}
                  className="inline-flex max-w-[200px] items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-primary)]"
                >
                  {a.mime.startsWith("image/") ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileIcon className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-[var(--color-border)]"
                    onClick={() => setPendingMain((p) => p.filter((_, j) => j !== i))}
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  disabled={voiceRecording || uploading || pendingMain.length >= MAX_ATTACH}
                  aria-label="Attach"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="z-[10055] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <DropdownMenuItem className="cursor-pointer focus:bg-[var(--color-surface-secondary)]" onClick={() => imageInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Photo
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-[var(--color-surface-secondary)]" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" /> Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Emoji"
              disabled={voiceRecording}
              onClick={() => setEmojiOpen(true)}
            >
              <Smile className="h-6 w-6" />
            </Button>
            <div className="min-w-0 flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">
              <Textarea
                value={text}
                disabled={voiceRecording}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                rows={1}
                className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            {voiceRecording ? (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-[var(--color-danger)]">Recording</span>
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-[var(--color-danger)] text-white hover:bg-red-700"
                  aria-label="Stop and send voice message"
                  onClick={() => stopVoiceRecording()}
                >
                  <StopCircle className="h-6 w-6" />
                </Button>
              </div>
            ) : text.trim() || pendingMain.length > 0 ? (
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                disabled={sending || (!text.trim() && pendingMain.length === 0)}
                aria-label="Send"
                onClick={() => sendMessage()}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 shrink-0 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Record voice message"
                disabled={sending || uploading}
                onClick={() => void startVoiceRecording()}
              >
                <Mic className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ChatRoomMembersAside
        communityId={communityId}
        userId={userId}
        threadOpen={threadOpen}
        mobilePeopleOpen={peopleOpen}
        onMobilePeopleOpenChange={setPeopleOpen}
      />

      {threadOpen && threadRoot && (
        <aside className="flex w-full shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] min-h-0 absolute inset-0 z-30 max-h-full lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-[360px]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <span className="text-sm font-black">Thread</span>
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => setThreadOpen(false)}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <MessageRow
              m={threadRoot}
              isOwn={!!userId && threadRoot.sender_id === userId}
              userId={userId}
              onOpenThread={() => {}}
              onToggleReaction={toggleReaction}
              onDelete={deleteMessage}
              onEdit={(msg) => {
                setEditingMsg(msg);
                setEditBody(msg.body);
              }}
            />
            <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
              {threadReplies.map((r) => (
                <MessageRow
                  key={r.id}
                  m={r}
                  compact
                  isOwn={!!userId && r.sender_id === userId}
                  userId={userId}
                  onOpenThread={() => {}}
                  onToggleReaction={toggleReaction}
                  onDelete={deleteMessage}
                  onEdit={(msg) => {
                    setEditingMsg(msg);
                    setEditBody(msg.body);
                  }}
                />
              ))}
              <div ref={threadBottomRef} />
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
            <input ref={threadImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files, "thread")} />
            <input
              ref={threadFileRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.pdf,.zip,.doc,.docx,.txt"
              onChange={(e) => handleFiles(e.target.files, "thread")}
            />
            {pendingThread.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingThread.map((a, i) => (
                  <span
                    key={`${a.url}-${i}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] max-w-[180px]"
                  >
                    <FileIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{a.name}</span>
                    <button type="button" className="p-0.5 rounded hover:bg-[var(--color-border)]" onClick={() => setPendingThread((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Textarea
              rows={2}
              placeholder="Reply in thread…"
              className="rounded-xl border-[var(--color-border)] mb-2"
              value={threadReplyText}
              onChange={(e) => setThreadReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(threadRoot.id);
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl h-9 w-9 shrink-0 border-[var(--color-border)] bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 hover:border-[var(--color-accent)]/50 shadow-sm"
                onClick={() => threadFileRef.current?.click()}
                disabled={pendingThread.length >= MAX_ATTACH}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl h-9 w-9 shrink-0 border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 shadow-sm"
                onClick={() => setEmojiOpen(true)}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              className="w-full rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
              onClick={() => sendMessage(threadRoot.id)}
              disabled={sending || (!threadReplyText.trim() && pendingThread.length === 0)}
            >
              Reply
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}

function MessageRow({
  m,
  compact,
  isOwn,
  userId,
  onOpenThread,
  onToggleReaction,
  onDelete,
  onEdit,
}: {
  m: Msg;
  compact?: boolean;
  isOwn?: boolean;
  userId: string | null;
  onOpenThread: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onEdit: (msg: Msg) => void;
}) {
  const p = m.profiles;
  const attachments = parseAttachments(m.attachments);
  const reactions = (m.reactions && typeof m.reactions === "object" ? (m.reactions as Record<string, string[]>) : {}) as Record<
    string,
    string[]
  >;

  const isRoot = !m.thread_id;
  const replyCount = m.reply_count ?? 0;

  function userReacted(emoji: string): boolean {
    const ids = reactions[emoji];
    if (!userId || !ids?.length) return false;
    return ids.map(String).includes(String(userId));
  }

  return (
    <div className={cn("flex w-full group", isOwn ? "justify-end" : "justify-start", compact && "pl-3 border-l-2 border-[var(--color-border)]")}>
      <div className={cn("flex gap-3 max-w-[min(100%,28rem)]", isOwn && "flex-row-reverse")}>
        <div className="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
          {p?.avatar_url ? (
            <Image src={p.avatar_url} alt="" width={36} height={36} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
              {(p?.full_name || p?.username || "?")[0]}
            </div>
          )}
        </div>
        <div className={cn("min-w-0 flex-1", isOwn && "flex flex-col items-end")}>
          <div className={cn("flex flex-wrap items-baseline gap-2", isOwn && "justify-end")}>
            <span className="text-sm font-black text-[var(--color-text-primary)]">{isOwn ? "You" : p?.full_name || p?.username || "Member"}</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">{format(new Date(m.created_at), "HH:mm")}</span>
            {m.is_edited ? <span className="text-[10px] text-[var(--color-text-muted)] italic">(edited)</span> : null}
          </div>
          {m.body?.trim() ? (
            <div
              className={cn(
                "mt-1 max-w-full rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words border shadow-sm",
                isOwn
                  ? "bg-[var(--color-accent-light)] border-[var(--color-accent)]/30 text-[var(--color-text-primary)] rounded-br-md"
                  : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-bl-md"
              )}
            >
              {m.body}
            </div>
          ) : null}
          {attachments.length > 0 && (
            <div className={cn("mt-2 flex flex-col gap-2 w-full max-w-sm", isOwn && "items-end")}>
              {attachments.map((a) =>
                a.mime?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(a.url) ? (
                  <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-[var(--color-border)] max-w-full">
                    <Image src={a.url} alt={a.name || ""} width={320} height={240} className="max-h-56 w-auto object-contain bg-[var(--color-surface-secondary)]" unoptimized />
                  </a>
                ) : a.mime?.startsWith("audio/") ? (
                  <audio
                    key={a.url}
                    controls
                    src={a.url}
                    className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2"
                    preload="metadata"
                  />
                ) : (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] max-w-full",
                      isOwn && "flex-row-reverse text-right"
                    )}
                  >
                    <FileIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{a.name || "File"}</span>
                  </a>
                )
              )}
            </div>
          )}
          <div className={cn("mt-1.5 flex flex-wrap items-center gap-1", isOwn && "justify-end")}>
            {Object.entries(reactions).map(([emoji, ids]) =>
              ids.length ? (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(m.id, emoji)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                    userReacted(emoji)
                      ? "bg-[var(--color-accent-light)] border-[var(--color-accent)]/40 text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30"
                  )}
                >
                  {emoji} {ids.length}
                </button>
              ) : null
            )}
          </div>
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-1",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity",
              isOwn && "justify-end"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                title="Add reaction"
                className="text-base leading-none h-8 w-8 rounded-lg hover:bg-[var(--color-surface-secondary)] border border-transparent hover:border-[var(--color-border)]"
                onClick={() => onToggleReaction(m.id, emoji)}
              >
                {emoji}
              </button>
            ))}
            {isRoot ? (
              <button
                type="button"
                className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-[var(--color-surface-secondary)]"
                onClick={onOpenThread}
              >
                <Reply className="h-3 w-3" />
                {replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Reply"}
              </button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  aria-label="Message actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"} className="z-[10055] min-w-[10rem]">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => void navigator.clipboard.writeText((m.body || "").trim() || "(attachment)")}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy text
                </DropdownMenuItem>
                {isOwn ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(m)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-[var(--color-danger)] focus:text-[var(--color-danger)]" onClick={() => void onDelete(m.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
