"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  List,
  Loader2,
  MapPin,
  Radio,
  Search,
  Send,
  Sparkles,
  SquareArrowUpRight,
  SquarePen,
  Users,
  Video,
  X,
} from "lucide-react";
import { OPEN_HUB_SEARCH_EVENT } from "@/lib/community/hub-search-event";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import { cn } from "@/lib/utils";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import {
  clearLocalDraft,
  COMPOSER_MAX_CHARS,
  compressImageFile,
  draftStorageKey,
  extractHashtags,
  extractMentions,
  loadLocalDraft,
  saveLocalDraft,
} from "@/lib/feed/composer-utils";
import { stashSessionBoostPost } from "@/lib/feed/session-boost-post";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/feed/PersonAvatar";
import { canPublishAsCommunity } from "@/lib/feed/post-identity";

type Audience = "public" | "followers" | "community" | "private";
type MediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  name: string;
  mime: string;
  status: "uploading" | "ready" | "failed";
  progress: number;
  file?: File;
  alt?: string;
};
type CommunityOption = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string;
};

const AUDIENCE_OPTIONS: { id: Audience; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "followers", label: "Followers" },
  { id: "community", label: "Community" },
  { id: "private", label: "Private" },
];

const LINK_RE = /https?:\/\/[^\s]+/i;

export type PublishedPostResult = {
  postId?: string;
  communitySlug?: string | null;
  communityId?: string | null;
  post?: Record<string, unknown> | null;
};

export function PostComposer({
  initialCommunitySlug = null,
  variant = "inline",
  onPublished,
}: {
  /** Prefill community from `?community=slug` on /create/post */
  initialCommunitySlug?: string | null;
  variant?: "inline" | "page";
  onPublished?: (result: PublishedPostResult) => void;
} = {}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useFeedUser();
  const displayName = user?.displayName ?? "there";
  const avatarLabel = user?.fullName ?? user?.username ?? "You";
  const isPage = variant === "page";

  const [expanded, setExpanded] = useState(isPage);
  const [preview, setPreview] = useState(false);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<"discussion" | "poll">("discussion");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollExpiresAt, setPollExpiresAt] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [postAs, setPostAs] = useState<string>("profile");
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Authorized destinations only (owned first) — server-deduped by community id.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/posts/destinations", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setCommunities([]);
          setCommunityId(null);
          return;
        }
        const destinations = Array.isArray(data.destinations)
          ? (data.destinations as Array<{
              id: string;
              name: string;
              slug: string;
              avatarUrl?: string | null;
              role?: string;
            }>)
          : [];
        // Unique by id (server already dedupes; belt-and-suspenders).
        const seen = new Set<string>();
        const options: CommunityOption[] = [];
        for (const d of destinations) {
          if (!d?.id || seen.has(d.id)) continue;
          seen.add(d.id);
          options.push({
            id: d.id,
            name: d.name,
            slug: d.slug,
            avatarUrl: d.avatarUrl ?? null,
            role: d.role ?? "member",
          });
        }
        setCommunities(options);
        const preferredSlug = initialCommunitySlug?.trim().toLowerCase() ?? "";
        const bySlug = preferredSlug
          ? options.find((c) => c.slug.toLowerCase() === preferredSlug)
          : null;
        setCommunityId(bySlug?.id ?? options[0]?.id ?? null);
      } catch {
        if (!cancelled) {
          setCommunities([]);
          setCommunityId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, initialCommunitySlug]);

  // Restore local draft
  useEffect(() => {
    if (!user?.id) return;
    const draft = loadLocalDraft(draftStorageKey(user.id, communityId));
    if (!draft?.body) return;
    setBody(draft.body);
    if (draft.audience && AUDIENCE_OPTIONS.some((a) => a.id === draft.audience)) {
      setAudience(draft.audience as Audience);
    }
    if (draft.pollOptions?.length) setPollOptions(draft.pollOptions);
    if (draft.mode === "poll") setMode("poll");
    setExpanded(true);
  }, [user?.id, communityId]);

  // Autosave draft
  useEffect(() => {
    if (!user?.id || !body.trim()) return;
    const t = window.setTimeout(() => {
      saveLocalDraft(draftStorageKey(user.id, communityId), {
        body,
        updatedAt: new Date().toISOString(),
        audience,
        pollOptions,
        mode,
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [body, audience, pollOptions, mode, user?.id, communityId]);

  const linkPreview = useMemo(() => body.match(LINK_RE)?.[0] ?? null, [body]);
  const mentions = useMemo(() => extractMentions(body), [body]);
  const hashtags = useMemo(() => extractHashtags(body), [body]);
  const charsLeft = COMPOSER_MAX_CHARS - body.length;

  const uploadOne = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
    const entry: MediaItem = {
      id,
      kind,
      url: "",
      name: file.name,
      mime: file.type,
      status: "uploading",
      progress: 10,
      file,
    };
    setMedia((prev) => [...prev, entry]);
    try {
      let toUpload = file;
      if (kind === "image") {
        toUpload = await compressImageFile(file);
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, progress: 40 } : m))
        );
      } else {
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, progress: 30 } : m))
        );
      }
      const uploaded = await uploadCommunityChatFile("", "feed", toUpload);
      setMedia((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                url: uploaded.url || "",
                status: uploaded.url ? "ready" : "failed",
                progress: uploaded.url ? 100 : 0,
              }
            : m
        )
      );
    } catch {
      setMedia((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "failed", progress: 0 } : m))
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          void uploadOne(file);
        }
      }
    },
    [uploadOne]
  );

  async function retryUpload(item: MediaItem) {
    if (!item.file) return;
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    await uploadOne(item.file);
  }

  async function submit(asDraft = false) {
    if (!communityId) {
      toast.error("Join a community to post");
      window.location.href = "/communities";
      return;
    }
    const trimmed = body.trim();
    const cleanPoll = pollOptions.map((o) => o.trim()).filter(Boolean);
    const readyMedia = media.filter((m) => m.status === "ready" && m.url);
    if (mode === "poll" && cleanPoll.length < 2) {
      toast.error("Add at least 2 poll options");
      return;
    }
    if (mode !== "poll" && !trimmed && readyMedia.length === 0) return;
    if (trimmed.length > COMPOSER_MAX_CHARS) {
      toast.error("Post is too long");
      return;
    }

    if (!communityId) {
      toast.error("Select a community before publishing");
      return;
    }

    setSaving(true);
    try {
      const images = readyMedia.filter((m) => m.kind === "image").map((m) => m.url);
      const videos = readyMedia.filter((m) => m.kind === "video").map((m) => m.url);
      const alt_texts: Record<string, string> = {};
      for (const m of readyMedia) {
        if (m.alt?.trim()) alt_texts[m.url] = m.alt.trim();
      }
      const postType =
        mode === "poll"
          ? "poll"
          : images.length > 1 && videos.length === 0
            ? "carousel"
            : videos.length > 0 && images.length > 0
              ? "mixed"
              : videos.length > 0
                ? "video"
                : images.length > 0
                  ? "photo"
                  : "discussion";

      const selectedSlug =
        communities.find((c) => c.id === communityId)?.slug ??
        initialCommunitySlug ??
        null;

      const res = await fetch("/api/posts/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: postingAsCommunity?.id ?? communityId,
          publish_as: postingAsCommunity ? "community" : "profile",
          body: trimmed || (mode === "poll" ? "Poll" : ""),
          post_type: postType === "carousel" || postType === "mixed" || postType === "photo" || postType === "video"
            ? "discussion"
            : postType,
          images,
          video_url: videos[0] ?? null,
          attachments: {
            videos: videos.slice(1),
            media_kind: postType,
            mentions,
            hashtags,
            gif_ready: true,
          },
          audience,
          location: location.trim() || null,
          alt_texts,
          poll_options: mode === "poll" ? cleanPoll : undefined,
          poll_multiple: mode === "poll" ? pollMultiple : undefined,
          poll_anonymous: mode === "poll" ? pollAnonymous : undefined,
          poll_expires_at: mode === "poll" && pollExpiresAt ? pollExpiresAt : undefined,
          is_published: !asDraft,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message =
          typeof err?.error === "string" && err.error.length < 180 && !/sql|postgres|stack/i.test(err.error)
            ? err.error
            : "Failed to post";
        toast.error(message);
        return;
      }
      const created = (await res.json().catch(() => ({}))) as {
        post?: Record<string, unknown> & { id?: string; community_id?: string };
        community?: { id?: string; slug?: string | null };
      };
      setBody("");
      setMedia([]);
      setPollOptions(["", ""]);
      setMode("discussion");
      setLocation("");
      setPreview(false);
      if (!isPage) setExpanded(false);
      if (user?.id) clearLocalDraft(draftStorageKey(user.id, communityId));
      toast.success(asDraft ? "Draft saved" : "Post published");
      if (!asDraft) {
        if (created.post && typeof created.post.id === "string") {
          stashSessionBoostPost(created.post);
        }
        const communitySlug = created.community?.slug ?? selectedSlug;
        onPublished?.({
          postId: created.post?.id,
          communitySlug,
          communityId: created.community?.id ?? created.post?.community_id ?? communityId,
          post: created.post ?? null,
        });
        router.refresh();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const selectedCommunity = communities.find((c) => c.id === communityId) ?? null;
  const publisherCommunities = communities.filter((community) =>
    canPublishAsCommunity(community.role),
  );
  const postingAsCommunity =
    postAs !== "profile"
      ? publisherCommunities.find((community) => community.id === postAs) ?? null
      : null;
  const composerName = postingAsCommunity?.name ?? avatarLabel;
  const composerAvatar = postingAsCommunity?.avatarUrl ?? user?.avatarUrl ?? null;
  const composerHandle = postingAsCommunity
    ? "Community"
    : user?.username
      ? `@${user.username}`
      : "";
  const readyMedia = media.filter((m) => m.status === "ready" && m.url);

  function openComposer(nextMode?: "discussion" | "poll") {
    if (!isAuthenticated) return;
    // Feed entry must open the dedicated Create Post page (same as Create → Post).
    if (!isPage) {
      const params = new URLSearchParams();
      const slug =
        selectedCommunity?.slug ||
        communities.find((c) => c.id === communityId)?.slug ||
        initialCommunitySlug;
      if (slug) params.set("community", slug);
      if (nextMode === "poll") params.set("mode", "poll");
      const qs = params.toString();
      router.push(qs ? `/create/post?${qs}` : "/create/post");
      return;
    }
    if (nextMode) setMode(nextMode);
    setExpanded(true);
    requestAnimationFrame(() => textRef.current?.focus());
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--color-surface)] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-[var(--color-border)] sm:p-4",
        isPage && "p-5 sm:p-6",
        dragOver && "ring-2 ring-[var(--color-accent)]/40"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!isAuthenticated) return;
        if (!isPage) {
          openComposer();
          return;
        }
        setExpanded(true);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {isPage && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Upload Post</h1>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Text, photo, video, carousel, or poll
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
              Post as
              <select
                aria-label="Post as"
                value={postingAsCommunity?.id ?? "profile"}
                onChange={(e) => {
                  const next = e.target.value;
                  setPostAs(next);
                  if (next !== "profile") setCommunityId(next);
                }}
                className="max-w-[14rem] truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
              >
                <option value="profile">
                  {avatarLabel}
                  {user?.username ? ` — @${user.username}` : ""}
                </option>
                {publisherCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                preview
                  ? "bg-[#fd5000]/10 text-[#fd5000]"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>
      )}

      {preview && isAuthenticated ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <PersonAvatar name={composerName} url={composerAvatar} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">{composerName}</p>
              {composerHandle ? (
                <p className="text-[11px] text-gray-500">{composerHandle}</p>
              ) : null}
              <p className="text-[11px] text-gray-500">
                {selectedCommunity?.name ?? "Community"} · Preview
              </p>
            </div>
          </div>
          {body.trim() ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-900">
              {body}
            </p>
          ) : (
            <p className="text-[13px] text-gray-400">No text yet</p>
          )}
          {mode === "poll" && (
            <div className="space-y-1.5">
              {pollOptions
                .map((o) => o.trim())
                .filter(Boolean)
                .map((opt, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 px-3 py-2 text-[12px] font-medium text-gray-800"
                  >
                    {opt}
                  </div>
                ))}
            </div>
          )}
          {readyMedia.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {readyMedia.map((m) =>
                m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.alt || m.name}
                    className="h-28 w-28 rounded-lg object-cover"
                  />
                ) : (
                  <video
                    key={m.id}
                    src={m.url}
                    className="h-28 w-28 rounded-lg object-cover"
                    muted
                  />
                )
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              Draft
            </button>
            <button
              type="button"
              disabled={saving || media.some((m) => m.status === "uploading")}
              onClick={() => void submit(false)}
              className="inline-flex items-center gap-1 rounded-full bg-[#fd5000] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e04800] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish
            </button>
          </div>
        </div>
      ) : (
      <>
      <div className="flex items-start gap-3">
        {isLoading ? (
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100" />
        ) : (
          <PersonAvatar
            name={isAuthenticated ? composerName : "Sign in"}
            url={isAuthenticated ? composerAvatar : null}
            className="h-10 w-10 shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          {isAuthenticated ? (
            expanded ? (
              <textarea
                ref={textRef}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, COMPOSER_MAX_CHARS))}
                onPaste={(e) => {
                  const files = e.clipboardData?.files;
                  if (files?.length) {
                    e.preventDefault();
                    handleFiles(files);
                  }
                }}
                placeholder={`What's on your mind, ${displayName}?`}
                rows={isPage ? 6 : 4}
                className="w-full resize-none break-words rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:bg-[var(--color-surface-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
              />
            ) : (
              <button
                type="button"
                onClick={() => openComposer()}
                className="w-full min-h-11 rounded-full bg-[var(--color-surface-secondary)] px-4 py-2.5 text-left text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35"
              >
                What&apos;s on your mind, {displayName}?
              </button>
            )
          ) : (
            <Link
              href={buildHubLoginUrl(
                isPage
                  ? `/create/post${initialCommunitySlug ? `?community=${encodeURIComponent(initialCommunitySlug)}` : ""}`
                  : "/communities",
              )}
              className="block min-h-11 min-w-0 flex-1 rounded-full bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              Sign in to share what&apos;s on your mind…
            </Link>
          )}
        </div>
      </div>

      {expanded && isAuthenticated && (
        <div className="mt-3 space-y-3">
          {!isPage && (
            <label className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
              Post as
              <select
                aria-label="Post as"
                value={postingAsCommunity?.id ?? "profile"}
                onChange={(e) => {
                  const next = e.target.value;
                  setPostAs(next);
                  if (next !== "profile") setCommunityId(next);
                }}
                className="max-w-[16rem] truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
              >
                <option value="profile">
                  {avatarLabel}
                  {user?.username ? ` — @${user.username}` : ""}
                </option>
                {publisherCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === "poll" && (
            <div className="space-y-2 rounded-xl border border-gray-100 p-3">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((p, idx) => (idx === i ? e.target.value : p))
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  className="text-xs font-semibold text-orange-600"
                >
                  + Add option
                </button>
              )}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-600">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={pollMultiple}
                    onChange={(e) => setPollMultiple(e.target.checked)}
                  />
                  Multiple choice
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={pollAnonymous}
                    onChange={(e) => setPollAnonymous(e.target.checked)}
                  />
                  Anonymous
                </label>
                <label className="inline-flex items-center gap-1.5">
                  Expires
                  <input
                    type="datetime-local"
                    value={pollExpiresAt}
                    onChange={(e) => setPollExpiresAt(e.target.value)}
                    className="rounded border border-gray-100 bg-gray-50 px-2 py-1"
                  />
                </label>
              </div>
            </div>
          )}

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                >
                  {m.url && m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.alt || m.name} className="h-full w-full object-cover" />
                  ) : m.url && m.kind === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
                      {m.status === "uploading" ? `${m.progress}%` : "Failed"}
                    </div>
                  )}
                  {m.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => void retryUpload(m)}
                      className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {linkPreview && (
            <div className="truncate rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Link preview · {linkPreview}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAudience(opt.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  audience === opt.id
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {opt.label}
              </button>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin className="h-3 w-3" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 120))}
                placeholder="Location"
                className="w-28 border-0 bg-transparent outline-none placeholder:text-gray-400"
              />
            </span>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
              >
                <ImageIcon className="h-3.5 w-3.5" /> Photo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
              >
                <Video className="h-3.5 w-3.5" /> Video
              </button>
              <button
                type="button"
                onClick={() => openComposer("poll")}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]",
                  mode === "poll" ? "bg-[#FF5A1F]/10 text-[#FF5A1F]" : "text-[var(--color-text-secondary)]"
                )}
              >
                <List className="h-3.5 w-3.5" /> Poll
              </button>
              <Link
                href="/communities/live"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign("/communities/live");
                }}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#FF5A1F]/10 px-3 py-2 text-xs font-semibold text-[#FF5A1F] transition-colors hover:bg-[#FF5A1F]/15 active:bg-[#FF5A1F]/20"
              >
                <Radio className="h-3.5 w-3.5" /> Go Live
              </Link>
              <Link
                href="/communities/missions"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                <SquareArrowUpRight className="h-3.5 w-3.5" /> Mission
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-orange-600">
                <Sparkles className="h-3.5 w-3.5" /> GIF-ready
              </span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 sm:ml-auto">
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  charsLeft < 100 ? "text-orange-600" : "text-gray-400"
                )}
              >
                {charsLeft}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit(true)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Draft
              </button>
              <button
                type="button"
                disabled={saving || media.some((m) => m.status === "uploading")}
                onClick={() => void submit(false)}
                className="inline-flex items-center gap-1 rounded-full bg-[#fd5000] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e04800] disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {!expanded && !isPage && (
        <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto border-t border-[var(--color-border)] px-1 pt-3 scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              openComposer();
              fileRef.current?.click();
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Photo
          </button>
          <button
            type="button"
            onClick={() => {
              openComposer();
              fileRef.current?.click();
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
          >
            <Video className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Video
          </button>
          <button
            type="button"
            onClick={() => openComposer()}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
          >
            <SquarePen className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Post
          </button>
          <button
            type="button"
            onClick={() => openComposer("poll")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]"
          >
            <List className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Poll
          </button>
          <Link
            href="/communities/live"
            onClick={(e) => {
              e.preventDefault();
              window.location.assign("/communities/live");
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#FF5A1F]/10 px-3 py-2 text-xs font-semibold text-[#FF5A1F] transition-colors hover:bg-[#FF5A1F]/15 active:bg-[#FF5A1F]/20"
          >
            <Radio className="h-3.5 w-3.5 text-[#FF5A1F]" /> Go Live
          </Link>
          <Link
            href="/communities/missions"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <SquareArrowUpRight className="h-3.5 w-3.5 text-gray-500" /> Mission
          </Link>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent(OPEN_HUB_SEARCH_EVENT));
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <Search className="h-3.5 w-3.5 text-gray-500" /> Search
          </button>
          <button
            type="button"
            onClick={() => openComposer()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fd5000]/10 px-3 py-1.5 text-xs font-medium text-[#fd5000] hover:bg-[#fd5000]/15"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#fd5000]" /> AI Assist
          </button>
        </div>
      )}
      </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,.gif"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
