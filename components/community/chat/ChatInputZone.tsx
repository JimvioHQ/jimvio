"use client";

import { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Msg } from "@/types";
import {
  Mic,
  StopCircle,
  Smile,
  ImageIcon,
  FileIcon,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { useId, useRef } from "react";
import { ReplyBar } from "./ReplyBar";
import { VoicePreview } from "./VoicePreview";
import { WaIconBtn } from "./WaIconBtn";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ChatInputZoneProps {
  text: string;
  setText: (v: string) => void;
  pendingMain: ChatAttachmentPayload[];
  setPendingMain: React.Dispatch<React.SetStateAction<ChatAttachmentPayload[]>>;
  replyingTo: Msg | null;
  onCancelReply: () => void;
  voiceBlob: Blob | null;
  voiceRecording: boolean;
  voiceSeconds: number;
  sending: boolean;
  uploading: boolean;
  onSend: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onSendVoice: () => void;
  onDiscardVoice: () => void;
  onOpenEmojiPicker: () => void;
  onAttachImage: (files: FileList | null) => void;
  onAttachFile: (files: FileList | null) => void;
}

export function ChatInputZone({
  text,
  setText,
  pendingMain,
  setPendingMain,
  replyingTo,
  onCancelReply,
  voiceBlob,
  voiceRecording,
  voiceSeconds,
  sending,
  uploading,
  onSend,
  onStartVoice,
  onStopVoice,
  onSendVoice,
  onDiscardVoice,
  onOpenEmojiPicker,
  onAttachImage,
  onAttachFile,
}: ChatInputZoneProps) {
  const uid = useId();
  const imgInputId = `${uid}-img`;
  const fileInputId = `${uid}-file`;
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(files: FileList | null) {
    onAttachImage(files);
    if (imgRef.current) imgRef.current.value = "";
  }

  function pickFile(files: FileList | null) {
    onAttachFile(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col",
        "border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
      )}
    >
      {replyingTo && <ReplyBar msg={replyingTo} onClose={onCancelReply} />}

      {voiceBlob && !voiceRecording && (
        <div className="px-3 pt-2 pb-1">
          <VoicePreview
            blob={voiceBlob}
            onSend={onSendVoice}
            onDiscard={onDiscardVoice}
            sending={sending}
          />
        </div>
      )}

      {voiceRecording && (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full border-2 border-[var(--color-danger)] opacity-75" />
            <Mic className="relative z-10 h-5 w-5 text-[var(--color-danger)]" />
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="min-w-[36px] shrink-0 text-sm font-bold tabular-nums text-[var(--color-danger)]">
              {formatDuration(voiceSeconds)}
            </span>
            <div className="flex h-6 flex-1 items-end gap-[2px] overflow-hidden">
              {[...Array(22)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-[var(--color-danger)]"
                  style={{
                    height: `${
                      28 +
                      Math.sin((i + voiceSeconds * 3) * 0.7) * 22 +
                      Math.cos((i * 1.3 + voiceSeconds) * 0.9) * 12
                    }%`,
                    opacity: 0.55 + (i % 4) * 0.1,
                    transition: "height 0.15s ease",
                  }}
                />
              ))}
            </div>
            <span className="ml-1 shrink-0 text-[11px] text-[var(--color-text-muted)]">
              Recording…
            </span>
          </div>
          <button
            type="button"
            onClick={onStopVoice}
            aria-label="Stop recording"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-white shadow"
          >
            <StopCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {!voiceRecording && !voiceBlob && (
        <div className="flex min-h-[62px] items-end gap-1 px-3 py-[9px] pb-[max(9px,env(safe-area-inset-bottom,0px))] max-lg:pb-[calc(3.5rem+max(9px,env(safe-area-inset-bottom,0px)))]">
          <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
            <Smile className="h-6 w-6" />
          </WaIconBtn>

          <div className="flex items-center gap-0.5">
            <label
              htmlFor={imgInputId}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm transition-colors",
                uploading ? "pointer-events-none opacity-50" : "hover:bg-[var(--color-border)]"
              )}
              aria-label="Attach image"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
              ) : (
                <ImageIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
              )}
            </label>
            <input
              ref={imgRef}
              id={imgInputId}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading || sending}
              onChange={(e) => pickImage(e.target.files)}
            />
            <label
              htmlFor={fileInputId}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm transition-colors",
                uploading ? "pointer-events-none opacity-50" : "hover:bg-[var(--color-border)]"
              )}
              aria-label="Attach file"
            >
              <FileIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
            </label>
            <input
              ref={fileRef}
              id={fileInputId}
              type="file"
              accept="*/*"
              className="hidden"
              disabled={uploading || sending}
              onChange={(e) => pickFile(e.target.files)}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {pendingMain.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1.5 rounded-sm bg-[var(--color-border)] px-1 py-1.5">
                {pendingMain.map((a, i) => (
                  <div
                    key={a.url}
                    className={cn(
                      "flex items-center gap-1.5 rounded-sm border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium",
                      "bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                    )}
                  >
                    <FileIcon size={11} className="text-[var(--color-accent)]" />
                    <span className="max-w-[90px] truncate">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        setPendingMain((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <X
                        size={12}
                        className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-danger)]"
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                rows={1}
                disabled={sending || uploading}
                className={cn(
                  "max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm outline-none",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
            </div>
          </div>

          {text.trim() || pendingMain.length > 0 ? (
            <button
              type="button"
              disabled={sending || uploading}
              aria-label="Send message"
              onClick={onSend}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-[var(--color-accent)] text-white",
                "transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={sending || uploading}
              aria-label="Record voice message"
              onClick={() => void onStartVoice()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-[var(--color-accent)] text-white",
                "transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <Mic className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
