"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";

type Post = {
  id: string; title: string | null; body: string; post_type: string;
  created_at: string; is_published: boolean; archived_at: string | null;
  community_id: string; room_id: string;
};

export default function MyPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/posts/mine", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your posts");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your posts"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this post permanently?")) return;
    setError("");
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete post");
      setPosts((current) => current.filter((post) => post.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete post"); }
  }

  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
    <header className="mb-6 flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF1EA] text-[#FF5A1F]"><FileText className="h-5 w-5" /></span>
      <div><h1 className="text-xl font-bold text-[#111827]">My Posts</h1><p className="text-[13px] text-[#6B7280]">Manage posts you have shared across communities.</p></div>
    </header>
    {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-[13px] text-rose-700">{error}</p> : null}
    {loading ? <div className="flex items-center gap-2 py-10 text-[13px] text-[#6B7280]"><Loader2 className="h-4 w-4 animate-spin" /> Loading your posts…</div> : posts.length ? <ul className="divide-y divide-[#E5E7EB] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      {posts.map((post) => <li key={post.id} className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#111827]">{post.title || post.body.slice(0, 100) || "Untitled post"}</p>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-[#6B7280]">{post.body}</p>
          <p className="mt-2 text-[11px] text-[#9CA3AF]">{new Date(post.created_at).toLocaleDateString()} · {post.is_published ? "Published" : "Draft"}{post.archived_at ? " · Archived" : ""}</p>
        </div>
        <button type="button" onClick={() => void remove(post.id)} aria-label="Delete post" className="rounded-lg p-2 text-[#9CA3AF] hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </li>)}
    </ul> : <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white px-5 py-12 text-center"><FileText className="mx-auto h-8 w-8 text-[#9CA3AF]" /><p className="mt-3 text-[14px] font-semibold text-[#111827]">No posts yet</p><p className="mt-1 text-[12px] text-[#6B7280]">Posts you publish in communities will appear here.</p><Link href="/communities" className="mt-4 inline-flex rounded-full bg-[#FF5A1F] px-4 py-2 text-[12px] font-semibold text-white">Explore communities</Link></div>}
  </main>;
}
