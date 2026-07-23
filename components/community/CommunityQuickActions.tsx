import Link from "next/link";
import {
  Calendar,
  Ellipsis,
  FileText,
  Radio,
  Trophy,
  Wrench,
} from "lucide-react";

type CommunityQuickActionsProps = {
  slug: string;
};

const ACTIONS = [
  { icon: Calendar, label: "Community Calendar", href: (s: string) => `/communities/${s}/events` },
  { icon: FileText, label: "Resources", href: (s: string) => `/communities/${s}/chat` },
  { icon: Wrench, label: "Creator Toolkit", href: (s: string) => `/communities/${s}/toolkit` },
  { icon: Radio, label: "Live Schedule", href: (s: string) => `/communities/${s}/live` },
  { icon: Trophy, label: "Leaderboard", href: (s: string) => `/communities/${s}/leaderboard` },
] as const;

export function CommunityQuickActions({ slug }: CommunityQuickActionsProps) {
  return (
    <nav
      aria-label="Community quick actions"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
    >
      {ACTIONS.map(({ icon: Icon, label, href }) => (
        <Link
          key={label}
          href={href(slug)}
          className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-3 text-center transition-colors hover:border-orange-200 hover:bg-orange-50/40"
        >
          <Icon className="h-5 w-5 text-gray-600" strokeWidth={1.75} />
          <span className="text-[11px] font-medium leading-tight text-gray-700">{label}</span>
        </Link>
      ))}
      <button
        type="button"
        className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-3 text-center transition-colors hover:border-orange-200 hover:bg-orange-50/40"
      >
        <Ellipsis className="h-5 w-5 text-gray-600" strokeWidth={1.75} />
        <span className="text-[11px] font-medium leading-tight text-gray-700">More</span>
      </button>
    </nav>
  );
}
