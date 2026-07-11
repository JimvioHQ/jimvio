"use client";

import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type EmojiPickerButtonProps = {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  label?: React.ReactNode;
};

export function EmojiPickerButton({ onEmojiSelect, className, label }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open emoji picker"
          className={className ?? "p-0.5 rounded-md hover:bg-muted/80 transition-colors"}
        >
          {label ?? <Smile className="h-4 w-4 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-0 p-0 shadow-lg" align="start" side="top">
        <Picker
          data={data}
          theme="light"
          onEmojiSelect={(emoji: { native: string }) => {
            onEmojiSelect(emoji.native);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
