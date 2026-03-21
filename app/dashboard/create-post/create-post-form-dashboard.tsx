"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCommunityPost } from "@/lib/actions/community";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Community = { id: string; name: string; slug: string };

export function CreatePostFormDashboard({ communities }: { communities: Community[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePublish = (isDraft: boolean) => {
    if (!body.trim()) {
      toast.error("Post content is required");
      return;
    }
    if (!communityId) {
      toast.error("Select a community");
      return;
    }
    startTransition(async () => {
      const images = imageUrl.trim() ? [imageUrl.trim()] : [];
      const res = await createCommunityPost(communityId, {
        title: title.trim() || undefined,
        body: body.trim(),
        images,
        isDraft,
      });
      if (res.success) {
        toast.success(isDraft ? "Draft saved" : "Post published");
        router.push("/dashboard/my-posts");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save");
      }
    });
  };

  if (communities.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-[var(--color-border)]">
        <CardContent className="py-12 text-center">
          <p className="font-medium text-[var(--color-text-primary)]">Join a community first</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            You need to be a member of at least one community to create posts.
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => router.push("/dashboard/communities")}
          >
            Discover communities
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border-[var(--color-border)] overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handlePublish(false);
          }}
        >
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title"
              className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
              Post Content
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your post..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] touch-manipulation"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">
              Select Community
            </label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" /> Attach Image (optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 sm:flex-none"
              disabled={isPending}
              onClick={() => handlePublish(true)}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold flex-1 sm:flex-none"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Post"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
