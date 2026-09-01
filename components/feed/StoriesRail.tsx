"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChanges,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import { cn, getInitials } from "@/lib/utils";
import { StoryViewer, type StoryViewerGroup } from "@/components/feed/StoryViewer";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";

const STORY_RING = "border-2 border-[#FF5A1F]";
const STORY_RING_SEEN = "border-2 border-[var(--color-border,#d4d4d8)]";
const AVATAR_SIZE = "h-[56px] w-[56px]";

type StoryApiGroup = StoryViewerGroup & {
  has_unseen?: boolean;
};

function displayName(group: StoryApiGroup) {
  return (
    group.author.full_name?.trim() ||
    group.author.username?.trim() ||
    "Member"
  );
}

function StoryAvatar({
  name,
  url,
}: {
  name: string;
  url: string | null;
  seed?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="h-full w-full rounded-full object-cover" />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600">
      {getInitials(name)}
    </span>
  );
}

export function StoriesRail() {
  const [groups, setGroups] = useState<StoryApiGroup[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ groupIndex: number; storyIndex: number } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = (await res.json()) as {
        groups?: StoryApiGroup[];
        current_user_id?: string;
      };
      setGroups(data.groups ?? []);
      setCurrentUserId(data.current_user_id ?? null);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  // Realtime: refresh rail when stories are created, updated, or removed.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;

    void (async () => {
      channel = await subscribePostgresChanges(
        supabase,
        "feed-stories",
        { event: "*", schema: "public", table: "community_stories" },
        () => {
          void loadStories();
        },
        () => cancelled
      );
    })();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, "feed-stories");
    };
  }, [loadStories]);

  const ownGroup = currentUserId
    ? groups.find((g) => g.author_id === currentUserId)
    : undefined;
  const otherGroups = groups.filter((g) => g.author_id !== currentUserId);

  const openGroup = (authorId: string, storyIndex = 0) => {
    const idx = groups.findIndex((g) => g.author_id === authorId);
    if (idx < 0) return;
    setViewer({ groupIndex: idx, storyIndex });
  };

  const onPickFile = async (files: FileList | null) => {
    if (!currentUserId) {
      window.location.href = buildHubLoginUrl("/communities");
      return;
    }
    const file = files?.[0];
    if (!file) return;
    const isPhoto = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isPhoto && !isVideo) {
      toast.error("Choose a photo or video");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadCommunityChatFile("", "stories", file);
      if (!uploaded.url) throw new Error("Upload failed");
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_url: uploaded.url,
          media_type: isVideo ? "video" : "photo",
          privacy: "followers",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to post story");
        return;
      }
      toast.success("Story posted");
      await loadStories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="w-full min-w-0 px-0.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)]">Stories</h2>
        <Link
          href="/communities/live"
          className="shrink-0 text-[12px] font-medium text-[#FF5A1F] transition-opacity hover:opacity-80"
        >
          View all
        </Link>
      </div>

      <div className="-mx-0.5 flex w-full gap-3 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide snap-x snap-mandatory sm:gap-4">
        <div className="flex w-[64px] shrink-0 snap-start flex-col items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                if (!currentUserId) {
                  window.location.href = buildHubLoginUrl("/communities");
                  return;
                }
                if (ownGroup && ownGroup.stories.length > 0) {
                  openGroup(ownGroup.author_id, 0);
                  return;
                }
                fileRef.current?.click();
              }}
              className="transition-opacity active:opacity-70 motion-reduce:active:opacity-100 disabled:opacity-60"
              aria-label={
                ownGroup?.stories.length ? "View your story" : "Add your story"
              }
            >
              <div className={cn("rounded-full p-[2px]", STORY_RING)}>
                <div
                  className={cn(
                    AVATAR_SIZE,
                    "flex items-center justify-center overflow-hidden rounded-full bg-gray-100"
                  )}
                >
                  {ownGroup?.author.avatar_url ? (
                    <StoryAvatar
                      name="You"
                      url={ownGroup.author.avatar_url}
                      seed="your-story"
                    />
                  ) : (
                    <Plus className="h-5 w-5 text-[#FF5A1F]" strokeWidth={2} />
                  )}
                </div>
              </div>
            </button>
            <button
              type="button"
              aria-label="Add story"
              disabled={uploading}
              onClick={() => {
                if (!currentUserId) {
                  window.location.href = buildHubLoginUrl("/communities");
                  return;
                }
                fileRef.current?.click();
              }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF5A1F] disabled:opacity-60"
            >
              <Plus className="h-3 w-3 text-white" strokeWidth={3} />
            </button>
          </div>
          <span className="max-w-[64px] truncate text-center text-[11px] font-medium text-[var(--color-text-secondary)]">
            {uploading ? "Uploading…" : "Your story"}
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files)}
        />

        {loading
          ? null
          : otherGroups.map((group) => {
              const name = displayName(group);
              const ring = group.has_unseen ? STORY_RING : STORY_RING_SEEN;
              const thumb =
                group.stories[0]?.thumbnail_url ||
                (group.stories[0]?.media_type === "photo"
                  ? group.stories[0]?.media_url
                  : null) ||
                group.author.avatar_url;
              return (
                <button
                  key={group.author_id}
                  type="button"
                  onClick={() => openGroup(group.author_id, 0)}
                  className="flex w-[64px] shrink-0 snap-start flex-col items-center gap-1.5 transition-opacity active:opacity-70 motion-reduce:active:opacity-100"
                >
                  <div className="relative">
                    <div className={cn("rounded-full p-[2px]", ring)}>
                      <div
                        className={cn(
                          AVATAR_SIZE,
                          "overflow-hidden rounded-full bg-gray-100"
                        )}
                      >
                        <StoryAvatar
                          name={name}
                          url={thumb}
                          seed={`story-${group.author_id}`}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="max-w-[64px] truncate text-center text-[11px] font-medium text-[var(--color-text-secondary)]">
                    {name}
                  </span>
                </button>
              );
            })}
      </div>

      {viewer ? (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewer.groupIndex}
          startStoryIndex={viewer.storyIndex}
          onClose={() => {
            setViewer(null);
            void loadStories();
          }}
        />
      ) : null}
    </section>
  );
}
