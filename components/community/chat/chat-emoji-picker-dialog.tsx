"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import data from "@emoji-mart/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Picker = dynamic(() => import("@emoji-mart/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(45vh,360px)] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
    </div>
  ),
});

type EmojiSelect = { native: string };

export function ChatEmojiPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (native: string) => void;
}) {
  const [tab, setTab] = useState("emoji");

  function handleEmoji(emoji: EmojiSelect) {
    onSelect(emoji.native);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[10050]"
        className="z-[10051] max-h-[min(90vh,560px)] w-full max-w-[420px] translate-y-[-52%] gap-0 overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)] p-0 sm:max-w-[420px]"
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
          <DialogTitle className="text-lg font-black text-[var(--color-text-primary)]">Emoji & stickers</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="px-3 pb-3">
          <TabsList className="w-full justify-stretch mt-2">
            <TabsTrigger value="emoji" className="flex-1 text-xs font-black">
              Emoji
            </TabsTrigger>
            <TabsTrigger value="stickers" className="flex-1 text-xs font-black">
              Stickers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="emoji" className="mt-3 max-h-[min(45vh,360px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
            <Picker
              data={data}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              onEmojiSelect={handleEmoji}
            />
          </TabsContent>
          <TabsContent value="stickers" className="mt-3 max-h-[min(45vh,360px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
            <Picker
              data={data}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              emojiSize={36}
              perLine={6}
              onEmojiSelect={handleEmoji}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
