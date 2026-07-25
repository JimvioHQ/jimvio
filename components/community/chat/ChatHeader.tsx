import { cn } from "@/lib/utils";
import { ActiveConvPeer, ChatFilter } from "@/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronLeft,
  Copy,
  MoreVertical,
  Phone,
  Search,
  Video,
} from "lucide-react";
import { WaIconBtn } from "./WaIconBtn";


interface ChatHeaderProps {
  roomName: string;
  activeConvId: string | null;
  activeConvPeer: ActiveConvPeer | null;
  isChatting: boolean;
  hideHeader?: boolean;
  onlineCount?: number;
  searchOpen: boolean;
  searchQuery: string;
  chatFilter: ChatFilter;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onCancelSearch: () => void;
  onSetChatFilter: (f: ChatFilter) => void;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onBack: () => void;
  /** When true, MessageSearchBar owns the search UI */
  hideLegacySearchBar?: boolean;
  /** Hide floating call buttons (Space page uses SpaceCallPanel instead). */
  hideCallActions?: boolean;
}

export function ChatHeader({
  roomName,
  activeConvId,
  activeConvPeer,
  isChatting,
  hideHeader,
  onlineCount,
  searchOpen,
  searchQuery,
  chatFilter,
  onToggleSearch,
  onSearchChange,
  onCancelSearch,
  onSetChatFilter,
  onStartAudioCall,
  onStartVideoCall,
  onBack,
  hideLegacySearchBar,
  hideCallActions,
}: ChatHeaderProps) {
  return (
    <>
      {/* ── Mobile back ─────────────────────────────────────────────── */}
      {isChatting && (
        <div className="md:hidden absolute left-3 top-2.5 z-30">
          <button
            type="button"
            aria-label="Back to chat list"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-sm shadow-sm",
              "bg-[var(--color-surface)] text-[var(--color-accent)]",
              "border border-[var(--color-border)]"
            )}
            onClick={onBack}
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      )}

      {/* ── Minimal actions (hideHeader) — calls only; ChannelHeader owns search ─ */}
      {(activeConvId || roomName) && hideHeader && !hideCallActions && (
        <div className="absolute right-3 top-2 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onStartAudioCall}
            aria-label="Audio call"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:scale-105",
              "bg-[var(--color-surface)]/95 border border-[var(--color-border)] shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            )}
          >
            <Phone className="h-4 w-4 text-[var(--color-accent)]" />
          </button>
          <button
            type="button"
            onClick={onStartVideoCall}
            aria-label="Video call"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:scale-105",
              "bg-[var(--color-surface)]/95 border border-[var(--color-border)] shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            )}
          >
            <Video className="h-4 w-4 text-[var(--color-accent)]" />
          </button>
        </div>
      )}

      {/* ── Full header ─────────────────────────────────────────────── */}
      {!hideHeader && (
        <header
          className={cn(
            "flex items-center gap-3 px-4 py-[10px] min-h-[59px] z-10",
            "bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]",
            isChatting && "pl-14"
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center font-bold text-[15px]",
              "overflow-hidden shrink-0",
              "bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
            )}
          >
            {activeConvId ? (
              activeConvPeer?.avatar ? (
                <img
                  src={activeConvPeer.avatar}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <span>{activeConvPeer?.name[0]}</span>
              )
            ) : (
              roomName.slice(0, 2)
            )}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
              {activeConvId ? activeConvPeer?.name : `#${roomName}`}
            </p>
            <p className="text-[12px] text-[var(--color-accent)]">
              {activeConvId
                ? "Online"
                : onlineCount
                  ? `● ${onlineCount} online`
                  : "● Live"}
            </p>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1">
            <WaIconBtn aria-label="Audio call" onClick={onStartAudioCall}>
              <Phone className="h-5 w-5" />
            </WaIconBtn>
            <WaIconBtn aria-label="Video call" onClick={onStartVideoCall}>
              <Video className="h-5 w-5" />
            </WaIconBtn>
            <WaIconBtn
              aria-label="Search messages"
              onClick={onToggleSearch}
              active={searchOpen}
            >
              <Search className="h-5 w-5" />
            </WaIconBtn>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <WaIconBtn aria-label="More options">
                  <MoreVertical className="h-5 w-5" />
                </WaIconBtn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[10055] min-w-[11rem]">
                <DropdownMenuItem
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      typeof window !== "undefined" ? window.location.href : ""
                    )
                  }
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </DropdownMenuItem>
                {(
                  [
                    ["all", "All messages"],
                    ["media", "Media"],
                    ["files", "Files"],
                    ["pinned", "Pinned"],
                    ["threads", "Threads"],
                  ] as [ChatFilter, string][]
                ).map(([key, label]) => (
                  <DropdownMenuItem key={key} onClick={() => onSetChatFilter(key)}>
                    {chatFilter === key ? (
                      <Check className="mr-2 h-4 w-4 text-[var(--color-accent)]" />
                    ) : (
                      <span className="mr-2 inline-block h-4 w-4" />
                    )}
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* ── Legacy search bar (MessageSearchBar replaces this when hideLegacySearchBar) */}
      {searchOpen && !hideLegacySearchBar && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 px-3 py-2",
            "bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]"
          )}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              placeholder="Search messages…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className={cn(
                "w-full rounded-lg border-0 py-2 pl-10 pr-4 text-sm outline-none",
                "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]",
                "placeholder:text-[var(--color-text-muted)]"
              )}
            />
          </div>
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-[var(--color-accent)]"
            onClick={onCancelSearch}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}