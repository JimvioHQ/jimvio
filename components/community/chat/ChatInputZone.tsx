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
  Bold,
  Italic,
  List,
  Sparkles,
  AtSign,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useId, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { ReplyBar } from "./ReplyBar";
import { VoicePreview } from "./VoicePreview";
import { WaIconBtn } from "./WaIconBtn";
import { formatDuration, cn } from "@/lib/utils";

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
  onOpenAi?: () => void;
  onAttachCommerce?: () => void;
  /** Space Discussion: full-width rounded composer on soft canvas. */
  variant?: "default" | "discussion";
}

function filesFromList(list: FileList | File[]): FileList {
  if (typeof FileList !== "undefined" && list instanceof FileList) return list;
  const dt = new DataTransfer();
  for (const f of Array.from(list as File[])) dt.items.add(f);
  return dt.files;
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
  onOpenAi,
  onAttachCommerce,
  variant = "default",
}: ChatInputZoneProps) {
  const discussion = variant === "discussion";
  const uid = useId();
  const imgInputId = `${uid}-img`;
  const fileInputId = `${uid}-file`;
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  function pickImage(files: FileList | null) {
    onAttachImage(files);
    if (imgRef.current) imgRef.current.value = "";
  }

  function pickFile(files: FileList | null) {
    onAttachFile(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  const wrapSelection = useCallback(
    (before: string, after = before) => {
      const el = taRef.current;
      if (!el) {
        setText(`${before}${text}${after}`);
        return;
      }
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const selected = text.slice(start, end) || "text";
      const next =
        text.slice(0, start) + before + selected + after + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + before.length + selected.length + after.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [text, setText]
  );

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const images: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) images.push(f);
      }
    }
    if (images.length) {
      e.preventDefault();
      pickImage(filesFromList(images));
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const rest = Array.from(files).filter((f) => !f.type.startsWith("image/"));
    if (imgs.length) pickImage(filesFromList(imgs));
    if (rest.length) pickFile(filesFromList(rest));
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col",
        discussion
          ? "discussion-chat-canvas border-t-0 px-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] pt-1 sm:px-6 lg:px-8"
          : "border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
    >
      {dragging && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-20 flex items-center justify-center",
            "border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent-subtle)]/80",
            "text-sm font-semibold text-[var(--color-accent)]"
          )}
          aria-hidden
        >
          Drop files to attach
        </div>
      )}

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
        <>
          {/* Formatting toolbar — default only */}
          {!discussion ? (
            <div className="flex items-center gap-0.5 px-3 pt-2">
              <FormatBtn
                label="Bold"
                onClick={() => wrapSelection("**")}
                icon={Bold}
              />
              <FormatBtn
                label="Italic"
                onClick={() => wrapSelection("_")}
                icon={Italic}
              />
              <FormatBtn
                label="List"
                onClick={() => setText(text ? `${text}\n- ` : "- ")}
                icon={List}
              />
              <FormatBtn
                label="Mention"
                onClick={() => {
                  setText(`${text}@`);
                  taRef.current?.focus();
                }}
                icon={AtSign}
              />
              <span className="mx-1 h-4 w-px bg-[var(--color-border)]" />
              <FormatBtn
                label="AI assist (coming soon)"
                onClick={() => onOpenAi?.()}
                icon={Sparkles}
                disabled={!onOpenAi}
              />
              <span className="ml-auto hidden text-[10px] text-[var(--color-text-muted)] sm:inline">
                Enter to send · Shift+Enter newline
              </span>
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-h-[62px] items-end gap-1",
              discussion
                ? "mx-auto w-full max-w-none items-center gap-2 rounded-[1.75rem] border border-white/80 bg-white px-3 py-2 shadow-[0_8px_30px_-12px_rgba(67,51,96,0.25)] ring-1 ring-violet-100/60 max-lg:mb-[3.25rem]"
                : "px-3 py-[9px] pb-[max(9px,env(safe-area-inset-bottom,0px))] max-lg:pb-[calc(3.5rem+max(9px,env(safe-area-inset-bottom,0px)))]"
            )}
          >
            {discussion ? (
              <button
                type="button"
                aria-label="Attach file"
                onClick={() => fileRef.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
              >
                <span className="text-lg font-medium leading-none">+</span>
              </button>
            ) : (
              <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
                <Smile className="h-6 w-6" />
              </WaIconBtn>
            )}

            <div className="flex items-center gap-0.5">
              <label
                htmlFor={imgInputId}
                className={cn(
                  "flex h-9 w-9 cursor-pointer items-center justify-center transition-colors",
                  discussion ? "rounded-full" : "rounded-sm",
                  uploading
                    ? "pointer-events-none opacity-50"
                    : discussion
                      ? "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                      : "hover:bg-[var(--color-border)]"
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
                multiple
                className="hidden"
                disabled={uploading || sending}
                onChange={(e) => pickImage(e.target.files)}
              />
              {discussion ? (
                <>
                  <button
                    type="button"
                    aria-label="Emoji picker"
                    onClick={onOpenEmojiPicker}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mention"
                    onClick={() => {
                      setText(`${text}@`);
                      taRef.current?.focus();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                  >
                    <AtSign className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <label
                  htmlFor={fileInputId}
                  className={cn(
                    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm transition-colors",
                    uploading
                      ? "pointer-events-none opacity-50"
                      : "hover:bg-[var(--color-border)]"
                  )}
                  aria-label="Attach file"
                >
                  <FileIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
                </label>
              )}
              <input
                ref={fileRef}
                id={fileInputId}
                type="file"
                accept="*/*"
                multiple
                className="hidden"
                disabled={uploading || sending}
                onChange={(e) => pickFile(e.target.files)}
              />
              {onAttachCommerce && !discussion && (
                <button
                  type="button"
                  aria-label="Attach commerce offer"
                  onClick={onAttachCommerce}
                  disabled={sending || uploading}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-sm transition-colors",
                    "hover:bg-[var(--color-border)] disabled:opacity-50"
                  )}
                >
                  <ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />
                </button>
              )}
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

              <div
                className={cn(
                  "flex items-center",
                  discussion
                    ? "px-1 py-1"
                    : "rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 focus-within:ring-2 focus-within:ring-[var(--color-accent)]"
                )}
              >
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={onPaste}
                  placeholder={discussion ? "Type a message..." : "Write a message..."}
                  rows={1}
                  disabled={sending || uploading}
                  aria-label="Message composer"
                  className={cn(
                    "max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 outline-none",
                    discussion ? "text-[14px]" : "text-sm",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                      e.preventDefault();
                      wrapSelection("**");
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
                      e.preventDefault();
                      wrapSelection("_");
                    }
                  }}
                />
              </div>
            </div>

            {discussion ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={sending || uploading}
                  aria-label="Record voice message"
                  title="Voice message"
                  onClick={() => void onStartVoice()}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    "bg-violet-500 text-white shadow-sm",
                    "transition-all hover:bg-violet-600 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={sending || uploading || (!text.trim() && pendingMain.length === 0)}
                  aria-label="Send message"
                  onClick={onSend}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    "bg-violet-500 text-white shadow-sm",
                    "transition-all hover:bg-violet-600 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : text.trim() || pendingMain.length > 0 ? (
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
                title="Voice message"
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
        </>
      )}
    </div>
  );
}

function FormatBtn({
  label,
  onClick,
  icon: Icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Bold;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm",
        "text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
