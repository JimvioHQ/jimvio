import Link from "next/link";
import { FolderOpen, Mic, Play, Users } from "lucide-react";
import { ACTIVITY_FEED } from "@/lib/feed/mock-data";
import { cn } from "@/lib/utils";

function ActivityAvatar({ item }: { item: (typeof ACTIVITY_FEED)[number] }) {
  if (item.kind === "user") {
    return (
      <img
        src={`https://picsum.photos/seed/${item.avatarSeed}/72/72`}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  const Icon = item.systemIcon === "community" ? FolderOpen : Play;
  const bg =
    item.systemColor === "green"
      ? "bg-green-500"
      : item.systemColor === "blue"
        ? "bg-blue-500"
        : "bg-gray-500";

  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bg)}>
      <Icon className="h-4 w-4 text-white" strokeWidth={2} />
    </span>
  );
}

export function ActivityFeedCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-orange-500" aria-hidden />
          <h3 className="text-sm font-bold text-gray-900">Activity Feed</h3>
        </div>
        <Link href="/communities/activity" className="text-xs font-medium text-orange-500 hover:underline">
          View all
        </Link>
      </div>

      <ul className="space-y-3">
        {ACTIVITY_FEED.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <ActivityAvatar item={item} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-gray-900">{item.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                {"subtitleDot" in item && item.subtitleDot && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                )}
                {item.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] text-gray-400">{item.time}</span>
              {"live" in item && item.live && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Live
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
