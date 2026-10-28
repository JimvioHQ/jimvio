import type { Metadata } from "next";
import Link from "next/link";
import { BlogListing } from "@/components/blog/blog-listing";
import { pageMetadata } from "@/lib/seo";
import { getPublishedBlogPosts } from "@/services/db";

export async function generateMetadata(): Promise<Metadata> {
  const posts = await getPublishedBlogPosts(3).catch(() => []);
  // R-9: an empty Journal is not offered to search engines.
  return pageMetadata("blog", posts.length < 3 ? { noIndex: true } : {});
}

export default async function BlogListingPage() {
  const posts = await getPublishedBlogPosts(24).catch(() => []);

  if (posts.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6 py-24">
        <h1 className="text-center text-3xl font-semibold text-text-primary">No posts yet</h1>
        <p className="mt-2 max-w-md text-center text-text-secondary">
          Articles appear here after they are published.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-md bg-[var(--color-accent)] px-5 text-sm font-semibold text-white"
        >
          Back home
        </Link>
      </div>
    );
  }

  return <BlogListing posts={posts} />;
}
