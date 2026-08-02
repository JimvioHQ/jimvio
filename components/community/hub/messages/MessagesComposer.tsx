"use client";

import { useId, useRef } from "react";
import {
  AtSign,
  Bot,
  GraduationCap,
  Mic,
  MoreHorizontal,
  Paperclip,
  Package,
  Plus,
  Scissors,
  Send,
  Share2,
  Smile,
  StopCircle,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import type { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import type { HubChatMessage, QuickActionId } from "./types";

const QUICK_ACTIONS: Array<{
  id: QuickActionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}> = [
  { id: "ai", label: "AI Assistant", icon: Bot, accent: true },
  { id: "course", label: "Send Course", icon: GraduationCap },
  { id: "clip", label: "Share Clip", icon: Scissors },
  { id: "space", label: "Invite to Space", icon: Users },
  { id: "product", label: "Share Product", icon: Package },
  { id: "signal", label: "Share Signal", icon: Share2 },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export function MessagesComposer({
  text,
  setText,
  pending,
  setPending,
  replyingTo,
  onCancelReply,
  voiceBlob,
  voiceRecording,
  voiceSeconds,
  sending,
  uploading,
  disabled,
  onSend,
  onStartVoice,
  onStopVoice,
  onSendVoice,
  onDiscardVoice,
  onOpenEmoji,
  onOpenGif,
  onAttachFiles,
  onMention,
  onQuickAction,
}: {
  text: string;
  setText: (v: string) => void;
  pending: ChatAttachmentPayload[];
  setPending: React.Dispatch<React.SetStateAction<ChatAttachmentPayload[]>>;
  replyingTo: HubChatMessage | null;
  onCancelReply: () => void;
  voiceBlob: Blob | null;
  voiceRecording: boolean;
  voiceSeconds: number;
  sending: boolean;
  uploading: boolean;
  disabled?: boolean;
  onSend: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onSendVoice: () => void;
  onDiscardVoice: () => void;
  onOpenEmoji: () => void;
  onOpenGif: () => void;
  onAttachFiles: (files: FileList | null) => void;
  onMention: () => void;
  onQuickAction: (id: QuickActionId) => void;
}) {
  const uid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const busy = sending || uploading || disabled;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy) onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-black/[0.06] bg-white/90 px-3 pb-2.5 pt-2 backdrop-blur-md sm:px-4">
      {replyingTo && (
        <div className="mb-1.5 flex items-start justify-between gap-2 rounded-lg border border-black/[0.06] bg-[#F7F8FA] px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--color-accent,#fd5000)]">
              Replying to {replyingTo.sender_name}
            </p>
            <p className="truncate text-[12px] text-[var(--color-text-muted)]">
              {replyingTo.body || "Attachment"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-black/5"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map((p, i) => (
            <div
              key={`${p.url}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1.5 text-[11px]"
            >
              <Paperclip className="h-3.5 w-3.5 text-[var(--color-accent,#fd5000)]" />
              <span className="max-w-[140px] truncate font-semibold">{p.name ?? "File"}</span>
              <button
                type="button"
                onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3 text-[var(--color-text-muted)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {voiceRecording || voiceBlob ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                voiceRecording ? "animate-pulse bg-red-500" : "bg-[var(--color-accent,#fd5000)]"
              )}
            />
            {voiceRecording ? `Recording ${formatDuration(voiceSeconds)}` : "Voice note ready"}
          </div>
          <div className="flex items-center gap-1">
            {voiceRecording ? (
              <button
                type="button"
                onClick={onStopVoice}
                className="rounded-xl px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
              >
                <StopCircle className="mr-1 inline h-3.5 w-3.5" />
                Stop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDiscardVoice}
                  className="rounded-xl px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] hover:bg-black/5"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={onSendVoice}
                  disabled={busy}
                  className="rounded-xl bg-[var(--color-accent,#fd5000)] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--color-accent-hover,#e04700)] disabled:opacity-50"
                >
                  Send voice
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-1 rounded-[20px] border border-black/[0.06] bg-[#F7F8FA] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <button
          type="button"
          onClick={onOpenEmoji}
          disabled={busy}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Emoji"
        >
          <Smile className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Add attachment"
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={busy}
          className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-snug outline-none placeholder:text-[var(--color-text-muted)]"
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Attach file"
        >
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onOpenGif}
          disabled={busy}
          className="hidden rounded-full px-1.5 py-1.5 text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)] sm:inline"
          aria-label="GIF"
        >
          GIF
        </button>
        <button
          type="button"
          onClick={onMention}
          disabled={busy}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Mention"
        >
          <AtSign className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={voiceRecording ? onStopVoice : onStartVoice}
          disabled={busy && !voiceRecording}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Voice message"
        >
          <Mic className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={busy || (!text.trim() && pending.length === 0)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent,#fd5000)] text-white shadow-[0_2px_8px_rgba(253,80,0,0.35)] transition-transform hover:scale-105 hover:bg-[var(--color-accent-hover,#e04700)] disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {QUICK_ACTIONS.map(({ id, label, icon: Icon, accent }) => (
          <button
            key={id}
            type="button"
            onClick={() => onQuickAction(id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              accent
                ? "bg-[var(--color-accent,#fd5000)] text-white hover:bg-[var(--color-accent-hover,#e04700)]"
                : "border border-black/[0.06] text-[var(--color-text-secondary)] hover:bg-[#F7F8FA] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        id={`${uid}-files`}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
        onChange={(e) => {
          onAttachFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
