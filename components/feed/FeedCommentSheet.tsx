"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { useFeedUser } from "@/lib/feed/use-feed-user";

type CommentProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
};

type FeedComment = {
  id: string;
  body: string;
  created_at: string;
  author_id?: string;
  parent_id?: string | null;
  profiles?: CommentProfile | null;
};

type FeedCommentSheetProps = {
  postId: string;
  open: boolean;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
};

function CommentAvatar({
  name,
  url,
}: {
  name: string;
  url?: string | null;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold text-stone-600">
      {getInitials(name)}
    </span>
  );
}

/**
 * Inline feed comments — bottom sheet on mobile, side panel on desktop.
 * Keeps the user on the current Feed route (no navigation).
 */
export function FeedCommentSheet({
  postId,
  open,
  onClose,
  onCommentCountChange,
}: FeedCommentSheetProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useFeedUser();
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?sort=newest&limit=50`, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load comments");
        setComments([]);
        return;
      }
      setComments((data.comments ?? []) as FeedComment[]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Comments took too long to load. Try again.");
      } else {
        toast.error("Failed to load comments");
      }
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!open) return;
    void loadComments();
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open, loadComments]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Keep composer above the iOS/Android soft keyboard via visualViewport.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 40 ? inset : 0);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      setKeyboardInset(0);
    };
  }, [open]);

  async function submitComment() {
    const body = text.trim();
    if (!body || sending) return;

    const next =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/communities";

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setSending(true);
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: FeedComment = {
      id: optimisticId,
      body,
      created_at: new Date().toISOString(),
      author_id: user?.id,
      parent_id: null,
      profiles: {
        full_name: user?.fullName ?? user?.username ?? "You",
        avatar_url: user?.avatarUrl ?? null,
        username: user?.username ?? null,
      },
    };
    setComments((prev) => [optimistic, ...prev]);
    setText("");
    onCommentCountChange?.(1);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        onCommentCountChange?.(-1);
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        onCommentCountChange?.(-1);
        toast.error(data.error || "Failed to post comment");
        return;
      }
      const saved = data.comment as FeedComment | undefined;
      if (saved?.id) {
        setComments((prev) => {
          const withoutOptimistic = prev.filter((c) => c.id !== optimisticId);
          if (withoutOptimistic.some((c) => c.id === saved.id)) return withoutOptimistic;
          return [saved, ...withoutOptimistic];
        });
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      onCommentCountChange?.(-1);
      toast.error("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!mounted || !open) return null;

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center lg:items-stretch lg:justify-end">
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-[var(--color-surface,#fff)] shadow-[0_-12px_40px_rgba(0,0,0,0.14)]",
          "h-[min(82dvh,640px)] rounded-t-2xl",
          "lg:h-full lg:w-[400px] lg:max-w-[42vw] lg:rounded-none lg:border-l lg:border-[var(--color-border)] lg:shadow-[-8px_0_32px_rgba(0,0,0,0.08)]",
        )}
        style={{
          paddingBottom: keyboardInset
            ? keyboardInset
            : "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="relative flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-stone-200 lg:hidden" />
          <div className="min-w-0 pt-1 lg:pt-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              Comments
            </h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {comments.length} comment{comments.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-[13px]">Loading comments…</p>
            </div>
          ) : topLevel.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-50 text-[#fd5000]">
                <MessageCircle className="h-5 w-5" />
              </span>
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                No comments yet
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Be the first to share your thoughts.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {topLevel.map((comment) => {
                const name =
                  comment.profiles?.full_name ||
                  comment.profiles?.username ||
                  "Member";
                return (
                  <li key={comment.id} className="min-w-0">
                    <div className="flex gap-2.5">
                      <CommentAvatar name={name} url={comment.profiles?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                            {name}
                          </span>
                          <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                          {comment.body}
                        </p>
                      </div>
                    </div>
                    {repliesOf(comment.id).map((reply) => {
                      const replyName =
                        reply.profiles?.full_name ||
                        reply.profiles?.username ||
                        "Member";
                      return (
                        <div key={reply.id} className="ml-6 mt-3 flex gap-2.5 border-l-2 border-[var(--color-border)] pl-3">
                          <CommentAvatar name={replyName} url={reply.profiles?.avatar_url} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                                {replyName}
                              </span>
                              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                                {formatDistanceToNow(new Date(reply.created_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                              {reply.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface,#fff)] px-3 py-2.5">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submitComment();
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              aria-label="Write a comment"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitComment();
                }
              }}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary,#f4f4f5)] px-3 py-2.5 text-[14px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/50 focus:ring-2 focus:ring-[#fd5000]/15"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Send comment"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fd5000] text-white transition-opacity disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
