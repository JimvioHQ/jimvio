import { Trash2, Loader2, Send } from "lucide-react";
import { useEffect, useMemo } from "react";
import { WaAudioPlayer } from "./WaAudioPlayer";

interface VoicePreviewProps {
  blob: Blob;
  onSend: () => void;
  onDiscard: () => void;
  sending: boolean;
}

export function VoicePreview({ blob, onSend, onDiscard, sending }: VoicePreviewProps) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-sm
                 bg-[var(--color-surface)]
                 border border-[var(--color-border)]"
    >
      <WaAudioPlayer src={url} isOwn />

      {/* Discard */}
      <button
        type="button"
        onClick={onDiscard}
        title="Discard recording"
        aria-label="Discard recording"
        className="h-8 w-8 flex items-center justify-center rounded-sm
                   hover:bg-[var(--color-danger-light)] transition-colors"
      >
        <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
      </button>

      {/* Send */}
      <button
        type="button"
        onClick={onSend}
        disabled={sending}
        title="Send voice message"
        aria-label="Send voice message"
        className="h-9 w-9 flex items-center justify-center rounded-full
                   bg-[var(--color-accent)] text-white
                   disabled:opacity-50 hover:scale-105 transition-all"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}