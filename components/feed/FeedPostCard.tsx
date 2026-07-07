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
    <div className="relative overflow-hidden rounded-xl bg-gray-900">
      <img src={thumbnail} alt="" className="aspect-video w-full object-cover" />

      {/* Title overlay */}
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

      {/* Center play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg">
          <Play className="ml-1 h-6 w-6 text-white" fill="white" />
        </span>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="px-3 pt-6">
          <div className="relative h-1 rounded-full bg-white/30">
            <div className="absolute left-0 top-0 h-full w-[45%] rounded-full bg-orange-500" />
            <span className="absolute left-[45%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500 shadow" />
          </div>
        </div>
        <div className="mt-1 flex h-8 items-center justify-between bg-black/50 px-3">
          <Pause className="h-3.5 w-3.5 text-white" fill="white" />
          <span className="text-[11px] font-medium tabular-nums text-white">{duration}</span>
        </div>
        {/* Frame strip hint */}
        <div className="flex h-1 gap-px bg-black/40">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-full flex-1 bg-white/10" />
          ))}
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
    <div className="space-y-4">
      {FEED_POSTS.map((post) => (
        <article key={post.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 gap-3">
              <img
                src={
                  post.author.avatar ??
                  `https://picsum.photos/seed/${post.author.handle.replace("@", "")}/80/80`
                }
                alt={post.author.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-sm font-bold text-gray-900">{post.author.name}</span>
                  {post.author.verified && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{post.author.handle}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{post.timestamp}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {post.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                      <Pin className="h-2.5 w-2.5" />
                      Pinned
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                    <Flame className="h-2.5 w-2.5" />
                    Lv. {post.author.level} Creator
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Post options"
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <p className="mb-3 text-sm leading-relaxed text-gray-900">{post.body}</p>

          {/* Media */}
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
            <div className="mb-3 overflow-hidden rounded-xl">
              <img src={post.media.thumbnail} alt="" className="aspect-video w-full object-cover" />
            </div>
          )}

          {/* Engagement */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
              <button type="button" className="inline-flex items-center gap-1.5 hover:text-red-500">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                {formatEngagement(post.engagement.likes)}
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 hover:text-orange-500">
                <MessageCircle className="h-4 w-4" />
                {post.engagement.comments}
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 hover:text-orange-500">
                <Share2 className="h-4 w-4" />
                {post.engagement.shares}
              </button>
              <button type="button" className="hover:text-gray-800">
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
                      className="h-5 w-5 rounded-full border border-white object-cover"
                    />
                  ))}
                </div>
                <span className="truncate text-[11px] text-gray-500">
                  {post.engagement.socialProof.names.join(", ")} + {post.engagement.socialProof.others}{" "}
                  others
                </span>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
