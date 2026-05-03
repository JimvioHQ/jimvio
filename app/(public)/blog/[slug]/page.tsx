import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublishedBlogPostBySlug } from "@/services/db";
import { notFound } from "next/navigation";

function formatPostDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const hero =
    post.image_url ??
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80";

  return (
    <article className="bg-[var(--color-bg)] min-h-screen pb-24">
      <div className="relative h-[min(420px,45vh)] w-full overflow-hidden">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/90 via-ink-darker/40 to-ink-darker/20" />
        <div className="absolute bottom-0 left-0 right-0 max-w-[var(--container-max)] mx-auto px-4 sm:px-6 pb-10 text-white">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to journal
          </Link>
          <Badge className="bg-[var(--color-accent)] text-white border-none mb-4">{post.category}</Badge>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-4xl">{post.title}</h1>
          <div className="flex flex-wrap gap-6 mt-6 text-white/70 text-sm font-bold">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" /> {post.author_name}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> {formatPostDate(post.published_at)} · {post.read_time_minutes} min read
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        <p className="text-xl text-[var(--color-text-secondary)] font-medium leading-relaxed mb-10">{post.excerpt}</p>
        {post.body ? (
          <div className="prose prose-neutral max-w-none text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
            {post.body}
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)] text-sm">Full article body coming soon.</p>
        )}
      </div>
    </article>
  );
}
