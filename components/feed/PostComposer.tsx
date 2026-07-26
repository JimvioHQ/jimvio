"use client";

import Link from "next/link";
import {
  Image as ImageIcon,
  List,
  Radio,
  Scissors,
  Sparkles,
  SquareArrowUpRight,
  Video,
} from "lucide-react";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import { cn, getInitials } from "@/lib/utils";

type ActionChip = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  highlight?: boolean;
  href?: string;
};

const ACTION_CHIPS: ActionChip[] = [
  { icon: ImageIcon, label: "Photo", href: "/communities" },
  { icon: Video, label: "Video", href: "/communities" },
  { icon: Scissors, label: "Clip", href: "/communities" },
  { icon: List, label: "Poll", href: "/communities" },
  { icon: Radio, label: "Go Live", highlight: true, href: "/communities/live" },
  { icon: SquareArrowUpRight, label: "Mission", href: "/communities/missions" },
  { icon: Sparkles, label: "AI Assist", highlight: true, href: "/communities" },
];

function ActionChipButton({ chip }: { chip: ActionChip }) {
  const { icon: Icon, label, highlight, href } = chip;
  const className = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
    highlight
      ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  );

  const iconClass = cn("h-3.5 w-3.5", highlight ? "text-orange-500" : "text-gray-500");

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className={iconClass} />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      <Icon className={iconClass} />
      {label}
    </button>
  );
}

export function PostComposer() {
  const { user, isLoading, isAuthenticated } = useFeedUser();
  const displayName = user?.displayName ?? "there";
  const avatarLabel = user?.fullName ?? user?.username ?? "You";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100" />
        ) : user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={avatarLabel}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
            {getInitials(isAuthenticated ? avatarLabel : "?")}
          </span>
        )}

        {isAuthenticated ? (
          <input
            type="text"
            placeholder={`What's on your mind, ${displayName}?`}
            className="min-w-0 flex-1 rounded-full bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:bg-gray-100/80"
          />
        ) : (
          <Link
            href={buildHubLoginUrl("/communities")}
            className="min-w-0 flex-1 rounded-full bg-gray-50 px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
          >
            Sign in to share what&apos;s on your mind…
          </Link>
        )}
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto border-t border-gray-100 pt-3 scrollbar-hide">
        {ACTION_CHIPS.map((chip) => (
          <ActionChipButton key={chip.label} chip={chip} />
        ))}
      </div>
    </div>
  );
}
