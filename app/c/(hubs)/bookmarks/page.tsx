"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bookmark, Heart, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedPost {
    id: string;
    created_at: string;
    community_posts: {
        id: string;
        title: string | null;
        body: string;
        created_at: string;
        like_count: number;
        comment_count: number;
        images: any;
        profiles: {
            full_name: string | null;
            avatar_url: string | null;
            username: string | null;
        } | null;
    } | null;
}

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<SavedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        async function getUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        }
        getUser();
    }, []);

    useEffect(() => {
        if (!currentUserId) return;
        let cancelled = false;
        async function load() {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from("community_saved_posts")
                .select(`
          id, created_at,
          community_posts (
            id, title, body, created_at, like_count, comment_count,
            images,
            profiles:author_id ( full_name, avatar_url, username )
          )
        `)
                .eq("user_id", currentUserId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (cancelled) return;
            if (error) {
                console.error("Failed to load bookmarks:", error);
                setBookmarks([]);
            } else {
                setBookmarks((data ?? []) as SavedPost[]);
            }
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [currentUserId]);

    async function removeBookmark(savedId: string) {
        const supabase = createClient();
        const prev = bookmarks;
        setBookmarks((p) => p.filter((b) => b.id !== savedId));
        const { error } = await supabase
            .from("community_saved_posts")
            .delete()
            .eq("id", savedId)
            .eq("user_id", currentUserId);
        if (error) {
            console.error("Failed to remove bookmark:", error);
            setBookmarks(prev);
        }
    }

    if (!currentUserId) return <div className="p-4">Loading...</div>;

    return (
        <div className="min-h-screen bg-bg">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center gap-2 mb-6">
                    <Bookmark className="w-6 h-6 text-[#fd5000]" />
                    <h1 className="text-2xl font-bold">Bookmarks</h1>
                    <span className="text-sm text-text-muted">({bookmarks.length})</span>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-32 bg-surface animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="text-center py-16">
                        <Bookmark className="w-16 h-16 text-text-muted mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
                        <p className="text-text-muted">Save posts from communities to see them here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookmarks.map((bookmark) => {
                            const post = bookmark.community_posts;
                            if (!post) return null;

                            return (
                                <div key={bookmark.id} className="bg-surface rounded-lg p-4 border border-border">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {post.profiles?.avatar_url ? (
                                                <img
                                                    src={post.profiles.avatar_url}
                                                    alt={post.profiles.full_name || ""}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                    {(post.profiles?.full_name || post.profiles?.username || "U")[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    {post.profiles?.full_name || post.profiles?.username || "Anonymous"}
                                                </div>
                                                <div className="text-sm text-text-muted">
                                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeBookmark(bookmark.id)}
                                            className="text-text-muted hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {post.title && (
                                        <h3 className="font-semibold mb-2">{post.title}</h3>
                                    )}

                                    <p className="text-text-primary mb-3">{post.body}</p>

                                    <div className="flex items-center gap-4 text-sm text-text-muted">
                                        <div className="flex items-center gap-1">
                                            <Heart className="w-4 h-4" />
                                            {post.like_count}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comment_count}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}