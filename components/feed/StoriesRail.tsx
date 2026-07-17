"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { STORIES } from "@/lib/feed/mock-data";
import { cn } from "@/lib/utils";

const STORY_RING = "border-2 border-[#FF5C00]";
const AVATAR_SIZE = "h-[54px] w-[54px]";
/** Show More when story count exceeds this or the row overflows */
const STORY_MORE_THRESHOLD = 5;

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

function StoryItem({ story }: { story: (typeof STORIES)[number] }) {
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
              <StoryAvatar name={story.name} seed={`story-${story.id}`} />
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(STORIES.length > STORY_MORE_THRESHOLD);

  const updateShowMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth + 2;
    setShowMore(STORIES.length > STORY_MORE_THRESHOLD || overflows);
  }, []);

  useEffect(() => {
    updateShowMore();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateShowMore);
    observer.observe(el);
    window.addEventListener("resize", updateShowMore);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateShowMore);
    };
  }, [updateShowMore]);

  return (
    <section className="px-0.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-tight text-gray-900">Stories</h2>
        <Link
          href="/communities/stories"
          className="text-[12px] font-medium text-[#FF5C00] transition-opacity hover:opacity-80"
        >
          View all
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-hide sm:gap-4"
        onScroll={updateShowMore}
      >
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

        {STORIES.map((story) => (
          <StoryItem key={story.id} story={story} />
        ))}

        {showMore && (
          <Link
            href="/communities/stories"
            className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 transition-opacity hover:opacity-80"
            aria-label="View more stories"
          >
            <div
              className={cn(
                AVATAR_SIZE,
                "flex items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
              )}
            >
              <ArrowRight className="h-4 w-4 text-gray-700" strokeWidth={2} />
            </div>
            <span className="text-center text-[11px] font-medium text-gray-700">More</span>
          </Link>
        )}
      </div>
    </section>
  );
}
