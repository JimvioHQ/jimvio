import { getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// BLOG POSTS
// ─────────────────────────────────────────────────────────────

export type BlogPostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author_name: string;
  published_at: string;
  read_time_minutes: number;
  category: string;
  image_url: string | null;
};

export async function getPublishedBlogPosts(limit = 24): Promise<BlogPostListItem[]> {
  const db = await getDB();
  const { data, error } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, author_name, published_at, read_time_minutes, category, image_url")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as BlogPostListItem[];
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPostListItem & { body: string | null } | null> {
  const db = await getDB();
  const { data, error } = await db
    .from("blog_posts")
    .select("id, slug, title, excerpt, author_name, published_at, read_time_minutes, category, image_url, body")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as BlogPostListItem & { body: string | null };
}
