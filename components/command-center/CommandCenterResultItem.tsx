"use client";

import {
  BookOpen,
  Bot,
  Command,
  Flame,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Percent,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Store,
  Ticket,
  Upload,
  UserPlus,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, getImage } from "@/lib/utils";
import type { CommandResult, CommandResultKind } from "@/lib/command-center/types";

const ICONS: Record<string, LucideIcon> = {
  store: Store,
  upload: Upload,
  users: Users,
  graduation: GraduationCap,
  megaphone: Megaphone,
  video: Video,
  package: Package,
  wallet: Wallet,
  "user-plus": UserPlus,
  ticket: Ticket,
  flame: Flame,
  sparkles: Sparkles,
  search: Search,
  percent: Percent,
  cart: Package,
  receipt: Receipt,
  message: MessageSquare,
  settings: Settings,
  help: HelpCircle,
  layout: LayoutDashboard,
  command: Command,
  bot: Bot,
  course: BookOpen,
};

const KIND_COLORS: Partial<Record<CommandResultKind, string>> = {
  product: "#fd5000",
  community: "#16a34a",
  "ugc-campaign": "#7c3aed",
  "affiliate-campaign": "#2563eb",
  ai: "#fd5000",
  command: "#64748b",
};

type CommandCenterResultItemProps = {
  item: CommandResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
};

export function CommandCenterResultItem({
  item,
  active,
  onSelect,
  onHover,
}: CommandCenterResultItemProps) {
  const Icon = ICONS[item.icon ?? "command"] ?? Command;
  const accent = KIND_COLORS[item.kind] ?? "var(--color-accent)";
  const image = item.image ? getImage(item.image) : null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[transform,background-color,border-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        active
          ? "scale-[1.01] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8"
          : "border border-transparent hover:bg-[var(--color-surface-secondary)]",
      )}
      style={{ willChange: "transform" }}
    >
      <span
        className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ color: accent }}
        aria-hidden
      >
        {image && image !== "/placeholder.png" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
            {item.title}
          </span>
          {item.badge && (
            <span className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {item.badge}
            </span>
          )}
        </span>
        {item.subtitle && (
          <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
            {item.subtitle}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {item.kind.replace("-", " ")}
      </span>
    </button>
  );
}
