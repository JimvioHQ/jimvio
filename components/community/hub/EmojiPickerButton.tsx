"use client";

import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile, Sticker } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STICKERS = [
  { id: "thumbsup", src: "👍", label: "Thumbs Up" },
  { id: "fire", src: "🔥", label: "Fire" },
  { id: "heart", src: "❤️", label: "Heart" },
  { id: "rocket", src: "🚀", label: "Rocket" },
  { id: "clap", src: "👏", label: "Clap" },
  { id: "party", src: "🎉", label: "Party" },
  { id: "ok", src: "👌", label: "OK" },
  { id: "wave", src: "👋", label: "Wave" },
  { id: "cry", src: "😂", label: "Laugh" },
  { id: "star", src: "⭐", label: "Star" },
  { id: "muscle", src: "💪", label: "Muscle" },
  { id: "pray", src: "🙏", label: "Pray" },
  { id: "wink", src: "😉", label: "Wink" },
  { id: "cool", src: "😎", label: "Cool" },
  { id: "thinking", src: "🤔", label: "Thinking" },
  { id: "ghost", src: "👻", label: "Ghost" },
];

type EmojiPickerButtonProps = {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  label?: React.ReactNode;
};

export function EmojiPickerButton({ onEmojiSelect, className, label }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open emoji picker"
          className={className ?? "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text)] transition-all"}
        >
          {label ?? <Smile className="h-[18px] w-[18px]" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] border border-[var(--color-border)] bg-[var(--color-card)] p-0 shadow-lg" align="start" side="top" sideOffset={6}>
        {/* Tab bar */}
        <div className="flex items-center border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setTab("emoji")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition",
              tab === "emoji"
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            <Smile className="h-3.5 w-3.5" />
            Emoji
          </button>
          <button
            type="button"
            onClick={() => setTab("stickers")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition",
              tab === "stickers"
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            <Sticker className="h-3.5 w-3.5" />
            Stickers
          </button>
        </div>

        {tab === "emoji" ? (
          <div className="[&_.emoji-mart]:!border-0 [&_.emoji-mart]:!shadow-none [&_.emoji-mart-bar]:!hidden [&_.emoji-mart-search]:!mb-1 [&_.emoji-mart-search_input]:!rounded-lg [&_.emoji-mart-search_input]:!bg-[var(--color-surface)] [&_.emoji-mart-search_input]:!border [&_.emoji-mart-search_input]:!border-[var(--color-border)] [&_.emoji-mart-search_input]:!text-[13px] [&_.emoji-mart-search_input]:!text-[var(--color-text-primary)] [&_.emoji-mart-search_input]:!outline-none [&_.emoji-mart-scroll]:!h-[260px] [&_.emoji-mart-category-label]:!bg-[var(--color-card)] [&_.emoji-mart-category-label_span]:!bg-[var(--color-card)] [&_.emoji-mart-category-label_span]:!text-[11px] [&_.emoji-mart-category-label_span]:!font-semibold [&_.emoji-mart-category-label_span]:!text-[var(--color-text-secondary)] [&_.emoji-mart-emoji]:!cursor-pointer [&_.emoji-mart-emoji:hover]:!scale-110 [&_.emoji-mart-emoji]:!transition-transform">
            <Picker
              data={data}
              theme="light"
              perLine={8}
              emojiSize={22}
              onEmojiSelect={(emoji: { native: string }) => {
                onEmojiSelect(emoji.native);
                setOpen(false);
              }}
              previewPosition="none"
              skin="1"
              set="native"
              autoFocus={false}
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 p-3 max-h-[300px] overflow-y-auto">
            {STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => {
                  onEmojiSelect(sticker.src);
                  setOpen(false);
                }}
                className="flex aspect-square items-center justify-center rounded-xl bg-[var(--color-surface)] text-2xl hover:bg-[var(--color-surface-secondary)] hover:scale-105 transition-all"
                title={sticker.label}
              >
                {sticker.src}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
