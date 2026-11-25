"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";

export type StoryViewerItem = {
  id: string;
  author_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  thumbnail_url: string | null;
  expires_at: string;
  created_at: string;
};

export type StoryViewerGroup = {
  author_id: string;
  author: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_verified?: boolean;
  };
  stories: StoryViewerItem[];
};

type Props = {
  groups: StoryViewerGroup[];
  startGroupIndex: number;
  startStoryIndex?: number;
  onClose: () => void;
};

const PHOTO_MS = 5000;

export function StoryViewer({
  groups,
  startGroupIndex,
  startStoryIndex = 0,
  onClose,
}: Props) {
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(startStoryIndex);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const recordedRef = useRef<Set<string>>(new Set());
  const openedAtRef = useRef(Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const recordView = useCallback(async (storyId: string, watchMs = 0, completionPct = 0) => {
    if (recordedRef.current.has(storyId)) {
      // Still allow watch updates via RPC upsert path
    } else {
      recordedRef.current.add(storyId);
    }
    try {
      await fetch(`/api/stories/${storyId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watch_ms: watchMs,
          completion_pct: completionPct,
        }),
      });
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (!story) return;
    openedAtRef.current = Date.now();
    setProgress(0);
    void recordView(story.id, 0, 0);
  }, [story?.id, recordView, story]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
      return;
    }
    if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      return;
    }
    onClose();
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      return;
    }
    if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
      return;
    }
    setProgress(0);
  }, [storyIdx, groupIdx, groups]);

  useEffect(() => {
    if (!story || paused) return;

    if (story.media_type === "video") {
      const el = videoRef.current;
      if (!el) return;
      const onTime = () => {
        if (!el.duration || !Number.isFinite(el.duration)) return;
        setProgress((el.currentTime / el.duration) * 100);
      };
      const onEnded = () => {
        const watchMs = Math.round((Date.now() - openedAtRef.current));
        void recordView(story.id, watchMs, 100);
        goNext();
      };
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("ended", onEnded);
      void el.play().catch(() => undefined);
      return () => {
        el.removeEventListener("timeupdate", onTime);
        el.removeEventListener("ended", onEnded);
      };
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / PHOTO_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(tick);
        const watchMs = Math.round(Date.now() - openedAtRef.current);
        void recordView(story.id, watchMs, 100);
        goNext();
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [story, paused, goNext, recordView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  const sendReply = async () => {
    if (!story || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      if (res.ok) setReply("");
    } finally {
      setSending(false);
    }
  };

  if (!group || !story) return null;

  const name =
    group.author.full_name?.trim() ||
    group.author.username?.trim() ||
    "Member";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex h-full w-full max-w-md flex-col sm:h-[90vh] sm:rounded-xl sm:overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-10 space-y-2 p-3 pt-4">
          <div className="flex gap-1">
            {group.stories.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white transition-[width] duration-75 ease-linear"
                  style={{
                    width:
                      i < storyIdx
                        ? "100%"
                        : i === storyIdx
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-white/20">
              {group.author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={group.author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <span className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-white">
              <span className="truncate">{name}</span>
              <BlueVerifiedBadge verified={Boolean(group.author.is_verified)} size="sm" label="Verified account" />
            </span>
          </div>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center bg-black"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.media_type === "video" ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.media_url}
              poster={story.thumbnail_url ?? undefined}
              className="max-h-full max-w-full object-contain"
              playsInline
              preload="auto"
              muted={false}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={story.id}
              src={story.media_url}
              alt={story.caption ?? "Story"}
              loading="eager"
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          )}

          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/3"
            aria-label="Previous"
            onClick={goPrev}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/3"
            aria-label="Next"
            onClick={goNext}
          />
        </div>

        {story.caption ? (
          <p className="absolute bottom-20 left-0 right-0 px-4 text-center text-sm text-white drop-shadow">
            {story.caption}
          </p>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 pb-5">
          <button
            type="button"
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Previous story"
            onClick={goPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void sendReply();
              }
            }}
            placeholder="Reply…"
            className={cn(
              "min-w-0 flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2",
              "text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60"
            )}
            maxLength={1000}
          />
          <button
            type="button"
            disabled={!reply.trim() || sending}
            onClick={() => void sendReply()}
            className="rounded-full p-2 text-white disabled:opacity-40"
            aria-label="Send reply"
          >
            <Send className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Next story"
            onClick={goNext}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
