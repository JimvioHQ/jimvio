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
import { cn } from "@/lib/utils";

type PostComposerProps = {
  userName?: string;
  avatarUrl?: string | null;
};

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

export function PostComposer({ userName = "John", avatarUrl }: PostComposerProps) {
  const avatarSrc =
    avatarUrl ?? `https://picsum.photos/seed/john-composer/80/80`;

  return (
    <div className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
      {/* Input row */}
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt={userName}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
        <input
          type="text"
          placeholder={`What's on your mind, ${userName}?`}
          className="min-w-0 flex-1 rounded-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:bg-gray-50 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Action chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {ACTION_CHIPS.map((chip) => (
          <ActionChipButton key={chip.label} chip={chip} />
        ))}
      </div>
    </div>
  );
}
