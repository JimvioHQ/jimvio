import Link from "next/link";
import { Calendar, FileText, Radio, Trophy, Wrench } from "lucide-react";

type CommunityQuickActionsProps = {
  slug: string;
};

const ACTIONS = [
  { icon: Calendar, label: "Calendar", href: (slug: string) => `/c/${slug}/events` },
  { icon: FileText, label: "Resources", href: (slug: string) => `/c/${slug}?space=resources` },
  { icon: Wrench, label: "Toolkit", href: () => `/c/analytics` },
  { icon: Radio, label: "Live Schedule", href: (slug: string) => `/c/${slug}/live` },
  { icon: Trophy, label: "Leaderboard", href: (slug: string) => `/c/${slug}/leaderboard` },
] as const;

export function CommunityQuickActions({ slug }: CommunityQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {ACTIONS.map(({ icon: Icon, label, href }) => (
        <Link
          key={label}
          href={href(slug)}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-4 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
        >
          <Icon className="h-5 w-5 text-gray-600" />
          <span className="text-center text-xs font-medium text-gray-700">{label}</span>
        </Link>
      ))}
    </div>
  );
}
