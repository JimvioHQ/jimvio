"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BlogPostListItem } from "@/services/blog";

function formatPostDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function postImage(post: BlogPostListItem, fallback: string) {
  return post.image_url || fallback;
}

export function BlogListing({ posts }: { posts: BlogPostListItem[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))],
    [posts],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (category !== "All" && post.category !== category) return false;
      if (!q) return true;
      return [post.title, post.excerpt, post.category, post.author_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [category, posts, query]);

  const featured = filtered[0];
  const sidePosts = filtered.slice(1, 4);
  const rest = filtered.slice(4);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="relative overflow-hidden border-b border-border bg-surface py-16">
        <div className="relative z-10 mx-auto max-w-[var(--container-max)] px-4 sm:px-6">
          <Badge className="mb-6 border-none bg-[var(--color-accent-light)] px-4 py-1.5 text-[10px] font-semibold capitalize tracking-widest text-[var(--color-accent)]">
            The Jimvio Journal
          </Badge>
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-text-primary sm:text-6xl">
                Jimvio Journal
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
                Published articles from Jimvio. Search by title, or browse by category.
              </p>
            </div>
            <form
              className="w-full lg:w-96"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="relative block">
                <span className="sr-only">Search articles</span>
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search articles"
                  className="h-14 w-full rounded-md border border-border bg-[var(--color-bg)] pl-12 pr-4 text-sm text-text-primary outline-none focus:border-[var(--color-accent)]"
                />
              </label>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-wrap justify-center gap-2 border-y border-border py-6">
          {categories.map((cat) => {
            const active = cat === category;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(cat)}
                className={
                  active
                    ? "rounded-md border border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]"
                    : "rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                }
              >
                {cat}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm text-text-secondary">No articles match that search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
              className="mt-4 text-sm font-semibold text-[var(--color-accent)]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
              {featured ? (
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-md lg:aspect-auto lg:min-h-[420px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={postImage(
                      featured,
                      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80",
                    )}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <Badge className="mb-3 border-none bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold capitalize text-white">
                      {featured.category}
                    </Badge>
                    <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{featured.title}</h2>
                    <div className="mt-4 flex items-center gap-5 text-xs text-white/70">
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4" /> {featured.author_name}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {featured.read_time_minutes} min read
                      </span>
                    </div>
                  </div>
                </Link>
              ) : null}

              <div className="flex flex-col gap-6">
                {sidePosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group flex gap-4">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-border sm:h-36 sm:w-36">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={postImage(
                          post,
                          "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
                        )}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h3 className="line-clamp-2 text-lg font-semibold text-text-primary group-hover:text-[var(--color-accent)]">
                        {post.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{post.excerpt}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        {formatPostDate(post.published_at)} · {post.read_time_minutes} min read
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {rest.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {rest.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                    <div className="mb-4 aspect-[16/10] overflow-hidden rounded-md border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={postImage(
                          post,
                          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
                        )}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Badge className="border-none bg-[var(--color-surface-secondary)] text-[10px] font-semibold text-text-secondary">
                      {post.category}
                    </Badge>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-text-primary group-hover:text-[var(--color-accent)]">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{post.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                      Read <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
