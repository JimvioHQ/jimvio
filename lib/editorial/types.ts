export const MEDIA_CATEGORIES = [
  { slug: "news", label: "News" },
  { slug: "blog", label: "Blog" },
  { slug: "magazine", label: "Magazine" },
  { slug: "guides", label: "Guides" },
  { slug: "reviews", label: "Reviews" },
  { slug: "analysis", label: "Analysis" },
  { slug: "opinion", label: "Opinion" },
  { slug: "business", label: "Business" },
  { slug: "technology", label: "Technology" },
  { slug: "lifestyle", label: "Lifestyle" },
] as const;

export const MEDIA_SECTIONS = ["hero", "featured", "news", "magazine", "guide", "standard"] as const;
export const MEDIA_STATUSES = ["draft", "review", "scheduled", "published", "archived"] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number]["slug"];
export type MediaSection = (typeof MEDIA_SECTIONS)[number];
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

declare const safeHtmlBrand: unique symbol;
export type SafeHtml = string & { readonly [safeHtmlBrand]: true };

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: MediaCategory;
  kicker: string;
  imageUrl: string | null;
  imageAlt: string;
  section: MediaSection;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt?: string | null;
  correctionNote?: string | null;
  fixture: boolean;
};

export type AdminArticle = PublicArticle & {
  sourceName?: string | null;
  sourceUrl?: string | null;
  status: MediaStatus;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  fixture: false;
};

export type StoryCardModel = {
  href: string;
  title: string;
  excerpt?: string;
  kicker: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type HomeSection = { slug: MediaCategory; label: string; articles: PublicArticle[] };

export type HomeComposition = {
  heroes: PublicArticle[];
  featured: PublicArticle[];
  latest: PublicArticle[];
  magazine: PublicArticle[];
  guides: PublicArticle[];
  allStories: PublicArticle[];
  sections: HomeSection[];
};

export type ArticleInput = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: string;
  kicker: string;
  imageUrl: string;
  imageAlt: string;
  section: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  authorName: string;
  scheduledAt: string;
  slug?: string;
  expectedUpdatedAt?: string;
  idempotencyKey?: string;
  sourceName?: string;
  sourceUrl?: string;
  correctionNote?: string;
};

export type FieldErrors = Partial<Record<keyof ArticleInput | "form", string>>;

export type ActionResult =
  | { ok: true; id: string; slug: string; updatedAt: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors; conflict?: boolean };
