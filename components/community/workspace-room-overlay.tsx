// "use client";

// import React, { useEffect, useState } from "react";
// import { createPortal } from "react-dom";
// import {
//   ArrowLeft,
//   Sparkles,
//   MessageCircle,
//   BookOpen,
//   Folder,
//   CheckSquare,
//   Hash,
//   Radio,
//   FileText,
//   LayoutGrid,
//   type LucideIcon,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // ─── Icon map ───────────────────────────────────────────────────────────────

// function spaceIconFromName(name: string | null): LucideIcon {
//   if (!name) return Hash;
//   const map: Record<string, LucideIcon> = {
//     chat: MessageCircle,
//     message: MessageCircle,
//     book: BookOpen,
//     course: BookOpen,
//     learn: BookOpen,
//     folder: Folder,
//     resources: Folder,
//     tasks: CheckSquare,
//     todo: CheckSquare,
//     sparkles: Sparkles,
//     ai: Sparkles,
//   };
//   return map[name.toLowerCase()] ?? Hash;
// }

// // ─── Room type config ────────────────────────────────────────────────────────

// type RoomTypeMeta = {
//   label: string;
//   icon: LucideIcon;
//   accent: string; // tailwind bg class for the dot/pip
// };

// function getRoomTypeMeta(roomType: string): RoomTypeMeta {
//   switch (roomType) {
//     case "chat":
//       return { label: "Live chat", icon: Radio, accent: "bg-emerald-400" };
//     case "posts":
//       return { label: "Discussions", icon: FileText, accent: "bg-sky-400" };
//     case "course":
//       return { label: "Course", icon: BookOpen, accent: "bg-violet-400" };
//     case "tasks":
//       return { label: "Tasks", icon: CheckSquare, accent: "bg-amber-400" };
//     case "resources":
//       return { label: "Resources", icon: LayoutGrid, accent: "bg-rose-400" };
//     default:
//       return { label: roomType, icon: Hash, accent: "bg-zinc-400" };
//   }
// }

// // ─── Component ───────────────────────────────────────────────────────────────

// export function WorkspaceRoomOverlay({
//   communityName,
//   spaceName,
//   spaceIconName,
//   roomName,
//   roomType,
//   onClose,
//   children,
// }: {
//   communityName: string;
//   spaceName: string;
//   spaceIconName: string | null;
//   roomName: string;
//   roomType: string;
//   onClose: () => void;
//   children: React.ReactNode;
// }) {
//   const [mounted, setMounted] = useState(false);
//   const [visible, setVisible] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//     // Defer so the CSS transition has a starting state to animate from
//     const raf = requestAnimationFrame(() => setVisible(true));
//     return () => cancelAnimationFrame(raf);
//   }, []);

//   // Close on Escape
//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onClose();
//     };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [onClose]);

//   // Lock body scroll
//   useEffect(() => {
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = prev;
//     };
//   }, []);

//   const SpaceIcon = spaceIconFromName(spaceIconName);
//   const { label: roomTypeLabel, icon: RoomTypeIcon, accent } = getRoomTypeMeta(roomType);

//   const node = (
//     <div
//       className={cn(
//         // Layout
//         "fixed inset-0 z-[10001] flex flex-col",
//         // Background
//         "bg-[var(--color-bg)]",
//         // Transition
//         "transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]",
//         visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
//       )}
//       role="dialog"
//       aria-modal="true"
//       aria-labelledby="workspace-room-overlay-title"
//     >
//       {/* Subtle ambient gradient — not neon, just warmth */}
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-0"
//         style={{
//           background:
//             "radial-gradient(ellipse 80% 40% at 60% -10%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent)",
//         }}
//       />

//       {/* ── Header ──────────────────────────────────────────────────── */}
//       <header className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--color-border)]/60 bg-[var(--color-surface)]/90 backdrop-blur-sm">

//         {/* Back button — clean, no heavy border */}
//         <button
//           type="button"
//           onClick={onClose}
//           aria-label="Back to workspace"
//           className={cn(
//             "group relative flex items-center justify-center",
//             "h-8 w-8 rounded-md shrink-0",
//             "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
//             "hover:bg-[var(--color-surface-secondary)]",
//             "transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
//           )}
//         >
//           <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
//         </button>

//         {/* Divider */}
//         <div aria-hidden className="h-5 w-px bg-[var(--color-border)]/50 shrink-0" />

//         {/* Breadcrumb + room title */}
//         <div className="min-w-0 flex-1 flex flex-col gap-0.5">
//           {/* Community / Space trail */}
//           <div className="flex items-center gap-1.5 overflow-hidden">
//             <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]/60 truncate select-none leading-none">
//               {communityName}
//             </span>
//             <span aria-hidden className="text-[var(--color-text-muted)]/30 text-[10px] leading-none shrink-0">›</span>
//             <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]/60 truncate select-none leading-none">
//               {spaceName}
//             </span>
//           </div>

//           {/* Room name row */}
//           <div className="flex items-center gap-2">
//             {/* Space icon pill */}
//             <span
//               aria-hidden
//               className="shrink-0 flex items-center justify-center h-5 w-5 rounded bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60"
//             >
//               <SpaceIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
//             </span>

//             <h1
//               id="workspace-room-overlay-title"
//               className="text-sm sm:text-[15px] font-bold tracking-tight text-[var(--color-text-primary)] truncate leading-snug"
//             >
//               {roomName}
//             </h1>
//           </div>
//         </div>

//         {/* Room type badge — right side, desktop only */}
//         <div
//           aria-label={`Room type: ${roomTypeLabel}`}
//           className={cn(
//             "hidden md:inline-flex items-center gap-2 shrink-0",
//             "px-3 py-1.5 rounded-md",
//             "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60",
//             "text-[var(--color-text-muted)] text-[10px] font-semibold tracking-widest uppercase select-none",
//             "transition-colors duration-150 hover:border-[var(--color-border)]"
//           )}
//         >
//           {/* Colored status dot */}
//           <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent)} />
//           <RoomTypeIcon className="h-3 w-3 shrink-0" />
//           {roomTypeLabel}
//         </div>

//         {/* Mobile: just the dot + icon */}
//         <div
//           aria-label={`Room type: ${roomTypeLabel}`}
//           className={cn(
//             "md:hidden flex items-center gap-1.5 shrink-0",
//             "px-2.5 py-1.5 rounded-md",
//             "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60"
//           )}
//         >
//           <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent)} />
//           <RoomTypeIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//         </div>
//       </header>

//       {/* ── Main ────────────────────────────────────────────────────── */}
//       <main className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden">
//         {children}
//       </main>

//       {/* Bottom edge — very subtle, just to finish the surface */}
//       <div
//         aria-hidden
//         className="h-px w-full shrink-0"
//         style={{
//           background:
//             "linear-gradient(to right, transparent, var(--color-border), transparent)",
//           opacity: 0.2,
//         }}
//       />
//     </div>
//   );

//   if (!mounted) return node;
//   return createPortal(node, document.body);
// }

"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  MessageCircle,
  BookOpen,
  Folder,
  CheckSquare,
  Hash,
  Radio,
  FileText,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Icon map ───────────────────────────────────────────────────────────────

function spaceIconFromName(name: string | null): LucideIcon {
  if (!name) return Hash;
  const map: Record<string, LucideIcon> = {
    chat: MessageCircle,
    message: MessageCircle,
    book: BookOpen,
    course: BookOpen,
    learn: BookOpen,
    folder: Folder,
    resources: Folder,
    tasks: CheckSquare,
    todo: CheckSquare,
    sparkles: Sparkles,
    ai: Sparkles,
  };
  return map[name.toLowerCase()] ?? Hash;
}

// ─── Room type config ────────────────────────────────────────────────────────

type RoomTypeMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
};

function getRoomTypeMeta(roomType: string): RoomTypeMeta {
  switch (roomType) {
    case "chat":
      return { label: "Live chat", icon: Radio, accent: "bg-emerald-400" };
    case "posts":
      return { label: "Discussions", icon: FileText, accent: "bg-sky-400" };
    case "course":
      return { label: "Course", icon: BookOpen, accent: "bg-violet-400" };
    case "tasks":
      return { label: "Tasks", icon: CheckSquare, accent: "bg-amber-400" };
    case "resources":
      return { label: "Resources", icon: LayoutGrid, accent: "bg-rose-400" };
    default:
      return { label: roomType, icon: Hash, accent: "bg-zinc-400" };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceRoomOverlay({
  communityName,
  spaceName,
  spaceIconName,
  roomName,
  roomType,
  onClose,
  children,
}: {
  communityName: string;
  spaceName: string;
  spaceIconName: string | null;
  roomName: string;
  roomType: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  // Mount-in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const SpaceIcon = spaceIconFromName(spaceIconName);
  const { label: roomTypeLabel, icon: RoomTypeIcon, accent } = getRoomTypeMeta(roomType);

  return (
    <div
      className={cn(
        // Fills the relative parent (the <main> column) instead of the whole screen
        "absolute inset-0 z-30 flex flex-col rounded-2xl overflow-hidden",
        "bg-[var(--color-bg)]",
        "transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-room-overlay-title"
    >
      {/* Subtle ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 60% -10%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent)",
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--color-border)]/60 bg-[var(--color-surface)]/90 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to workspace"
          className={cn(
            "group relative flex items-center justify-center",
            "h-8 w-8 rounded-md shrink-0",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-surface-secondary)]",
            "transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
          )}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
        </button>

        <div aria-hidden className="h-5 w-px bg-[var(--color-border)]/50 shrink-0" />

        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]/60 truncate leading-none">
              {communityName}
            </span>
            <span aria-hidden className="text-[var(--color-text-muted)]/30 text-[10px] leading-none shrink-0">›</span>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]/60 truncate leading-none">
              {spaceName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="shrink-0 flex items-center justify-center h-5 w-5 rounded bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60"
            >
              <SpaceIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
            </span>
            <h1
              id="workspace-room-overlay-title"
              className="text-sm sm:text-[15px] font-bold tracking-tight text-[var(--color-text-primary)] truncate leading-snug"
            >
              {roomName}
            </h1>
          </div>
        </div>

        <div
          aria-label={`Room type: ${roomTypeLabel}`}
          className={cn(
            "hidden md:inline-flex items-center gap-2 shrink-0",
            "px-3 py-1.5 rounded-md",
            "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60",
            "text-[var(--color-text-muted)] text-[10px] font-semibold tracking-widest uppercase"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent)} />
          <RoomTypeIcon className="h-3 w-3 shrink-0" />
          {roomTypeLabel}
        </div>

        <div
          aria-label={`Room type: ${roomTypeLabel}`}
          className={cn(
            "md:hidden flex items-center gap-1.5 shrink-0",
            "px-2.5 py-1.5 rounded-md",
            "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]/60"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent)} />
          <RoomTypeIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 min-h-0 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}