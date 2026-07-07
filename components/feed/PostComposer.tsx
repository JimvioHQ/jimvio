"use client";

import Link from "next/link";
import {
  BarChart3,
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
  { icon: ImageIcon, label: "Photo" },
  { icon: Video, label: "Video" },
  { icon: Scissors, label: "Clip" },
  { icon: List, label: "Poll" },
  { icon: Radio, label: "Go Live", highlight: true },
  { icon: SquareArrowUpRight, label: "Mission", href: "/c/missions" },
  { icon: Sparkles, label: "AI Assist", highlight: true },
];

function ActionChipButton({ chip }: { chip: ActionChip }) {
  const { icon: Icon, label, highlight, href } = chip;
  const className = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
    highlight
      ? "bg-orange-50 text-orange-500 hover:bg-orange-100"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  );

  const iconClass = cn("h-3.5 w-3.5", highlight ? "text-orange-500" : "text-gray-600");

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
    <div className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200" />
        ) : user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={avatarLabel}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-sm font-semibold text-white">
            {getInitials(isAuthenticated ? avatarLabel : "?")}
          </span>
        )}

        {isAuthenticated ? (
          <input
            type="text"
            placeholder={`What's on your mind, ${displayName}?`}
            className="min-w-0 flex-1 rounded-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:bg-gray-50 focus:ring-2 focus:ring-orange-100"
          />
        ) : (
          <Link
            href={buildHubLoginUrl("/c")}
            className="min-w-0 flex-1 rounded-md bg-gray-100 px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50"
          >
            Sign in to share what&apos;s on your mind…
          </Link>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {ACTION_CHIPS.map((chip) => (
          <ActionChipButton key={chip.label} chip={chip} />
        ))}
      </div>
    </div>
  );
}
