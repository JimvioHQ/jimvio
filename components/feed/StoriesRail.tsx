"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { STORIES } from "@/lib/feed/mock-data";
import { cn } from "@/lib/utils";

const STORY_RING = "border-2 border-[#FF5C00]";
const AVATAR_SIZE = "h-[54px] w-[54px]";

/** Repeat stories so the horizontal rail can fill wide viewports without blank space. */
const FILL_COPIES = 4;

function StoryAvatar({ name, seed }: { name: string; seed: string }) {
  return (
    <img
      src={`https://picsum.photos/seed/${seed}/108/108`}
      alt={name}
      className="h-full w-full rounded-full object-cover"
    />
  );
}

function StoryIndicator({ story }: { story: (typeof STORIES)[number] }) {
  if (story.live) {
    return (
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#FF5C00] px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white">
        Live
      </span>
    );
  }
  if (story.online) {
    return (
      <span className="absolute -bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-green-500" />
    );
  }
  if (story.verified) {
    return (
      <span className="absolute -bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-blue-500" />
    );
  }
  return null;
}

function StoryItem({
  story,
  instanceKey,
}: {
  story: (typeof STORIES)[number];
  instanceKey: string;
}) {
  return (
    <button
      type="button"
      className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 transition-opacity hover:opacity-80"
    >
      <div className="relative">
        <div className={cn("rounded-full p-[2px]", STORY_RING)}>
          <div className={cn(AVATAR_SIZE, "overflow-hidden rounded-full bg-gray-100")}>
            {story.avatar ? (
              <img src={story.avatar} alt={story.name} className="h-full w-full object-cover" />
            ) : (
              <StoryAvatar name={story.name} seed={`story-${instanceKey}`} />
            )}
          </div>
        </div>
        <StoryIndicator story={story} />
      </div>
      <span className="max-w-[62px] truncate text-center text-[11px] font-medium text-gray-700">
        {story.name}
      </span>
    </button>
  );
}

export function StoriesRail() {
  const railStories = useMemo(() => {
    const out: { story: (typeof STORIES)[number]; key: string }[] = [];
    for (let copy = 0; copy < FILL_COPIES; copy += 1) {
      for (const story of STORIES) {
        out.push({ story, key: `${story.id}-${copy}` });
      }
    }
    return out;
  }, []);

  return (
    <section className="w-full px-0.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-tight text-gray-900">Stories</h2>
        <Link
          href="/communities/live"
          className="text-[12px] font-medium text-[#FF5C00] transition-opacity hover:opacity-80"
        >
          View all
        </Link>
      </div>

      <div className="flex w-full gap-3 overflow-x-auto pb-0.5 scrollbar-hide sm:gap-4">
        <button
          type="button"
          className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 transition-opacity hover:opacity-80"
        >
          <div className="relative">
            <div className={cn("rounded-full p-[2px]", STORY_RING)}>
              <div
                className={cn(
                  AVATAR_SIZE,
                  "flex items-center justify-center rounded-full bg-gray-100"
                )}
              >
                <Plus className="h-5 w-5 text-[#FF5C00]" strokeWidth={2} />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF5C00]">
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          </div>
          <span className="max-w-[62px] truncate text-center text-[11px] font-medium text-gray-700">
            Your story
          </span>
        </button>

        {railStories.map(({ story, key }) => (
          <StoryItem key={key} story={story} instanceKey={key} />
        ))}
      </div>
    </section>
  );
}
