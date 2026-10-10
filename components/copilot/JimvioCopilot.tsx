"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Maximize2, Minus, Sparkles, Trash2, X } from "lucide-react";
import { JimvioAiExperience } from "@/components/ai/JimvioAiExperience";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";
import { getCopilotContextMeta } from "@/lib/ai/copilot/context";
import { saveCopilotReturnPath } from "@/lib/ai/copilot/session";
import { useAIStore } from "@/lib/store/use-ai-store";

function CopilotStatusDot({ status }: { status: string }) {
  const color =
    status === "streaming" || status === "thinking"
      ? "bg-amber-500"
      : status === "offline"
        ? "bg-red-500"
        : "bg-emerald-500";
  const label =
    status === "streaming"
      ? "Responding"
      : status === "thinking"
        ? "Thinking"
        : status === "offline"
          ? "Offline"
          : "Ready";

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
      <span className={cn("size-1.5 rounded-full motion-reduce:animate-none animate-pulse", color)} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function JimvioCopilot() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const {
    isAssistantOpen,
    closeAssistant,
    panelMode,
    toggleMinimize,
    pageContext,
    status,
  } = useAIStore();
  const [portalReady] = useState(() => typeof document !== "undefined");
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [clearToken, setClearToken] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const contextMeta = getCopilotContextMeta(pageContext);
  const onAiRoute = pathname === "/ai" || pathname === "/welcome";

  useEffect(() => {
    if (!isAssistantOpen || typeof window === "undefined") return;
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
      setKeyboardInset(0);
    };
  }, [isAssistantOpen]);

  if (!portalReady || onAiRoute || !isAssistantOpen) return null;

  const minimized = panelMode === "minimized";

  const openFullPage = () => {
    saveCopilotReturnPath(pathname);
    closeAssistant();
    router.push("/ai");
  };

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={toggleMinimize}
        aria-label="Open Jimvio AI"
        className="fixed right-4 z-[9999] inline-flex h-12 items-center gap-2 rounded-full border border-[#F3D2C4] bg-white px-4 text-[13px] font-bold text-[#111827] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50"
        style={{
          bottom: `max(76px, calc(env(safe-area-inset-bottom, 0px) + 76px + ${keyboardInset}px))`,
        }}
      >
        <span
          className="grid size-7 place-items-center rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${JIMVIO_ORANGE}, #ff7a45)` }}
        >
          <Sparkles className="size-3.5" />
        </span>
        Jimvio AI
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Jimvio AI"
      className="fixed right-3 z-[9999] flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden border border-[#F3D2C4] bg-[#FFFCF9] text-[#111827] shadow-2xl sm:right-4"
      style={{
        borderRadius: 20,
        bottom: `max(76px, calc(env(safe-area-inset-bottom, 0px) + 76px + ${keyboardInset}px))`,
        height: `min(640px, calc(100dvh - var(--navbar-height, 56px) - 96px - ${keyboardInset}px))`,
        maxHeight: `calc(100dvh - var(--navbar-height, 56px) - 96px - env(safe-area-inset-bottom, 0px) - ${keyboardInset}px)`,
        animation: reducedMotion ? undefined : "jimvio-copilot-enter 280ms ease-out",
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F3E6DE] bg-white/80 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${JIMVIO_ORANGE}, #ff7a45)` }}
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-bold text-[#111827]">Jimvio AI</h2>
            <div className="flex flex-wrap items-center gap-2">
              <CopilotStatusDot status={status} />
              <span className="rounded-full bg-[#FFF1EA] px-2 py-0.5 text-[10px] font-semibold text-[#9A3412]">
                {contextMeta.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setClearToken((value) => value + 1)}
            aria-label="Clear conversation"
            className="grid size-8 place-items-center rounded-lg text-[#6B7280] hover:bg-[#FFF1EA] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={openFullPage}
            aria-label="Open Jimvio AI full screen"
            className="grid size-8 place-items-center rounded-lg text-[#6B7280] hover:bg-[#FFF1EA] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize Jimvio AI"
            className="grid size-8 place-items-center rounded-lg text-[#6B7280] hover:bg-[#FFF1EA] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            aria-label="Close Jimvio AI"
            className="grid size-8 place-items-center rounded-lg text-[#6B7280] hover:bg-[#FFF1EA] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <JimvioAiExperience variant="dock" clearToken={clearToken} />
      </div>
    </div>,
    document.body,
  );
}
