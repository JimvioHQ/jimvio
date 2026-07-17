"use client";

import {
  Check,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Pin,
  Play,
  Share2,
} from "lucide-react";
import { FEED_POSTS } from "@/lib/feed/mock-data";

function FeedVideoPlayer({
  thumbnail,
  duration,
  overlay,
}: {
  thumbnail: string;
  duration: string;
  overlay?: { title: string; subtitle: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900">
      <img src={thumbnail} alt="" className="aspect-video w-full object-cover" />

      {overlay && (
        <div className="absolute left-4 top-4 max-w-[70%]">
          <p className="text-lg font-bold uppercase leading-tight tracking-wide text-white sm:text-xl">
            {overlay.title}
          </p>
          <span className="mt-1.5 inline-block rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
            {overlay.subtitle}
          </span>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/95 transition-transform hover:scale-105">
          <Play className="ml-0.5 h-5 w-5 text-white" fill="white" />
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="px-3 pt-6">
          <div className="relative h-1 rounded-full bg-white/30">
            <div className="absolute left-0 top-0 h-full w-[45%] rounded-full bg-orange-500" />
            <span className="absolute left-[45%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500" />
          </div>
        </div>
        <div className="mt-1 flex h-8 items-center justify-between bg-black/45 px-3">
          <Pause className="h-3.5 w-3.5 text-white" fill="white" />
          <span className="text-[11px] font-medium tabular-nums text-white">{duration}</span>
        </div>
      </div>
    </div>
  );
}

function formatEngagement(value: number | string): string {
  if (typeof value === "string") return value;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

export function FeedPostCard() {
  return (
    <div className="divide-y divide-gray-100">
      {FEED_POSTS.map((post) => (
        <article
          key={post.id}
          className="bg-transparent px-0.5 py-5 transition-colors first:pt-4 hover:bg-white/40"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <img
                src={
                  post.author.avatar ??
                  `https://picsum.photos/seed/${post.author.handle.replace("@", "")}/80/80`
                }
                alt={post.author.name}
                className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="text-[14px] font-semibold leading-none text-gray-900">
                    {post.author.name}
                  </span>
                  {post.author.verified && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900">
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-[12px] text-gray-400">{post.author.handle}</span>
                  <span className="text-[12px] text-gray-300">·</span>
                  <span className="text-[12px] text-gray-400">{post.timestamp}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {post.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <Flame className="h-3 w-3 text-orange-500" />
                    Lv. {post.author.level} Creator
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Post options"
              className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="pl-[52px]">
            <p className="mb-3 text-[14px] leading-relaxed text-gray-800">{post.body}</p>

            {post.media?.type === "video" && (
              <div className="mb-3">
                <FeedVideoPlayer
                  thumbnail={post.media.thumbnail}
                  duration={post.media.duration}
                  overlay={post.media.overlay}
                />
              </div>
            )}
            {post.media?.type === "image" && (
              <div className="mb-3 overflow-hidden rounded-2xl">
                <img
                  src={post.media.thumbnail}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  {formatEngagement(post.engagement.likes)}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.engagement.comments}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  <Share2 className="h-4 w-4" />
                  {post.engagement.shares}
                </button>
                <button
                  type="button"
                  aria-label="More actions"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {post.engagement.socialProof && (
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="flex shrink-0 -space-x-1.5">
                    {post.engagement.socialProof.avatars.map((name) => (
                      <img
                        key={name}
                        src={`https://picsum.photos/seed/${name.toLowerCase()}/40/40`}
                        alt={name}
                        className="h-5 w-5 rounded-full object-cover shadow-[0_0_0_1.5px_white]"
                      />
                    ))}
                  </div>
                  <span className="truncate text-[11px] text-gray-400">
                    {post.engagement.socialProof.names.join(", ")} +{" "}
                    {post.engagement.socialProof.others} others
                  </span>
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
