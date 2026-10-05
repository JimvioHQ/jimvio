"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  POST_VIEW_MIN_DWELL_MS,
  POST_VIEW_THRESHOLD,
  flushPostViewsNow,
  hasClientSeenPostView,
  queuePostView,
  subscribePostViewRecorded,
} from "@/lib/feed/post-view-tracker";

/**
 * Observe a post card and record a qualifying view once it stays visible
 * for POST_VIEW_MIN_DWELL_MS at ≥ POST_VIEW_THRESHOLD intersection.
 */
export function usePostViewTracker<T extends HTMLElement = HTMLElement>(
  postId: string,
  onRecorded?: (viewCount: number | null, recorded: boolean) => void,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSince = useRef<number | null>(null);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  useEffect(() => {
    return subscribePostViewRecorded((id, count, recorded) => {
      if (id !== postId) return;
      onRecordedRef.current?.(count, recorded);
    });
  }, [postId]);

  useEffect(() => {
    function onHide() {
      flushPostViewsNow();
    }
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });
    return () => {
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasClientSeenPostView(postId)) return;
    if (typeof IntersectionObserver === "undefined") return;

    const clearDwell = () => {
      if (dwellTimer.current) {
        clearTimeout(dwellTimer.current);
        dwellTimer.current = null;
      }
      visibleSince.current = null;
    };

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || hasClientSeenPostView(postId)) {
          obs.disconnect();
          clearDwell();
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= POST_VIEW_THRESHOLD) {
          if (visibleSince.current == null) {
            visibleSince.current = Date.now();
            dwellTimer.current = setTimeout(() => {
              if (hasClientSeenPostView(postId)) return;
              const started = visibleSince.current ?? Date.now();
              const watchMs = Math.max(POST_VIEW_MIN_DWELL_MS, Date.now() - started);
              queuePostView(postId, watchMs);
              obs.disconnect();
              clearDwell();
            }, POST_VIEW_MIN_DWELL_MS);
          }
        } else {
          clearDwell();
        }
      },
      { threshold: [0, POST_VIEW_THRESHOLD, 0.75, 1] },
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      clearDwell();
    };
  }, [postId]);

  return ref;
}
