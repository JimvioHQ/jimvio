import type { MediaCategory, MediaSection, PublicArticle } from "@/lib/editorial/types";

const FIXTURE_BODY =
  "<p>This page is a development fixture for the Jimvio Media layout. It is not a published news report, and it is not shown in production.</p>";

function story(input: {
  slug: string;
  title: string;
  excerpt: string;
  category: MediaCategory;
  kicker: string;
  image: string;
  section: MediaSection;
}): PublicArticle {
  return {
    id: `fixture-${input.slug}`,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    bodyHtml: FIXTURE_BODY,
    category: input.category,
    kicker: input.kicker,
    imageUrl: `/editorial/${input.image}`,
    imageAlt: input.title,
    section: input.section,
    tags: ["fixture"],
    seoTitle: null,
    seoDescription: null,
    authorName: null,
    publishedAt: null,
    fixture: true,
  };
}

/** Design fixtures. Production never serves these as published news. */
export const EDITORIAL_FIXTURES: PublicArticle[] = [
  story({
    slug: "sample-rwanda-digital-economy",
    title: "Rwanda launches new digital economy initiative to empower young innovators",
    excerpt:
      "The government has announced a new program aimed at supporting tech startups, digital skills development, and innovation across the country, positioning Rwanda as a leading hub for technology in Africa.",
    category: "news",
    kicker: "Rwanda",
    image: "clinic.jpg",
    section: "hero",
  }),
  story({
    slug: "sample-regional-tech-hubs",
    title: "Regional tech hubs open new rooms for founders and researchers",
    excerpt: "A design fixture about shared workspaces, skills programs, and the people building them.",
    category: "news",
    kicker: "News",
    image: "creator.jpg",
    section: "hero",
  }),
  story({
    slug: "sample-studio-week",
    title: "Inside the studios shaping the next wave of African product teams",
    excerpt: "A design fixture following builders, editors, and operators through a working week.",
    category: "analysis",
    kicker: "Analysis",
    image: "meeting.jpg",
    section: "hero",
  }),
  story({
    slug: "sample-startup-investment",
    title: "African startups attract record investment in 2026",
    excerpt: "A design fixture on founder stories and the capital reaching local companies.",
    category: "business",
    kicker: "Business",
    image: "library.jpg",
    section: "featured",
  }),
  story({
    slug: "sample-ai-business",
    title: "How AI is transforming businesses in Africa",
    excerpt: "A design fixture on tools teams are testing in daily operations.",
    category: "technology",
    kicker: "Technology",
    image: "founders.jpg",
    section: "featured",
  }),
  story({
    slug: "sample-digital-learning",
    title: "New digital learning platforms rolled out in Rwandan schools",
    excerpt: "A design fixture on classrooms, teachers, and learning tools.",
    category: "blog",
    kicker: "Education",
    image: "civic.jpg",
    section: "featured",
  }),
  story({
    slug: "sample-regional-cooperation",
    title: "Rwanda strengthens regional cooperation with new agreements",
    excerpt: "A design fixture on regional agreements.",
    category: "news",
    kicker: "Politics",
    image: "skyline.jpg",
    section: "news",
  }),
  story({
    slug: "sample-local-commerce",
    title: "Local businesses benefit from new e-commerce opportunities",
    excerpt: "A design fixture on shops moving online.",
    category: "news",
    kicker: "Business",
    image: "founder.jpg",
    section: "news",
  }),
  story({
    slug: "sample-global-markets",
    title: "Startups in Africa are building solutions for global markets",
    excerpt: "A design fixture on products built for customers beyond one city.",
    category: "news",
    kicker: "Technology",
    image: "meeting.jpg",
    section: "news",
  }),
  story({
    slug: "sample-healthcare-access",
    title: "Rwanda expands access to quality healthcare services",
    excerpt: "A design fixture on clinics and care teams.",
    category: "news",
    kicker: "Health",
    image: "robot.jpg",
    section: "news",
  }),
  story({
    slug: "sample-rural-communities",
    title: "Women driving change in rural communities",
    excerpt: "A design fixture on organizers and local enterprises.",
    category: "magazine",
    kicker: "Feature",
    image: "lion.jpg",
    section: "magazine",
  }),
  story({
    slug: "sample-smart-cities",
    title: "The future of smart cities in Africa",
    excerpt: "A design fixture on streets, power, and public systems.",
    category: "magazine",
    kicker: "Analysis",
    image: "creator.jpg",
    section: "magazine",
  }),
  story({
    slug: "sample-conservation",
    title: "Conservation efforts across Africa",
    excerpt: "A design fixture on landscapes and the people protecting them.",
    category: "magazine",
    kicker: "Environment",
    image: "city.jpg",
    section: "magazine",
  }),
  story({
    slug: "sample-online-business",
    title: "How to start an online business in Rwanda",
    excerpt: "A practical design fixture for a first online offer.",
    category: "guides",
    kicker: "Guide",
    image: "phone.jpg",
    section: "guide",
  }),
  story({
    slug: "sample-creator-tools",
    title: "Best tools for content creators in 2026",
    excerpt: "A design fixture comparing tools creators actually keep open.",
    category: "guides",
    kicker: "Guide",
    image: "invest.jpg",
    section: "guide",
  }),
  story({
    slug: "sample-investing-guide",
    title: "A complete guide to investing in Africa",
    excerpt: "A design fixture that explains terms without promising returns.",
    category: "guides",
    kicker: "Guide",
    image: "rural.jpg",
    section: "guide",
  }),
];

export function findFixture(slug: string): PublicArticle | null {
  return EDITORIAL_FIXTURES.find((article) => article.slug === slug) ?? null;
}
