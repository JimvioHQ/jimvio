"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Attachment = { url?: string; name?: string; type?: string; size?: string };

type Post = {
  id: string;
  title: string | null;
  body: string;
  attachments: unknown;
  images: unknown;
  created_at: string;
  author_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Attachment[];
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const list = (data.posts ?? []) as Post[];
      const filtered = list.filter((p) => {
        const att = parseAttachments(p.attachments);
        const imgs = Array.isArray(p.images) ? p.images : [];
        return att.length > 0 || imgs.length > 0;
      });
      setPosts(filtered);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {!hideHeader && (
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h1 className="text-lg font-black text-[var(--color-text-primary)]">{roomName}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Resources from posts with files or links</p>
        </header>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No resources yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.flatMap((p) => {
              const att = parseAttachments(p.attachments);
              const items: React.ReactNode[] = [];
              att.forEach((a, i) => {
                const Icon = fileIcon(a);
                const href = a.url || "#";
                items.push(
                  <div key={`${p.id}-a-${i}`} className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-none flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-sm bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-[var(--color-text-primary)] line-clamp-2">{a.name || p.title || "Resource"}</h3>
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">{p.body}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">{a.size || (a.url ? "External link" : "File")}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {p.profiles?.full_name || p.profiles?.username || "Member"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </span>
                      <Button asChild size="sm" className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shrink-0">
                        <a href={href} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              });
              return items;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

