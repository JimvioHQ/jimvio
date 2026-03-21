import React from "react";
import { Search, ArrowRight, Clock, User, Tag, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/services/db";

function formatPostDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogListingPage() {
  const posts = await getPublishedBlogPosts(24);
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))];

  if (posts.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] min-h-screen flex flex-col items-center justify-center px-6 py-24">
        <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-4">The Jimvio Journal</Badge>
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2 text-center">No posts yet</h1>
        <p className="text-[var(--color-text-secondary)] text-center max-w-md">
          Articles will appear here once published in the database. Run migration{" "}
          <code className="text-xs">022_platform_settings_blog.sql</code> and seed posts if needed.
        </p>
        <Button asChild className="mt-8 rounded-xl font-black">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  const featured = posts[0];
  const sidePosts = posts.slice(1, 4);
  const rest = posts.slice(4);
  const featuredImage =
    featured.image_url ??
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      <section className="bg-white border-b border-[var(--color-border)] py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-50/50 to-transparent" />
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 relative z-10">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            The Jimvio Journal
          </Badge>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-8xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.9]">
                Insights for the <br />
                <span className="text-[var(--color-accent)]">Global Trader</span>
              </h1>
              <p className="text-[var(--color-text-secondary)] text-xl max-w-xl font-medium leading-relaxed">
                Expert analysis, success stories, and practical guides for navigating the future of commerce.
              </p>
            </div>
            <div className="w-full lg:w-96">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-accent)] transition-colors" />
                <Input
                  placeholder="Search articles..."
                  className="h-16 pl-14 pr-6 bg-[var(--color-bg)] border-2 rounded-2xl focus-visible:ring-[var(--color-accent)] shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <Link
            href={`/blog/${featured.slug}`}
            className="relative group cursor-pointer overflow-hidden rounded-[3rem] aspect-[4/3] lg:aspect-auto block"
          >
            <img
              src={featuredImage}
              alt={featured.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-darker via-ink-darker/20 to-transparent opacity-80" />
            <div className="absolute bottom-10 left-10 right-10 text-white">
              <Badge className="bg-[var(--color-accent)] text-white border-none mb-4 px-3 py-1 font-black capitalize text-[10px]">
                {featured.category}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                {featured.title}
              </h2>
              <div className="flex items-center gap-6 text-white/60 text-xs font-bold capitalize tracking-widest">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" /> {featured.author_name}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {featured.read_time_minutes} min read
                </span>
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-8">
            {sidePosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="flex gap-6 group cursor-pointer">
                <div className="w-40 h-40 shrink-0 rounded-3xl overflow-hidden bg-subtle relative border border-[var(--color-border)]">
                  <img
                    src={
                      post.image_url ??
                      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-white/80 backdrop-blur-md text-[var(--color-text-primary)] border-none text-[8px] font-black">
                      {post.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-black text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-[10px] font-black text-muted-c capitalize tracking-widest">
                    <span>{formatPostDate(post.published_at)}</span>
                    <span className="w-1 h-1 bg-muted-c rounded-full" />
                    <span>{post.read_time_minutes} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 py-10 border-y border-[var(--color-border)] mb-20 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-black text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
            >
              {cat}
            </button>
          ))}
        </div>

        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {rest.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group cursor-pointer block">
                <div className="aspect-[16/10] bg-subtle rounded-3xl mb-6 overflow-hidden border border-[var(--color-border)] relative">
                  <img
                    src={
                      post.image_url ??
                      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent" />
                  <div className="absolute top-4 right-4 space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/50 border-none backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/50 border-none backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px]">{post.category}</Badge>
                  <h4 className="text-xl font-black text-[var(--color-text-primary)] leading-tight group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{post.excerpt}</p>
                  <div className="pt-4 flex items-center justify-between border-t border-[var(--color-border)]">
                    <span className="text-[10px] font-black text-muted-c">READ NOW</span>
                    <ArrowRight className="h-4 w-4 text-[var(--color-accent)]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-32 bg-ink-dark rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] blur-[120px] opacity-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 blur-[120px] opacity-10" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <Tag className="h-10 w-10 text-[var(--color-accent)] mx-auto mb-8" />
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Stay ahead of the curve.</h2>
            <p className="text-white/50 text-xl mb-12">
              Get the latest market insights and creator success strategies delivered to your inbox every Monday.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Enter your email address"
                className="h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-lg"
              />
              <Button className="h-16 px-10 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black rounded-2xl text-lg">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
