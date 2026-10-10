"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { JIMVIO_AI_FOOTER, JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

const COMPOSER_MAX_HEIGHT = 128;

function syncComposerHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const previous = el.style.height;
  el.style.height = "auto";
  const next = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  el.style.height = previous === next ? previous : next;
}

type AiComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export function AiComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask about products, campaigns, or communities...",
  autoFocus = false,
}: AiComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!autoFocus) return;
    const el = inputRef.current;
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
  }, [autoFocus]);

  useLayoutEffect(() => {
    syncComposerHeight(inputRef.current);
  }, [value]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const apply = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      setKeyboardInset((prev) => (prev === inset ? prev : inset));
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
    };
  }, []);

  return (
    <div
      className="shrink-0 bg-transparent px-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] sm:px-4"
      style={{ marginBottom: keyboardInset ? keyboardInset : undefined }}
    >
      <form
        className="mx-auto flex w-full max-w-3xl items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && value.trim()) onSubmit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Sparkles
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
            style={{ color: JIMVIO_ORANGE }}
            aria-hidden
          />
          <textarea
            ref={inputRef}
            value={value}
            rows={1}
            onChange={(event) => {
              onChange(event.target.value);
              syncComposerHeight(event.currentTarget);
            }}
            onFocus={(event) => {
              const node = event.currentTarget;
              window.setTimeout(() => {
                node.scrollIntoView({ block: "nearest", inline: "nearest" });
              }, 280);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!disabled && value.trim()) onSubmit();
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Message Jimvio AI"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            className="jimvio-ai-composer max-h-32 min-h-12 w-full resize-none overflow-x-hidden overflow-y-auto rounded-full border border-[#F0C2AE] bg-white py-3 pl-11 pr-4 text-base leading-6 text-[#111827] outline-none placeholder:text-[#889096] focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus-visible:outline-none disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="grid size-12 shrink-0 place-items-center rounded-full text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50 disabled:opacity-50"
          style={{ background: JIMVIO_ORANGE }}
        >
          {disabled ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-3xl px-2 text-center text-[11px] leading-4 text-[#9AA0A6] sm:text-xs">
        {JIMVIO_AI_FOOTER}
      </p>
    </div>
  );
}
