import { Textarea } from "@/components/ui/textarea";
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
import { ReplyBar } from "./ReplyBar";
import { VoicePreview } from "./VoicePreview";
import { WaIconBtn } from "./WaIconBtn";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Theme tokens (globals.css --color-* system):
//
//   --color-surface-secondary  → outer input zone bg
//   --color-border             → border-t, attachment chip border
//   --color-surface            → textarea / text input bg, attachment chip bg
//   --color-text-primary       → typed text
//   --color-text-muted         → placeholder, icon colour, "Recording…" label
//   --color-accent             → send/mic button bg, file icon accent
//   --color-danger             → recording red (maps to #e5484d / #f07070)

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
  return (
    <div
      className={cn(
        "flex flex-col shrink-0",
        "bg-[var(--color-surface-secondary)] border-t border-[var(--color-border)]"
      )}
    >
      {replyingTo && <ReplyBar msg={replyingTo} onClose={onCancelReply} />}

      {/* ── Voice preview (recorded, not yet sent) ──────────────────── */}
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

      {/* ── Recording indicator ─────────────────────────────────────── */}
      {voiceRecording && (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-[var(--color-danger)] animate-ping opacity-75" />
            <Mic className="h-5 w-5 relative z-10 text-[var(--color-danger)]" />
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="text-sm font-bold tabular-nums shrink-0 text-[var(--color-danger)] min-w-[36px]">
              {formatDuration(voiceSeconds)}
            </span>
            <div className="flex items-end gap-[2px] h-6 flex-1 overflow-hidden">
              {[...Array(22)].map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-[3px] rounded-full bg-[var(--color-danger)]"
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
            <span className="text-[11px] shrink-0 ml-1 text-[var(--color-text-muted)]">
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

      {/* ── Normal input row ────────────────────────────────────────── */}
      {!voiceRecording && !voiceBlob && (
        <div className="flex items-end gap-1 px-3 py-[9px] min-h-[62px] pb-[max(9px,env(safe-area-inset-bottom,0px))] max-lg:pb-[calc(3.5rem+max(9px,env(safe-area-inset-bottom,0px)))]">
          <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
            <Smile className="h-6 w-6" />
          </WaIconBtn>

          {/* Attach buttons */}
          <div className="flex items-center gap-0.5">
            <label
              htmlFor="wa-img-input"
              className={cn(
                "cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm",
                "hover:bg-[var(--color-border)] transition-colors"
              )}
              aria-label="Attach image"
            >
              <ImageIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
            </label>
            <input
              id="wa-img-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAttachImage(e.target.files)}
            />
            <label
              htmlFor="wa-file-input"
              className={cn(
                "cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm",
                "hover:bg-[var(--color-border)] transition-colors"
              )}
              aria-label="Attach file"
            >
              <FileIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
            </label>
            <input
              id="wa-file-input"
              type="file"
              className="hidden"
              onChange={(e) => onAttachFile(e.target.files)}
            />
          </div>

          {/* Text area + pending attachments */}
          <div className="flex flex-col flex-1 min-w-0">
            {pendingMain.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 py-1.5 mb-1 rounded-sm bg-[var(--color-border)]">
                {pendingMain.map((a, i) => (
                  <div
                    key={a.url}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] font-medium",
                      "bg-[var(--color-surface)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)]"
                    )}
                  >
                    <FileIcon size={11} className="text-[var(--color-accent)]" />
                    <span className="truncate max-w-[90px]">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        setPendingMain((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <X
                        size={12}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center bg-[var(--color-surface)] rounded-lg px-3 py-2.5 border border-[var(--color-border)]">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                rows={1}
                className={cn(
                  "max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
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

          {/* Send / Mic button */}
          {text.trim() || pendingMain.length > 0 ? (
            <button
              type="button"
              disabled={sending}
              aria-label="Send message"
              onClick={onSend}
              className={cn(
                "h-10 w-10 shrink-0 flex items-center justify-center rounded-full",
                "bg-[var(--color-accent)] text-white",
                "hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                "h-10 w-10 shrink-0 flex items-center justify-center rounded-full",
                "bg-[var(--color-accent)] text-white",
                "hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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