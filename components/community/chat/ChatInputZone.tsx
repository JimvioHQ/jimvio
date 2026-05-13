import { Textarea } from "@/components/ui/textarea";
import { ChatAttachmentPayload } from "@/lib/community-chat-upload";
import { Msg } from "@/types";
import { Mic, StopCircle, Smile, ImageIcon, FileIcon, X, Loader2, Send } from "lucide-react";
import { ReplyBar } from "./ReplyBar";
import { VoicePreview } from "./VoicePreview";
import { WaIconBtn } from "./WaIconBtn";
import { formatDuration } from "@/lib/utils";

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
    <div className="flex flex-col shrink-0 bg-[#f0f2f5] border-t border-[#d1d7db]">
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

      {/* Recording indicator */}
      {voiceRecording && (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
            <Mic className="h-5 w-5 relative z-10 text-red-500" />
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="text-sm font-bold tabular-nums shrink-0 text-red-500 min-w-[36px]">
              {formatDuration(voiceSeconds)}
            </span>
            <div className="flex items-end gap-[2px] h-6 flex-1 overflow-hidden">
              {[...Array(22)].map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-[3px] rounded-full bg-red-400"
                  style={{
                    height: `${28 +
                      Math.sin((i + voiceSeconds * 3) * 0.7) * 22 +
                      Math.cos((i * 1.3 + voiceSeconds) * 0.9) * 12}%`,
                    opacity: 0.55 + (i % 4) * 0.1,
                    transition: "height 0.15s ease",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] shrink-0 ml-1 text-[#667781]">Recording…</span>
          </div>
          <button
            type="button"
            onClick={onStopVoice}
            aria-label="Stop recording"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow"
          >
            <StopCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Normal input */}
      {!voiceRecording && !voiceBlob && (
        <div className="flex items-end gap-1 px-3 py-[9px] min-h-[62px] pb-[max(9px,env(safe-area-inset-bottom,0px))]">
          <WaIconBtn aria-label="Emoji picker" onClick={onOpenEmojiPicker}>
            <Smile className="h-6 w-6" />
          </WaIconBtn>

          <div className="flex items-center gap-0.5">
            <label
              htmlFor="wa-img-input"
              className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
              aria-label="Attach image"
            >
              <ImageIcon className="h-5 w-5 text-[#667781]" />
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
              className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-sm hover:bg-black/5"
              aria-label="Attach file"
            >
              <FileIcon className="h-5 w-5 text-[#667781]" />
            </label>
            <input
              id="wa-file-input"
              type="file"
              className="hidden"
              onChange={(e) => onAttachFile(e.target.files)}
            />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            {pendingMain.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 py-1.5 mb-1 rounded-sm bg-black/[0.04]">
                {pendingMain.map((a, i) => (
                  <div
                    key={a.url}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-sm text-[11px] font-medium border border-[#d1d7db]"
                  >
                    <FileIcon size={11} className="text-[#00a884]" />
                    <span className="truncate max-w-[90px]">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() => setPendingMain((p) => p.filter((_, j) => j !== i))}
                    >
                      <X size={12} className="hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center bg-white rounded-lg px-3 py-2.5">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                rows={1}
                className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-[#111b21]"
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
              disabled={sending}
              aria-label="Send message"
              onClick={onSend}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          ) : (
            <button
              type="button"
              disabled={sending || uploading}
              aria-label="Record voice message"
              onClick={() => void onStartVoice()}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#00a884] text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}