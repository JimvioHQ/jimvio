"use client";

import React, { useState, useRef } from "react";
import { Smile, Paperclip, Send, Sparkles, FileText, Scissors, Users, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  variant?: "dm" | "chat" | "comment";
  placeholder?: string;
  onSubmit?: (text: string, attachmentType?: string) => void;
}

export function Composer({
  variant = "dm",
  placeholder = "Type a message...",
  onSubmit,
}: ComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSubmit?.(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 pr-10 font-body text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition shrink-0",
            text.trim()
              ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm"
              : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Quick action chips — DM variant */}
      {variant === "dm" && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { label: "AI Assist", icon: Sparkles, action: undefined },
            { label: "Send Course", icon: FileText, action: "course" },
            { label: "Share Clip", icon: Scissors, action: undefined },
            { label: "Invite to Space", icon: Users, action: undefined },
            { label: "Share Signal", icon: Radio, action: undefined },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                if (chip.action) {
                  setText(`📎 Sending attachment: ${chip.action}...`);
                } else {
                  setText(`/${chip.label.toLowerCase().replace(/\s+/g, "-")} `);
                  inputRef.current?.focus();
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition shrink-0"
            >
              <chip.icon className="h-3 w-3" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
