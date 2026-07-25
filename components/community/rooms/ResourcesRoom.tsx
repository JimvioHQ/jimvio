"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Film, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { isTrustedChatMediaUrl } from "@/lib/community/chat/sanitize-attachments";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";

type Attachment = { url?: string; name?: string; type?: string; size?: string };

type Post = {
  id: string;
  title: string | null;
  body: string;
  attachments: unknown;
  images: unknown;
  created_at: string;
  author_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Attachment[];
  if (typeof raw === "object") {
    const bag = raw as { files?: Attachment[] };
    if (Array.isArray(bag.files)) return bag.files;
  }
  return [];
}

function fileIcon(a: Attachment) {
  const t = (a.type || "").toLowerCase();
  const n = (a.name || a.url || "").toLowerCase();
  if (t.includes("video") || n.endsWith(".mp4")) return Film;
  if (t.includes("pdf") || n.endsWith(".pdf")) return FileText;
  if (a.url && !n.includes(".")) return ExternalLink;
  return FileText;
}

function safeHref(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  if (!isTrustedChatMediaUrl(url) && !/^https:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function ResourcesRoom({
  roomId,
  roomName,
  hideHeader,
}: {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load resources");
      const list = (data.posts ?? []) as Post[];
      const filtered = list.filter((p) => {
        const att = parseAttachments(p.attachments);
        const imgs = Array.isArray(p.images) ? p.images : [];
        return att.length > 0 || imgs.length > 0;
      });
      setPosts(filtered);
    } catch (e: unknown) {
      setPosts([]);
      toast.error(e instanceof Error ? e.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Array<{
      key: string;
      title: string;
      body: string;
      href: string | null;
      kind: "file" | "image";
      meta: string;
      Icon: typeof FileText;
    }> = [];

    for (const p of posts) {
      const author =
        p.profiles?.full_name || p.profiles?.username || "Member";
      const when = formatDistanceToNow(new Date(p.created_at), {
        addSuffix: true,
      });
      const meta = `${author} · ${when}`;

      for (const [i, a] of parseAttachments(p.attachments).entries()) {
        const href = safeHref(a.url);
        const title = a.name || p.title || "Resource";
        if (
          q &&
          !`${title} ${p.body} ${a.url ?? ""}`.toLowerCase().includes(q)
        ) {
          continue;
        }
        rows.push({
          key: `${p.id}-a-${i}`,
          title,
          body: p.body,
          href,
          kind: "file",
          meta,
          Icon: fileIcon(a),
        });
      }

      const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
      for (const [i, url] of imgs.entries()) {
        const href = safeHref(typeof url === "string" ? url : undefined);
        if (!href) continue;
        if (q && !`${p.title ?? ""} ${p.body} ${href}`.toLowerCase().includes(q)) {
          continue;
        }
        rows.push({
          key: `${p.id}-img-${i}`,
          title: p.title || "Image",
          body: p.body,
          href,
          kind: "image",
          meta,
          Icon: FileText,
        });
      }
    }
    return rows;
  }, [posts, query]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {!hideHeader && (
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h1 className="text-lg font-black text-[var(--color-text-primary)]">
            {roomName}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Files, guides, and links shared in this channel
          </p>
        </header>
      )}

      <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            aria-label="Search resources"
            className="h-9 rounded-sm border-[var(--color-border)] pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : items.length === 0 ? (
          <ChannelEmptyState
            icon={FileText}
            title={query ? "No matches" : "Upload your first resource"}
            description={
              query
                ? "Try a different search term."
                : "Share guides, PDFs, and links in posts so members can find them here."
            }
            className="py-12"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex flex-col rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-none"
              >
                {item.kind === "image" && item.href ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.href}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="mb-3 h-32 w-full rounded-sm object-cover"
                  />
                ) : (
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                      <item.Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-black text-[var(--color-text-primary)]">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {item.meta}
                  </span>
                  {item.href ? (
                    <Button
                      asChild
                      size="sm"
                      className="shrink-0 rounded-sm bg-[var(--color-accent)] font-black text-white hover:bg-[var(--color-accent-hover)]"
                    >
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        Open
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[10px] font-semibold text-[var(--color-danger,#b91c1c)]">
                      Unavailable link
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
