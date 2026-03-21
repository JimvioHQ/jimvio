"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCommunityPost } from "@/lib/actions/community";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CreatePostFormProps {
  communityId: string;
  user?: { full_name?: string; avatar_url?: string } | null;
}

export function CreatePostForm({ communityId, user }: CreatePostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Please write something before posting");
      return;
    }

    startTransition(async () => {
      const res = await createCommunityPost(communityId, { title: title.trim() || undefined, body: body.trim() });
      if (res.success) {
        setTitle("");
        setBody("");
        setExpanded(false);
        router.refresh();
        toast.success("Post published! ✨", {
          description: "Your post is now visible to all community members.",
        });
      } else {
        toast.error(res.error || "Failed to create post");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg transition-all duration-500",
        expanded ? "p-6" : "p-4"
      )}>
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 border-2 border-[var(--color-accent)]/20 shrink-0">
            <AvatarImage src={user?.avatar_url || ""} />
            <AvatarFallback className="bg-[var(--color-accent-light)] text-[var(--color-accent)] font-black text-sm">
              {user?.full_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            {expanded && (
              <input
                type="text"
                placeholder="Post title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-black bg-transparent border-none outline-none placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)]"
              />
            )}
            <textarea
              placeholder="Share something with the community..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setExpanded(true)}
              rows={expanded ? 4 : 1}
              className="w-full bg-transparent border-none outline-none resize-none placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)] text-sm leading-relaxed"
            />
          </div>
        </div>

        {expanded && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[var(--color-text-muted)] capitalize tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[var(--color-accent)]" />
                Visible to all members
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setExpanded(false); setTitle(""); setBody(""); }}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !body.trim()}
                size="sm"
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl font-black shadow-lg shadow-[var(--color-accent)]/20 px-6"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1.5" /> Publish</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
