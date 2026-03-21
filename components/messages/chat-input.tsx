"use client";

import React, { useRef, useState } from "react";
import { Send, Image as ImageIcon, Paperclip, Package, Quote, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { EMOJI_LIST } from "./message-bubble";

const BUCKET = "chat-files";

export function ChatInput({
  conversationId,
  userId,
  onSent,
  replyTo,
  onCancelReply,
  isVendor,
  onRequestQuote,
  onShareProduct,
}: {
  conversationId: string;
  userId: string;
  onSent: () => void;
  replyTo: { id: string } | null;
  onCancelReply: () => void;
  isVendor: boolean;
  onRequestQuote?: () => void;
  onShareProduct?: () => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function uploadFile(file: File, type: "image" | "file") {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl, file_name: file.name };
  }

  async function sendMessage(payload: {
    body?: string | null;
    message_type?: string;
    reply_to_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!conversationId || !userId) return;
    setSending(true);
    const { error } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: payload.body ?? "",
      message_type: payload.message_type ?? "text",
      reply_to_id: payload.reply_to_id ?? replyTo?.id ?? null,
      metadata: payload.metadata ?? {},
    });
    setSending(false);
    if (error) {
      console.error(error);
      return;
    }
    setInput("");
    onCancelReply();
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    onSent();
  }

  async function handleSend() {
    const body = input.trim();
    if (!body && !replyTo) return;
    await sendMessage({ body: body || " ", message_type: "text", reply_to_id: replyTo?.id ?? null });
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const { url } = await uploadFile(file, "image");
      await sendMessage({ body: input.trim() || null, message_type: "image", metadata: { url } });
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, file_name } = await uploadFile(file, "file");
      await sendMessage({ body: input.trim() || null, message_type: "file", metadata: { url, file_name } });
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  }

  function addEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {replyTo && (
        <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg bg-[var(--color-surface-secondary)] text-sm">
          <span className="text-[var(--color-text-muted)]">Replying</span>
          <button type="button" onClick={onCancelReply} className="p-1 rounded hover:bg-[var(--color-border)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-wrap gap-1">
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            className="hidden"
            onChange={handleImage}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {onShareProduct && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onShareProduct}>
              <Package className="h-4 w-4" />
            </Button>
          )}
          {onRequestQuote && (
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onRequestQuote} title="Request quote">
              <Quote className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
            onClick={() => setShowEmoji((s) => !s)}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 min-h-[40px] max-h-32 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={sending || (!input.trim() && !replyTo)}
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {showEmoji && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[var(--color-border)]">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-xl p-1 rounded hover:bg-[var(--color-surface-secondary)]"
              onClick={() => { addEmoji(emoji); setShowEmoji(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
