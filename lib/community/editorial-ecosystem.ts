/**
 * Production-safe Jimvio editorial ecosystem — compact blueprints expanded into
 * full community specs. Extends (does not replace) the original four communities.
 */

import type {
  EditorialCommentSpec,
  EditorialCommunitySpec,
  EditorialMessageSpec,
  EditorialPostSpec,
  EditorialRoomSpec,
} from "./editorial-types";
import type { JimvioContentOrigin } from "./editorial-origin";

export type EcosystemBlueprint = {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  tagline: string;
  description: string;
  topic: string;
  featured?: boolean;
  createdAt: string;
  avatarUrl: string;
  coverImage: string;
  rooms: Array<{ slug: string; name: string; focus: string }>;
  prompts: string[];
  pollQuestion: string;
  pollOptions: string[];
  promo: Array<{ href: string; title: string; body: string }>;
};

function unsplash(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

/** Substantial but production-safe set — not thousands. */
export const ECOSYSTEM_BLUEPRINTS: EcosystemBlueprint[] = [
  {
    slug: "tech-and-developers",
    name: "Tech & Developers",
    category: "Technology",
    tags: ["developers", "engineering", "tools", "architecture"],
    tagline: "Builders comparing tools, tradeoffs, and shipping habits.",
    description:
      "A Jimvio-managed room for developers who want practical discussion — not hype cycles.",
    topic: "software craft",
    featured: true,
    createdAt: "2026-05-12T10:00:00.000Z",
    avatarUrl: unsplash("photo-1516321318423-f06f85e504b3", 400, 400),
    coverImage: unsplash("photo-1461749280684-dccba630e2f6", 1200, 480),
    rooms: [
      { slug: "general", name: "General", focus: "day-to-day builder chat" },
      { slug: "help-desk", name: "Help Desk", focus: "debugging questions" },
      { slug: "projects", name: "Projects", focus: "what people are shipping" },
      { slug: "ai-automation", name: "AI & Automation", focus: "useful automation, not magic" },
      { slug: "jobs", name: "Jobs", focus: "roles and interview practice" },
    ],
    prompts: [
      "How do you decide when a dependency is worth the risk?",
      "What is your checklist before merging a risky change?",
      "Share one debugging habit that saved you hours.",
      "How do you keep architecture docs from rotting?",
      "What does “good enough for production” mean on your team?",
    ],
    pollQuestion: "Where do you spend most of your engineering time?",
    pollOptions: ["Product features", "Reliability / ops", "DX and tooling", "Learning new stacks", "A mix I cannot simplify"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Creator tools for builders who also publish",
        body: "From Jimvio — Want to turn technical explainers into paid creator work? Explore UGC & Clipping campaigns. Read each brief; apply only if it fits your voice.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Build your creator profile",
        body: "From Jimvio — Complete your Creator Profile so Jimvio can surface opportunities that already exist. Not a job guarantee.\n\nStart: /identity",
      },
    ],
  },
  {
    slug: "software-engineers",
    name: "Software Engineers",
    category: "Programming",
    tags: ["engineering", "code-review", "systems"],
    tagline: "Peer discussion for working engineers.",
    description: "Code review culture, systems thinking, and career craft for software engineers.",
    topic: "engineering practice",
    createdAt: "2026-05-14T11:00:00.000Z",
    avatarUrl: unsplash("photo-1555066931-4365d14bab8c", 400, 400),
    coverImage: unsplash("photo-1517694712202-14dd9538aa97", 1200, 480),
    rooms: [
      { slug: "general", name: "General", focus: "open engineering talk" },
      { slug: "code-review", name: "Code Review", focus: "review patterns" },
      { slug: "systems", name: "Systems", focus: "architecture tradeoffs" },
      { slug: "career", name: "Career", focus: "levels and growth" },
    ],
    prompts: [
      "What makes a code review actually useful?",
      "How do you estimate work without lying to yourself?",
      "Share a production incident lesson you still use.",
      "When do you rewrite vs wrap a legacy module?",
    ],
    pollQuestion: "Preferred primary language family right now?",
    pollOptions: ["TypeScript / JS", "Python", "JVM languages", "Go / Rust", "Other / polyglot"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Start a specialist community",
        body: "From Jimvio — Create your own community if your team needs a tighter room than a public feed.\n\nCreate: /communities",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Paid explainers",
        body: "From Jimvio — Looking for paid creator opportunities around product education? Explore UGC campaigns on Jimvio.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "web-development",
    name: "Web Development",
    category: "Programming",
    tags: ["frontend", "backend", "web"],
    tagline: "Frontend, backend, and the seams between them.",
    description: "Practical web development: accessibility, performance, APIs, and shipping UI that survives real devices.",
    topic: "web development",
    createdAt: "2026-05-16T09:30:00.000Z",
    avatarUrl: unsplash("photo-1498050108023-c8194b44aeae", 400, 400),
    coverImage: unsplash("photo-1547658719-da2b51169166", 1200, 480),
    rooms: [
      { slug: "frontend", name: "Frontend", focus: "UI and client performance" },
      { slug: "backend", name: "Backend", focus: "APIs and data" },
      { slug: "a11y", name: "Accessibility", focus: "inclusive interfaces" },
      { slug: "ship-it", name: "Ship It", focus: "releases and QA" },
    ],
    prompts: [
      "What broke last time you ignored mobile Safari?",
      "How do you structure form validation without fighting the framework?",
      "Share a performance win under 1 day of work.",
      "What is your accessibility smoke test before merge?",
    ],
    pollQuestion: "Where do you feel most productive?",
    pollOptions: ["Component UI", "Data layer", "Design systems", "DevOps for the web", "Full-stack glue"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Products for builders who sell",
        body: "From Jimvio — Discover products and grow an online storefront when you are ready to sell what you build.\n\nExplore: /marketplace",
      },
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Share products you already trust and earn commissions through Jimvio Affiliates. No invented earnings claims.\n\nLearn more: /affiliates",
      },
    ],
  },
  {
    slug: "ai-and-automation",
    name: "AI & Automation",
    category: "AI",
    tags: ["ai", "automation", "workflows"],
    tagline: "Useful automation with clear human checkpoints.",
    description: "Discuss AI tooling and automation without inventing capabilities or fake benchmarks.",
    topic: "AI workflows",
    featured: true,
    createdAt: "2026-05-18T14:00:00.000Z",
    avatarUrl: unsplash("photo-1677442136019-21780ecad995", 400, 400),
    coverImage: unsplash("photo-1620712943543-bcc4688e7485", 1200, 480),
    rooms: [
      { slug: "workflows", name: "Workflows", focus: "repeatable automations" },
      { slug: "prompts", name: "Prompts", focus: "prompt patterns that hold up" },
      { slug: "evals", name: "Evals", focus: "measuring quality" },
      { slug: "risks", name: "Risks", focus: "failure modes" },
    ],
    prompts: [
      "Where do you still refuse to automate, and why?",
      "How do you evaluate an AI feature before trusting it in production?",
      "Share a workflow that failed because of silent wrong answers.",
      "What is a good human review step for generated content?",
    ],
    pollQuestion: "Primary use of AI tools for you?",
    pollOptions: ["Drafting text", "Coding assistance", "Research summaries", "Ops automation", "Still experimenting"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Creator campaigns",
        body: "From Jimvio — Explore UGC & Clipping campaigns if you teach tools for a living.\n\nBrowse: /ugc",
      },
      {
        href: "/communities/live",
        title: "From Jimvio: Go live with your community",
        body: "From Jimvio — Take a community live when you want real-time Q&A around a workflow.\n\nLive: /communities/live",
      },
    ],
  },
  {
    slug: "designers-hub",
    name: "Designers Hub",
    category: "Design",
    tags: ["design", "critique", "craft"],
    tagline: "Critique, systems, and craft for working designers.",
    description: "A Jimvio editorial space for designers who want honest feedback and process talk.",
    topic: "design craft",
    createdAt: "2026-05-20T10:00:00.000Z",
    avatarUrl: unsplash("photo-1561070791-2526d30994b5", 400, 400),
    coverImage: unsplash("photo-1558655146-d09347e92766", 1200, 480),
    rooms: [
      { slug: "critique", name: "Critique", focus: "structured feedback" },
      { slug: "systems", name: "Design Systems", focus: "tokens and components" },
      { slug: "portfolio", name: "Portfolio", focus: "case study craft" },
      { slug: "clients", name: "Clients", focus: "collaboration habits" },
    ],
    prompts: [
      "How do you ask for critique without fishing for compliments?",
      "What belongs in a design system vs a one-off screen?",
      "Share a portfolio section you rewrote for clarity.",
      "How do you handle conflicting stakeholder feedback?",
    ],
    pollQuestion: "Where is your craft focus this quarter?",
    pollOptions: ["Product UI", "Brand / visual", "Systems", "Research", "Motion / illustration"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Creator Profile",
        body: "From Jimvio — Build your creator presence so opportunities can find the work you already do.\n\nProfile: /identity",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Design-friendly campaigns",
        body: "From Jimvio — Browse UGC campaigns when brands need visual storytelling.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "ui-ux-designers",
    name: "UI/UX Designers",
    category: "Design",
    tags: ["ux", "ui", "research"],
    tagline: "Interfaces, flows, and evidence.",
    description: "UX research methods, UI patterns, and the boring details that make products usable.",
    topic: "UI/UX",
    createdAt: "2026-05-21T12:00:00.000Z",
    avatarUrl: unsplash("photo-1586717791821-3f44a563fa4c", 400, 400),
    coverImage: unsplash("photo-1581291518633-83b4ebd1d83e", 1200, 480),
    rooms: [
      { slug: "flows", name: "Flows", focus: "journey design" },
      { slug: "research", name: "Research", focus: "methods and synthesis" },
      { slug: "ui-patterns", name: "UI Patterns", focus: "reusable patterns" },
      { slug: "handoff", name: "Handoff", focus: "design-to-eng" },
    ],
    prompts: [
      "What research method do you reach for first under time pressure?",
      "How do you document a flow so engineers do not have to guess?",
      "Share an empty state that actually helped users.",
      "When is a modal the wrong tool?",
    ],
    pollQuestion: "Biggest UX bottleneck on your projects?",
    pollOptions: ["Unclear problem definition", "Stakeholder alignment", "Engineering constraints", "Research access", "Visual polish time"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Discover products and study live storefront UX on Jimvio Marketplace.\n\nExplore: /marketplace",
      },
      {
        href: "/ugc",
        title: "From Jimvio: UGC",
        body: "From Jimvio — Explore creator campaigns that need clear product storytelling.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    category: "Marketing",
    tags: ["marketing", "growth", "channels"],
    tagline: "Channels, creative tests, and honest metrics.",
    description: "Marketing discussion without invented ROAS claims or fake case studies.",
    topic: "digital marketing",
    createdAt: "2026-05-22T09:00:00.000Z",
    avatarUrl: unsplash("photo-1460925895917-afdab827c52f", 400, 400),
    coverImage: unsplash("photo-1557838923-2985c318be48", 1200, 480),
    rooms: [
      { slug: "channels", name: "Channels", focus: "where attention lives" },
      { slug: "creative", name: "Creative", focus: "hooks and angles" },
      { slug: "measurement", name: "Measurement", focus: "metrics that matter" },
      { slug: "budgets", name: "Budgets", focus: "allocation tradeoffs" },
    ],
    prompts: [
      "How do you decide a channel is tired vs under-tested?",
      "What creative test taught you the most last quarter?",
      "Share a metric people over-index on in your industry.",
      "How do you brief a creator without killing their voice?",
    ],
    pollQuestion: "Primary growth lever right now?",
    pollOptions: ["Paid social", "SEO / content", "Email / CRM", "Partnerships", "Product-led loops"],
    promo: [
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Share products you love and earn commissions through Jimvio Affiliates.\n\nLearn more: /affiliates",
      },
      {
        href: "/ugc",
        title: "From Jimvio: UGC campaigns",
        body: "From Jimvio — Explore UGC & Clipping when you need authentic product creative.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "content-creators",
    name: "Content Creators",
    category: "Creator",
    tags: ["creators", "content", "publishing"],
    tagline: "Publishing habits for people who show up consistently.",
    description: "Formats, consistency, and craft for creators — without fake follower counts.",
    topic: "content creation",
    featured: true,
    createdAt: "2026-05-24T10:30:00.000Z",
    avatarUrl: unsplash("photo-1611162616475-46b635cb6868", 400, 400),
    coverImage: unsplash("photo-1492691527719-9d1e07e534b4", 1200, 480),
    rooms: [
      { slug: "creator-lounge", name: "Creator Lounge", focus: "open creator chat" },
      { slug: "content-ideas", name: "Content Ideas", focus: "angles worth testing" },
      { slug: "editing", name: "Editing", focus: "cuts and packaging" },
      { slug: "monetization", name: "Monetization", focus: "honest income paths" },
    ],
    prompts: [
      "What does a sustainable posting cadence look like for you?",
      "How do you batch content without sounding robotic?",
      "Share an editing rule that improved retention for you.",
      "When do you say no to a brand brief?",
    ],
    pollQuestion: "Primary format this season?",
    pollOptions: ["Short video", "Long-form video", "Written / newsletter", "Audio", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: UGC & Clipping",
        body: "From Jimvio — Want to turn your content into income? Explore UGC & Clipping campaigns. Read the brief; apply if it fits.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Creator Profile",
        body: "From Jimvio — Build your creator profile and unlock opportunities already on the platform.\n\nStart: /identity",
      },
    ],
  },
  {
    slug: "ugc-creators",
    name: "UGC Creators",
    category: "Creator",
    tags: ["ugc", "briefs", "product-video"],
    tagline: "Briefs, hooks, and deliverables for UGC work.",
    description: "Practical talk for creators who shoot product-led content for brands.",
    topic: "UGC craft",
    createdAt: "2026-05-25T11:00:00.000Z",
    avatarUrl: unsplash("photo-1574717024653-61fd2cf4d44d", 400, 400),
    coverImage: unsplash("photo-1516035069371-29a1b244cc32", 1200, 480),
    rooms: [
      { slug: "briefs", name: "Briefs", focus: "reading and negotiating briefs" },
      { slug: "hooks", name: "Hooks", focus: "first three seconds" },
      { slug: "delivery", name: "Delivery", focus: "files and revisions" },
      { slug: "rates", name: "Rates", focus: "pricing conversations" },
    ],
    prompts: [
      "Has anyone tested short-form UGC for ecommerce products?",
      "Would you recommend showing the product immediately?",
      "How do you handle revision rounds without scope creep?",
      "What belongs in a rate card vs a custom quote?",
    ],
    pollQuestion: "Hardest part of UGC work?",
    pollOptions: ["Finding briefs", "Shooting / lighting", "Revisions", "Getting paid on time", "Rights language"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Campaigns",
        body: "From Jimvio — Explore live UGC & Clipping campaigns on Jimvio. Apply only when the brief matches your craft.\n\nBrowse: /ugc",
      },
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Pair product content with Affiliates when you already trust the product.\n\nLearn more: /affiliates",
      },
    ],
  },
  {
    slug: "affiliate-marketers",
    name: "Affiliate Marketers",
    category: "Marketing",
    tags: ["affiliates", "offers", "compliance"],
    tagline: "Offers, compliance, and sustainable recommending.",
    description: "Affiliate discussion that refuses fake earnings screenshots and invented conversion rates.",
    topic: "affiliate marketing",
    createdAt: "2026-05-26T13:00:00.000Z",
    avatarUrl: unsplash("photo-1553729459-efe14ef6055d", 400, 400),
    coverImage: unsplash("photo-1556742049-0cfed4f6a45d", 1200, 480),
    rooms: [
      { slug: "offers", name: "Offers", focus: "choosing what to recommend" },
      { slug: "content", name: "Content", focus: "honest recommendation formats" },
      { slug: "compliance", name: "Compliance", focus: "disclosures" },
      { slug: "tracking", name: "Tracking", focus: "attribution basics" },
    ],
    prompts: [
      "How do you decide an offer is worth your audience’s trust?",
      "What disclosure language do you actually use?",
      "Share a content format that converts without sounding like an ad.",
      "How do you handle an offer that under-delivered after you recommended it?",
    ],
    pollQuestion: "Primary affiliate channel?",
    pollOptions: ["Short video", "Newsletter", "Blog / SEO", "Community posts", "Mixed"],
    promo: [
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Share products you love and earn commissions through Jimvio Affiliates. No invented payout promises.\n\nLearn more: /affiliates",
      },
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Discover products worth recommending on Jimvio Marketplace.\n\nExplore: /marketplace",
      },
    ],
  },
  {
    slug: "entrepreneurs",
    name: "Entrepreneurs",
    category: "Business",
    tags: ["founders", "operations", "customers"],
    tagline: "Building companies without mythology.",
    description: "Founder talk about customers, cash, and craft — not invented unicorn stories.",
    topic: "entrepreneurship",
    createdAt: "2026-05-28T10:00:00.000Z",
    avatarUrl: unsplash("photo-1556761175-5973dc0f32e7", 400, 400),
    coverImage: unsplash("photo-1522071820081-009f0129c71c", 1200, 480),
    rooms: [
      { slug: "general", name: "General", focus: "founder chat" },
      { slug: "customers", name: "Customers", focus: "discovery and retention" },
      { slug: "ops", name: "Ops", focus: "systems that scale" },
      { slug: "fundraising", name: "Fundraising", focus: "when capital is optional" },
    ],
    prompts: [
      "What customer conversation changed your roadmap?",
      "How do you protect focus when everything feels urgent?",
      "Share an ops system that removed weekly chaos.",
      "When is fundraising the wrong next step?",
    ],
    pollQuestion: "Biggest constraint right now?",
    pollOptions: ["Finding customers", "Cash runway", "Team capacity", "Distribution", "Product clarity"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Sell on Marketplace",
        body: "From Jimvio — Discover products and grow your online business on Jimvio Marketplace.\n\nExplore: /marketplace",
      },
      {
        href: "/communities",
        title: "From Jimvio: Own a community",
        body: "From Jimvio — Create your own community and build an audience around the problem you solve.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "startup-builders",
    name: "Startup Builders",
    category: "Startups",
    tags: ["startups", "mvp", "validation"],
    tagline: "MVPs, validation, and shipping under constraints.",
    description: "Early-stage builders comparing experiments — without fabricated traction charts.",
    topic: "startup building",
    createdAt: "2026-05-29T15:00:00.000Z",
    avatarUrl: unsplash("photo-1559136555-9303baea8ebd", 400, 400),
    coverImage: unsplash("photo-1519389950473-47ba0277781c", 1200, 480),
    rooms: [
      { slug: "mvp", name: "MVP", focus: "smallest useful version" },
      { slug: "validation", name: "Validation", focus: "evidence before scale" },
      { slug: "gtm", name: "Go-to-Market", focus: "first distribution" },
      { slug: "team", name: "Team", focus: "early hiring" },
    ],
    prompts: [
      "What did you cut from the MVP that you do not miss?",
      "How do you know validation is real vs polite interest?",
      "Share a go-to-market experiment under $200.",
      "What role should you not hire first?",
    ],
    pollQuestion: "Stage that best describes you?",
    pollOptions: ["Idea / research", "Building MVP", "First paying users", "Early growth", "Resetting"],
    promo: [
      {
        href: "/communities/live",
        title: "From Jimvio: Live office hours",
        body: "From Jimvio — Take your community live for office hours and demos.\n\nLive: /communities/live",
      },
      {
        href: "/identity",
        title: "From Jimvio: Identity",
        body: "From Jimvio — Build your creator/founder presence on Jimvio.\n\nProfile: /identity",
      },
    ],
  },
  {
    slug: "freelancers",
    name: "Freelancers",
    category: "Business",
    tags: ["freelance", "clients", "pricing"],
    tagline: "Clients, pricing, and delivery for independents.",
    description: "Freelance craft: proposals, boundaries, and cashflow hygiene.",
    topic: "freelancing",
    createdAt: "2026-05-30T09:00:00.000Z",
    avatarUrl: unsplash("photo-1486312338219-ce68d2c6f44d", 400, 400),
    coverImage: unsplash("photo-1521791136064-7986c2920216", 1200, 480),
    rooms: [
      { slug: "clients", name: "Clients", focus: "finding and keeping clients" },
      { slug: "pricing", name: "Pricing", focus: "quotes and retainers" },
      { slug: "delivery", name: "Delivery", focus: "scopes and handoffs" },
      { slug: "ops", name: "Ops", focus: "invoicing and tools" },
    ],
    prompts: [
      "How do you write a proposal that sets boundaries early?",
      "What retainer structure actually worked for you?",
      "Share a scope creep phrase you use without sounding hostile.",
      "How do you decide when to fire a client?",
    ],
    pollQuestion: "Primary freelance offer?",
    pollOptions: ["Design", "Development", "Writing / content", "Marketing", "Mixed services"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Creator campaigns",
        body: "From Jimvio — Explore UGC campaigns as one path for creative freelancers.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Complete your Creator Profile so opportunities can find you.\n\nStart: /identity",
      },
    ],
  },
  {
    slug: "remote-workers",
    name: "Remote Workers",
    category: "Other",
    tags: ["remote", "async", "focus"],
    tagline: "Async habits, focus, and remote collaboration.",
    description: "How remote teams actually communicate — calendars, docs, and boundaries.",
    topic: "remote work",
    createdAt: "2026-06-01T10:00:00.000Z",
    avatarUrl: unsplash("photo-1588196749597-9ff075ee6b5b", 400, 400),
    coverImage: unsplash("photo-1593642632823-8f785ba67e45", 1200, 480),
    rooms: [
      { slug: "async", name: "Async", focus: "writing culture" },
      { slug: "focus", name: "Focus", focus: "deep work" },
      { slug: "tools", name: "Tools", focus: "stack choices" },
      { slug: "boundaries", name: "Boundaries", focus: "hours and energy" },
    ],
    prompts: [
      "What async rule reduced meeting load on your team?",
      "How do you protect deep work on a noisy calendar?",
      "Share a tool you removed and did not miss.",
      "How do you signal offline without guilt?",
    ],
    pollQuestion: "Biggest remote challenge?",
    pollOptions: ["Meetings overload", "Unclear priorities", "Loneliness", "Time zones", "Home setup"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Communities",
        body: "From Jimvio — Create a community for your remote cohort or guild.\n\nCreate: /communities",
      },
      {
        href: "/communities/live",
        title: "From Jimvio: Live",
        body: "From Jimvio — Host live standups or AMAs in your community.\n\nLive: /communities/live",
      },
    ],
  },
  {
    slug: "career-growth",
    name: "Career Growth",
    category: "Education",
    tags: ["career", "skills", "mentorship"],
    tagline: "Skills, feedback, and promotion craft.",
    description: "Career conversations grounded in evidence — not hustle slogans.",
    topic: "career growth",
    featured: true,
    createdAt: "2026-06-02T11:00:00.000Z",
    avatarUrl: unsplash("photo-1521737711867-e3b97375f902", 400, 400),
    coverImage: unsplash("photo-1454165804606-c3d57bc86b40", 1200, 480),
    rooms: [
      { slug: "skills", name: "Skills", focus: "what to learn next" },
      { slug: "feedback", name: "Feedback", focus: "giving and receiving" },
      { slug: "promotion", name: "Promotion", focus: "evidence packets" },
      { slug: "mentorship", name: "Mentorship", focus: "finding guides" },
    ],
    prompts: [
      "How do you choose the next skill that actually compounds?",
      "What belongs in a promotion packet?",
      "Share a feedback phrase that landed well.",
      "How do you find mentorship without asking for someone’s whole calendar?",
    ],
    pollQuestion: "Career focus this year?",
    pollOptions: ["Depth in current role", "Switching domains", "Management path", "Independent work", "Still deciding"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Creator Profile",
        body: "From Jimvio — Build your creator profile and unlock opportunities.\n\nStart: /identity",
      },
      {
        href: "/ugc",
        title: "From Jimvio: UGC",
        body: "From Jimvio — Explore paid creator opportunities on Jimvio UGC.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "jobs-and-opportunities",
    name: "Jobs & Opportunities",
    category: "Education",
    tags: ["jobs", "hiring", "interviews"],
    tagline: "Roles, interviews, and opportunity hygiene.",
    description: "Job search discussion without fabricated openings or fake referral rings.",
    topic: "jobs",
    createdAt: "2026-06-03T08:00:00.000Z",
    avatarUrl: unsplash("photo-1486312338219-ce68d2c6f44d", 400, 400),
    coverImage: unsplash("photo-1507679799987-c73779587ccf", 1200, 480),
    rooms: [
      { slug: "openings", name: "Openings", focus: "roles people are hiring for" },
      { slug: "interviews", name: "Interviews", focus: "practice and stories" },
      { slug: "cvs", name: "CVs & Profiles", focus: "clarity over fluff" },
      { slug: "networking", name: "Networking", focus: "warm intros" },
    ],
    prompts: [
      "What CV section do hiring managers actually read first?",
      "How do you practice interviews without memorizing scripts?",
      "Share a networking ask that respects people’s time.",
      "How do you evaluate a role beyond the salary line?",
    ],
    pollQuestion: "Where are you in the search?",
    pollOptions: ["Passively looking", "Actively applying", "Interviewing", "Hiring for a team", "Supporting others"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Identity",
        body: "From Jimvio — Keep your Jimvio profile current so opportunities can find the right signal.\n\nProfile: /identity",
      },
      {
        href: "/communities",
        title: "From Jimvio: Communities",
        body: "From Jimvio — Create a hiring or alumni community when you need a durable room.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "students-hub",
    name: "Students Hub",
    category: "Education",
    tags: ["students", "learning", "projects"],
    tagline: "Learning systems for students and early careers.",
    description: "Study habits, projects, and first professional steps — without fake certificates.",
    topic: "student learning",
    createdAt: "2026-06-04T12:00:00.000Z",
    avatarUrl: unsplash("photo-1523240795612-9a054b0db644", 400, 400),
    coverImage: unsplash("photo-1434030216411-0b793f4b4173", 1200, 480),
    rooms: [
      { slug: "study", name: "Study", focus: "habits and notes" },
      { slug: "projects", name: "Projects", focus: "portfolio work" },
      { slug: "internships", name: "Internships", focus: "applications" },
      { slug: "peers", name: "Peers", focus: "accountability" },
    ],
    prompts: [
      "What study system survives exam week?",
      "How do you pick a portfolio project that teaches something real?",
      "Share an internship application tip that is not generic.",
      "How do you find peers who actually show up?",
    ],
    pollQuestion: "Primary focus this term?",
    pollOptions: ["Coursework", "Side projects", "Internships", "Skill switching", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Start creating",
        body: "From Jimvio — Explore UGC campaigns when you are ready to practice public creative work.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Build a Creator Profile as you learn in public.\n\nStart: /identity",
      },
    ],
  },
  {
    slug: "business-leaders",
    name: "Business Leaders",
    category: "Business",
    tags: ["leadership", "teams", "strategy"],
    tagline: "Leading teams with clarity and calm.",
    description: "Leadership practice: decisions, culture, and accountability without corporate theater.",
    topic: "leadership",
    createdAt: "2026-06-05T10:00:00.000Z",
    avatarUrl: unsplash("photo-1542744173-8e2bd155f538", 400, 400),
    coverImage: unsplash("photo-1600880292203-757bb62b4baf", 1200, 480),
    rooms: [
      { slug: "decisions", name: "Decisions", focus: "judgment under uncertainty" },
      { slug: "teams", name: "Teams", focus: "hiring and culture" },
      { slug: "strategy", name: "Strategy", focus: "focus and tradeoffs" },
      { slug: "comms", name: "Comms", focus: "writing that aligns" },
    ],
    prompts: [
      "How do you make a decision when data is incomplete?",
      "What team ritual actually improved trust?",
      "Share a strategy cut you are glad you made.",
      "How do you write updates people read?",
    ],
    pollQuestion: "Leadership focus this quarter?",
    pollOptions: ["Hiring", "Execution quality", "Culture repair", "Strategy reset", "Personal bandwidth"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Leadership communities",
        body: "From Jimvio — Create a private leadership community for your org cohort.\n\nCreate: /communities",
      },
      {
        href: "/communities/live",
        title: "From Jimvio: Live",
        body: "From Jimvio — Host live leadership AMAs inside your community.\n\nLive: /communities/live",
      },
    ],
  },
  {
    slug: "ecommerce-sellers",
    name: "Ecommerce Sellers",
    category: "Ecommerce",
    tags: ["ecommerce", "catalog", "fulfillment"],
    tagline: "Catalog, conversion, and operations for sellers.",
    description: "Ecommerce operators comparing merchandising and ops — without fake revenue screenshots.",
    topic: "ecommerce",
    featured: true,
    createdAt: "2026-06-06T09:00:00.000Z",
    avatarUrl: unsplash("photo-1556740758-90de374c12ad", 400, 400),
    coverImage: unsplash("photo-1441986300917-64674bd600d8", 1200, 480),
    rooms: [
      { slug: "catalog", name: "Catalog", focus: "products and merchandising" },
      { slug: "conversion", name: "Conversion", focus: "pages and trust" },
      { slug: "ops", name: "Ops", focus: "fulfillment" },
      { slug: "ads", name: "Ads", focus: "paid acquisition" },
    ],
    prompts: [
      "What product page detail most improved conversion for you?",
      "How do you handle returns without burning margin?",
      "Share a catalog structure that stayed maintainable.",
      "When do ads stop being the bottleneck?",
    ],
    pollQuestion: "Primary sales channel?",
    pollOptions: ["Own storefront", "Marketplaces", "Social commerce", "Wholesale", "Mixed"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Discover products and grow your online business on Jimvio Marketplace.\n\nExplore: /marketplace",
      },
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Pair catalog growth with Affiliates when creators already trust your products.\n\nLearn more: /affiliates",
      },
    ],
  },
  {
    slug: "marketplace-sellers",
    name: "Marketplace Sellers",
    category: "Ecommerce",
    tags: ["marketplace", "listings", "sellers"],
    tagline: "Listings, trust, and seller operations.",
    description: "For sellers operating on marketplaces — listing quality, service, and reviews.",
    topic: "marketplace selling",
    createdAt: "2026-06-07T14:00:00.000Z",
    avatarUrl: unsplash("photo-1472851294608-062f824d29cc", 400, 400),
    coverImage: unsplash("photo-1556742111-a301076d9d18", 1200, 480),
    rooms: [
      { slug: "listings", name: "Listings", focus: "titles and media" },
      { slug: "service", name: "Service", focus: "buyer communication" },
      { slug: "reviews", name: "Reviews", focus: "reputation hygiene" },
      { slug: "growth", name: "Growth", focus: "assortment" },
    ],
    prompts: [
      "What listing photo rule do you never skip?",
      "How do you reply to a tough review without escalating?",
      "Share a title pattern that improved discovery.",
      "When should you expand assortment vs deepen bestsellers?",
    ],
    pollQuestion: "Hardest seller problem?",
    pollOptions: ["Photography", "Pricing", "Fulfillment", "Customer questions", "Returns"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Sell on Jimvio",
        body: "From Jimvio — List and grow on Jimvio Marketplace with clear product pages.\n\nExplore: /marketplace",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Product creative",
        body: "From Jimvio — Explore UGC campaigns to source authentic product clips.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "small-business-owners",
    name: "Small Business Owners",
    category: "Business",
    tags: ["smb", "operations", "local"],
    tagline: "Running a small business with clear priorities.",
    description: "Owners comparing cash, staffing, and customer care without invented success stories.",
    topic: "small business",
    createdAt: "2026-06-09T10:00:00.000Z",
    avatarUrl: unsplash("photo-1556740738-b6a63e27c4df", 400, 400),
    coverImage: unsplash("photo-1450101499163-c8848c66ca85", 1200, 480),
    rooms: [
      { slug: "cash", name: "Cash", focus: "runway and pricing" },
      { slug: "customers", name: "Customers", focus: "service and retention" },
      { slug: "staff", name: "Staff", focus: "hiring and training" },
      { slug: "tools", name: "Tools", focus: "software that earns its keep" },
    ],
    prompts: [
      "What weekly number do you check first?",
      "How do you raise prices without losing trust?",
      "Share a staffing lesson from a busy season.",
      "Which tool did you cancel and not miss?",
    ],
    pollQuestion: "Primary business model?",
    pollOptions: ["Services", "Products", "Hybrid", "Local / physical", "Online-first"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Bring products online through Jimvio Marketplace when you are ready.\n\nExplore: /marketplace",
      },
      {
        href: "/communities",
        title: "From Jimvio: Community for customers",
        body: "From Jimvio — Create a community for customers and regulars.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "finance-and-investing",
    name: "Finance & Investing",
    category: "Finance",
    tags: ["finance", "literacy", "planning"],
    tagline: "Money literacy without tips that pretend to be advice.",
    description: "Personal finance and investing literacy. Not personalized financial advice.",
    topic: "finance literacy",
    createdAt: "2026-06-10T11:00:00.000Z",
    avatarUrl: unsplash("photo-1611974789855-9c2a0a7236a3", 400, 400),
    coverImage: unsplash("photo-1579621970563-ebec7560ff3e", 1200, 480),
    rooms: [
      { slug: "basics", name: "Basics", focus: "budgets and buffers" },
      { slug: "investing", name: "Investing", focus: "long-term frameworks" },
      { slug: "business-money", name: "Business Money", focus: "owner finances" },
      { slug: "questions", name: "Questions", focus: "clarifying asks" },
    ],
    prompts: [
      "How do you separate emergency cash from long-term investing?",
      "What investing concept do people overcomplicate?",
      "Share a money habit that reduced stress (not returns).",
      "How do you evaluate a financial product pitch?",
    ],
    pollQuestion: "Learning focus right now?",
    pollOptions: ["Budgeting", "Investing basics", "Business cashflow", "Taxes literacy", "Debt payoff"],
    promo: [
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — If you recommend tools you already use, Affiliates can fit — with clear disclosures.\n\nLearn more: /affiliates",
      },
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Build your creator presence if you teach literacy content.\n\nProfile: /identity",
      },
    ],
  },
  {
    slug: "forex-discussions",
    name: "Forex Discussions",
    category: "Trading",
    tags: ["forex", "markets", "risk"],
    tagline: "Market discussion with risk first.",
    description: "Forex and FX discussion. No signals, no guaranteed profits, no fake trade screenshots.",
    topic: "forex risk literacy",
    createdAt: "2026-06-11T13:00:00.000Z",
    avatarUrl: unsplash("photo-1611974789855-9c2a0a7236a3", 400, 400),
    coverImage: unsplash("photo-1642790106117-e829e14aa1c5", 1200, 480),
    rooms: [
      { slug: "risk", name: "Risk", focus: "position sizing and limits" },
      { slug: "process", name: "Process", focus: "journals and reviews" },
      { slug: "macro", name: "Macro", focus: "context without predictions" },
      { slug: "psychology", name: "Psychology", focus: "discipline" },
    ],
    prompts: [
      "What risk rule do you never break?",
      "How do you review a losing week without spiraling?",
      "Share a journaling field that actually changed behavior.",
      "How do you spot a “signal” account that is selling fantasy?",
    ],
    pollQuestion: "Primary goal in this room?",
    pollOptions: ["Risk literacy", "Process improvement", "Macro context", "Accountability", "Teaching others"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Communities",
        body: "From Jimvio — Prefer a private cohort? Create your own community with clear rules.\n\nCreate: /communities",
      },
      {
        href: "/identity",
        title: "From Jimvio: Identity",
        body: "From Jimvio — Build a profile if you publish education (not signals).\n\nProfile: /identity",
      },
    ],
  },
  {
    slug: "sports-fans",
    name: "Sports Fans",
    category: "Sports",
    tags: ["sports", "fans", "matchday"],
    tagline: "Matchday talk without invented scores.",
    description: "Fan discussion across sports. Predictions are labeled. Results are not fabricated.",
    topic: "sports fandom",
    createdAt: "2026-06-12T16:00:00.000Z",
    avatarUrl: unsplash("photo-1461896836934-ffe607ba6851", 400, 400),
    coverImage: unsplash("photo-1574629810360-7efbbe195018", 1200, 480),
    rooms: [
      { slug: "match-talk", name: "Match Talk", focus: "what you watched" },
      { slug: "predictions", name: "Predictions", focus: "labeled guesses" },
      { slug: "highlights", name: "Highlights", focus: "moments worth rewatching" },
      { slug: "culture", name: "Fan Culture", focus: "chants, kits, stories" },
    ],
    prompts: [
      "What made last matchday memorable for you?",
      "How do you disagree about tactics without personal attacks?",
      "Share a fan tradition from your city.",
      "What prediction are you willing to put in writing (as a guess)?",
    ],
    pollQuestion: "Primary sport in this room for you?",
    pollOptions: ["Football", "Basketball", "Athletics", "Multi-sport", "Other"],
    promo: [
      {
        href: "/communities/live",
        title: "From Jimvio: Watch-alongs",
        body: "From Jimvio — Take matchday live inside your community when rights and rules allow.\n\nLive: /communities/live",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Creator sports content",
        body: "From Jimvio — Explore UGC campaigns for sports-adjacent creators.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "football-community",
    name: "Football Community",
    category: "Sports",
    tags: ["football", "soccer", "tactics"],
    tagline: "Football talk: tactics, youth games, and local scenes.",
    description: "Football community programming. No fabricated lineups, injuries, or scores.",
    topic: "football",
    createdAt: "2026-06-13T17:00:00.000Z",
    avatarUrl: unsplash("photo-1579952363873-27f3bade9f55", 400, 400),
    coverImage: unsplash("photo-1431324155629-1a6deb1dec8d", 1200, 480),
    rooms: [
      { slug: "tactics", name: "Tactics", focus: "shapes and roles" },
      { slug: "local", name: "Local Game", focus: "community football" },
      { slug: "watchalong", name: "Watchalong", focus: "matchday chat" },
      { slug: "youth", name: "Youth", focus: "development pathways" },
    ],
    prompts: [
      "Which tactical role is most misunderstood by casual fans?",
      "How do you support local football without ignoring safety?",
      "Share a coaching cue that helped amateur players.",
      "What makes a watchalong thread actually fun?",
    ],
    pollQuestion: "How do you mostly follow football?",
    pollOptions: ["Live matches", "Highlights", "Local games", "Tactics content", "Mixed"],
    promo: [
      {
        href: "/communities/live",
        title: "From Jimvio: Live",
        body: "From Jimvio — Host live community watchalongs responsibly.\n\nLive: /communities/live",
      },
      {
        href: "/communities",
        title: "From Jimvio: Club communities",
        body: "From Jimvio — Create a community for your club supporters group.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "music-and-entertainment",
    name: "Music & Entertainment",
    category: "Music",
    tags: ["music", "playlists", "shows"],
    tagline: "Music discovery and entertainment craft.",
    description: "Playlists, live shows, and entertainment industry craft without fake chart claims.",
    topic: "music",
    createdAt: "2026-06-14T12:00:00.000Z",
    avatarUrl: unsplash("photo-1511379938547-c1f69419868d", 400, 400),
    coverImage: unsplash("photo-1493225457124-a3eb161ffa5f", 1200, 480),
    rooms: [
      { slug: "discovery", name: "Discovery", focus: "what you are listening to" },
      { slug: "live", name: "Live Shows", focus: "concerts and sessions" },
      { slug: "craft", name: "Craft", focus: "making and releasing" },
      { slug: "industry", name: "Industry", focus: "working in entertainment" },
    ],
    prompts: [
      "What album are you sitting with this week, and why?",
      "How do you discover music beyond algorithmic loops?",
      "Share a live show detail that made the night.",
      "What release habit keeps quality high?",
    ],
    pollQuestion: "Primary way you find music?",
    pollOptions: ["Playlists", "Friends", "Live shows", "Radio / shows", "Social clips"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Creator campaigns",
        body: "From Jimvio — Explore UGC campaigns for entertainment creators.\n\nBrowse: /ugc",
      },
      {
        href: "/communities/live",
        title: "From Jimvio: Live sessions",
        body: "From Jimvio — Take listening parties or AMAs live in your community.\n\nLive: /communities/live",
      },
    ],
  },
  {
    slug: "film-and-culture",
    name: "Film & Culture",
    category: "Entertainment",
    tags: ["film", "tv", "culture"],
    tagline: "Films, series, and cultural criticism with spoilers labeled.",
    description: "Thoughtful entertainment discussion. Mark spoilers. No invented reviews from famous critics.",
    topic: "film culture",
    createdAt: "2026-06-15T18:00:00.000Z",
    avatarUrl: unsplash("photo-1489599849927-2ee91cede3dd", 400, 400),
    coverImage: unsplash("photo-1478720568477-152d9b164e26", 1200, 480),
    rooms: [
      { slug: "reviews", name: "Reviews", focus: "what you watched" },
      { slug: "spoilers", name: "Spoilers", focus: "deep spoilers only" },
      { slug: "craft", name: "Craft", focus: "directing and writing" },
      { slug: "culture", name: "Culture", focus: "broader context" },
    ],
    prompts: [
      "What film surprised you recently — and what did it do well?",
      "How do you write a review without spoiling the turn?",
      "Share a craft detail you noticed on a rewatch.",
      "Which cultural conversation is film helping you think about?",
    ],
    pollQuestion: "Preferred format?",
    pollOptions: ["Feature films", "Series", "Documentaries", "Shorts", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Storytelling campaigns",
        body: "From Jimvio — Explore UGC briefs that need strong narrative craft.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Build your creator profile if criticism or filmmaking is your work.\n\nProfile: /identity",
      },
    ],
  },
  {
    slug: "gospel-and-inspiration",
    name: "Gospel & Inspiration",
    category: "Faith",
    tags: ["gospel", "inspiration", "community"],
    tagline: "Encouragement with respect across traditions.",
    description: "Gospel music, reflection, and encouragement. No fake healings or pressure.",
    topic: "gospel inspiration",
    createdAt: "2026-06-16T07:00:00.000Z",
    avatarUrl: unsplash("photo-1507692049790-de58290a4334", 400, 400),
    coverImage: unsplash("photo-1438232992991-995b7058bbb3", 1200, 480),
    rooms: [
      { slug: "reflection", name: "Reflection", focus: "quiet thoughts" },
      { slug: "music", name: "Music", focus: "gospel and worship" },
      { slug: "encouragement", name: "Encouragement", focus: "short notes" },
      { slug: "questions", name: "Questions", focus: "honest asks" },
    ],
    prompts: [
      "What song has been steadying you lately?",
      "How do you encourage someone without minimizing their week?",
      "Share a short reflection in two sentences.",
      "What question are you carrying into this week?",
    ],
    pollQuestion: "What brings you here most?",
    pollOptions: ["Music", "Reflection", "Community support", "Questions", "All of the above"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Creator Profile",
        body: "From Jimvio — If encouragement or gospel content is part of your public work, complete your Creator Profile.\n\nProfile: /identity",
      },
      {
        href: "/ugc",
        title: "From Jimvio: UGC",
        body: "From Jimvio — Explore campaigns that fit your voice — only if the brief is aligned.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "health-and-fitness",
    name: "Health & Fitness",
    category: "Fitness",
    tags: ["fitness", "habits", "recovery"],
    tagline: "Sustainable habits over extremes.",
    description: "Training and recovery discussion. Not medical advice. No fake transformations.",
    topic: "fitness habits",
    createdAt: "2026-06-17T06:00:00.000Z",
    avatarUrl: unsplash("photo-1571019614242-c5c5dee9f50b", 400, 400),
    coverImage: unsplash("photo-1517836357463-d25dfeac3438", 1200, 480),
    rooms: [
      { slug: "training", name: "Training", focus: "programs and form" },
      { slug: "recovery", name: "Recovery", focus: "sleep and rest" },
      { slug: "habits", name: "Habits", focus: "consistency" },
      { slug: "nutrition", name: "Nutrition", focus: "practical meals" },
    ],
    prompts: [
      "What training split do you actually stick to?",
      "How do you recover after a hard week without quitting?",
      "Share a habit cue that made consistency easier.",
      "What nutrition advice do you ignore — and why?",
    ],
    pollQuestion: "Primary training style?",
    pollOptions: ["Strength", "Cardio / endurance", "Hybrid", "Mobility / rehab", "Still building the habit"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Fitness creators",
        body: "From Jimvio — Explore UGC campaigns for fitness educators (no fake before/after claims).\n\nBrowse: /ugc",
      },
      {
        href: "/communities",
        title: "From Jimvio: Accountability communities",
        body: "From Jimvio — Create a community for your training cohort.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "travel-and-lifestyle",
    name: "Travel & Lifestyle",
    category: "Travel",
    tags: ["travel", "lifestyle", "planning"],
    tagline: "Trips, routines, and practical lifestyle craft.",
    description: "Travel planning and lifestyle habits. No fake itineraries presented as sponsorships.",
    topic: "travel lifestyle",
    createdAt: "2026-06-18T15:00:00.000Z",
    avatarUrl: unsplash("photo-1488646953014-85cb44e25828", 400, 400),
    coverImage: unsplash("photo-1469854523086-cc02fe5d8800", 1200, 480),
    rooms: [
      { slug: "planning", name: "Planning", focus: "itineraries that breathe" },
      { slug: "packing", name: "Packing", focus: "light kits" },
      { slug: "work-travel", name: "Work Travel", focus: "staying productive" },
      { slug: "home", name: "Home Base", focus: "routines between trips" },
    ],
    prompts: [
      "How do you plan a trip with recovery days built in?",
      "What packing item earns its weight every time?",
      "Share a work-travel boundary that protected your energy.",
      "What home routine helps you land after travel?",
    ],
    pollQuestion: "Travel style?",
    pollOptions: ["Slow travel", "City hopping", "Workations", "Family trips", "Day trips / local"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Travel creators",
        body: "From Jimvio — Explore UGC campaigns for travel and lifestyle creators.\n\nBrowse: /ugc",
      },
      {
        href: "/affiliates",
        title: "From Jimvio: Affiliates",
        body: "From Jimvio — Recommend gear you actually use via Affiliates — with disclosures.\n\nLearn more: /affiliates",
      },
    ],
  },
  {
    slug: "photography",
    name: "Photography",
    category: "Photography",
    tags: ["photo", "light", "editing"],
    tagline: "Light, composition, and editing craft.",
    description: "Photographers comparing process — gear talk secondary to seeing.",
    topic: "photography",
    createdAt: "2026-06-19T11:00:00.000Z",
    avatarUrl: unsplash("photo-1452587925148-ce544e77e70d", 400, 400),
    coverImage: unsplash("photo-1516035069371-29a1b244cc32", 1200, 480),
    rooms: [
      { slug: "light", name: "Light", focus: "seeing light" },
      { slug: "composition", name: "Composition", focus: "frames" },
      { slug: "editing", name: "Editing", focus: "color and tone" },
      { slug: "business", name: "Business", focus: "client work" },
    ],
    prompts: [
      "What lighting constraint taught you the most?",
      "How do you critique composition without killing someone’s joy?",
      "Share an editing rule you almost always follow.",
      "How do you price a shoot without racing to the bottom?",
    ],
    pollQuestion: "Primary photography focus?",
    pollOptions: ["Portrait", "Documentary", "Product", "Street", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Visual campaigns",
        body: "From Jimvio — Explore UGC campaigns that need strong stills and motion.\n\nBrowse: /ugc",
      },
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Study product photography on live Marketplace listings.\n\nExplore: /marketplace",
      },
    ],
  },
  {
    slug: "gaming",
    name: "Gaming",
    category: "Gaming",
    tags: ["games", "co-op", "design"],
    tagline: "Games, co-op nights, and design talk.",
    description: "Gaming community for sessions, tips, and game design curiosity — no invented rankings.",
    topic: "gaming",
    createdAt: "2026-06-20T20:00:00.000Z",
    avatarUrl: unsplash("photo-1542751371-adc38448a05e", 400, 400),
    coverImage: unsplash("photo-1511512578047-dfb367046420", 1200, 480),
    rooms: [
      { slug: "looking-for-group", name: "LFG", focus: "finding players" },
      { slug: "tips", name: "Tips", focus: "mechanics help" },
      { slug: "design", name: "Design", focus: "what games teach" },
      { slug: "events", name: "Events", focus: "community nights" },
    ],
    prompts: [
      "What game are you playing with friends right now?",
      "Share a tip that helped a new player without spoiling joy.",
      "What game design choice do you admire and why?",
      "How do you host a community game night that stays welcoming?",
    ],
    pollQuestion: "Primary platform?",
    pollOptions: ["PC", "Console", "Mobile", "Multi-platform", "Tabletop too"],
    promo: [
      {
        href: "/communities/live",
        title: "From Jimvio: Live nights",
        body: "From Jimvio — Host live community game nights when it fits your room.\n\nLive: /communities/live",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Creator campaigns",
        body: "From Jimvio — Explore UGC for gaming creators.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "books-and-learning",
    name: "Books & Learning",
    category: "Education",
    tags: ["books", "reading", "notes"],
    tagline: "Reading together and keeping notes that stick.",
    description: "Book clubs and learning systems. No fake “must read” lists sold as authority.",
    topic: "reading",
    createdAt: "2026-06-21T09:00:00.000Z",
    avatarUrl: unsplash("photo-1512820790803-83ca734da794", 400, 400),
    coverImage: unsplash("photo-1481627834876-b7833e8f5570", 1200, 480),
    rooms: [
      { slug: "now-reading", name: "Now Reading", focus: "current books" },
      { slug: "notes", name: "Notes", focus: "retention systems" },
      { slug: "club", name: "Club", focus: "shared reads" },
      { slug: "nonfiction", name: "Nonfiction", focus: "ideas books" },
    ],
    prompts: [
      "What are you reading, and what question brought you to it?",
      "How do you take notes you will actually revisit?",
      "Share a nonfiction idea you applied within a week.",
      "How do you run a book club that does not become homework?",
    ],
    pollQuestion: "Reading mode?",
    pollOptions: ["Fiction", "Nonfiction", "Both", "Audiobooks primarily", "Essays / longform"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Start a reading community",
        body: "From Jimvio — Create a community for your reading cohort.\n\nCreate: /communities",
      },
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Build your profile if you publish learning content.\n\nProfile: /identity",
      },
    ],
  },
  {
    slug: "productivity",
    name: "Productivity",
    category: "Other",
    tags: ["productivity", "systems", "focus"],
    tagline: "Systems that survive real weeks.",
    description: "Productivity craft without toxic hustle. Tools secondary to attention.",
    topic: "productivity",
    createdAt: "2026-06-22T08:00:00.000Z",
    avatarUrl: unsplash("photo-1484480974693-6ca0a78fb36b", 400, 400),
    coverImage: unsplash("photo-1507925921958-8a62f3d1a50d", 1200, 480),
    rooms: [
      { slug: "systems", name: "Systems", focus: "personal ops" },
      { slug: "focus", name: "Focus", focus: "attention" },
      { slug: "tools", name: "Tools", focus: "stack minimalism" },
      { slug: "review", name: "Review", focus: "weekly reviews" },
    ],
    prompts: [
      "What productivity system collapsed for you, and what replaced it?",
      "How do you protect focus when Slack never sleeps?",
      "Share a weekly review question that surfaces truth.",
      "Which tool did you remove and feel lighter?",
    ],
    pollQuestion: "Biggest productivity leak?",
    pollOptions: ["Context switching", "Unclear priorities", "Meetings", "Tool sprawl", "Energy management"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Accountability rooms",
        body: "From Jimvio — Create a community for your accountability group.\n\nCreate: /communities",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Creator education",
        body: "From Jimvio — Explore UGC if you teach systems publicly.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "personal-development",
    name: "Personal Development",
    category: "Education",
    tags: ["growth", "habits", "reflection"],
    tagline: "Growth with honesty and patience.",
    description: "Personal development without miracle claims or fake overnight transformations.",
    topic: "personal development",
    createdAt: "2026-06-23T07:30:00.000Z",
    avatarUrl: unsplash("photo-1499209974431-9dddcece7f88", 400, 400),
    coverImage: unsplash("photo-1506126613408-eca07ce68773", 1200, 480),
    rooms: [
      { slug: "habits", name: "Habits", focus: "small consistent moves" },
      { slug: "reflection", name: "Reflection", focus: "journaling prompts" },
      { slug: "courage", name: "Courage", focus: "hard conversations" },
      { slug: "rest", name: "Rest", focus: "recovery as skill" },
    ],
    prompts: [
      "What habit is actually sticking this month?",
      "Share a reflection prompt that surprised you.",
      "How do you practice courage in ordinary weeks?",
      "What does rest look like when you are not performing it?",
    ],
    pollQuestion: "Focus area?",
    pollOptions: ["Habits", "Relationships", "Work craft", "Health", "Inner life"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Identity",
        body: "From Jimvio — Build your creator presence if you teach growth content responsibly.\n\nProfile: /identity",
      },
      {
        href: "/communities",
        title: "From Jimvio: Communities",
        body: "From Jimvio — Create a community for your cohort or circle.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "women-in-business",
    name: "Women in Business",
    category: "Business",
    tags: ["women", "business", "leadership"],
    tagline: "Builders, leaders, and operators supporting each other.",
    description: "Business community for women founders and operators — practical, respectful, no tokenism theater.",
    topic: "women in business",
    createdAt: "2026-06-24T10:00:00.000Z",
    avatarUrl: unsplash("photo-1573164713714-d95e436ab8d6", 400, 400),
    coverImage: unsplash("photo-1551836022-d5d88e9218df", 1200, 480),
    rooms: [
      { slug: "founders", name: "Founders", focus: "building companies" },
      { slug: "leadership", name: "Leadership", focus: "leading teams" },
      { slug: "money", name: "Money", focus: "pricing and capital" },
      { slug: "network", name: "Network", focus: "intros that help" },
    ],
    prompts: [
      "What business decision got easier with peer counsel?",
      "How do you price your work with confidence?",
      "Share a leadership lesson from a hard quarter.",
      "What kind of intro is actually useful?",
    ],
    pollQuestion: "Primary seat?",
    pollOptions: ["Founder", "Operator / leader", "Freelancer", "Investor / advisor", "Exploring"],
    promo: [
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Grow a storefront on Jimvio Marketplace when products are ready.\n\nExplore: /marketplace",
      },
      {
        href: "/communities",
        title: "From Jimvio: Communities",
        body: "From Jimvio — Create a community for your network or alumni circle.\n\nCreate: /communities",
      },
    ],
  },
  {
    slug: "youth-and-careers",
    name: "Youth & Careers",
    category: "Education",
    tags: ["youth", "first-job", "skills"],
    tagline: "First jobs, skills, and early career courage.",
    description: "Career community for younger professionals and students entering work.",
    topic: "youth careers",
    createdAt: "2026-06-25T11:00:00.000Z",
    avatarUrl: unsplash("photo-1529156069898-49953e39b3ac", 400, 400),
    coverImage: unsplash("photo-1523240795612-9a054b0db644", 1200, 480),
    rooms: [
      { slug: "first-jobs", name: "First Jobs", focus: "getting started" },
      { slug: "skills", name: "Skills", focus: "what to learn" },
      { slug: "interviews", name: "Interviews", focus: "practice" },
      { slug: "confidence", name: "Confidence", focus: "imposter moments" },
    ],
    prompts: [
      "What helped you land a first opportunity?",
      "Which skill felt intimidating until you practiced in public?",
      "Share an interview story that taught you something.",
      "How do you handle imposter feelings without freezing?",
    ],
    pollQuestion: "Where are you?",
    pollOptions: ["Student", "First role", "Switching fields", "Building skills", "Helping peers"],
    promo: [
      {
        href: "/identity",
        title: "From Jimvio: Profile",
        body: "From Jimvio — Build your profile early so opportunities have a place to land.\n\nProfile: /identity",
      },
      {
        href: "/ugc",
        title: "From Jimvio: Create",
        body: "From Jimvio — Explore UGC when you want practice creating in public.\n\nBrowse: /ugc",
      },
    ],
  },
  {
    slug: "africa-creators",
    name: "Africa Creators",
    category: "Creator",
    tags: ["africa", "creators", "culture"],
    tagline: "Creators across Africa comparing craft and opportunity.",
    description: "A Jimvio editorial room for African creators — culture, craft, and distribution without stereotypes.",
    topic: "African creators",
    featured: true,
    createdAt: "2026-06-26T12:00:00.000Z",
    avatarUrl: unsplash("photo-1547471080-7cc2caa01a7e", 400, 400),
    coverImage: unsplash("photo-1523805009345-7448845a9e53", 1200, 480),
    rooms: [
      { slug: "craft", name: "Craft", focus: "making work" },
      { slug: "distribution", name: "Distribution", focus: "finding audiences" },
      { slug: "collabs", name: "Collabs", focus: "working together" },
      { slug: "business", name: "Business", focus: "getting paid fairly" },
    ],
    prompts: [
      "What story from your city are you telling through your work?",
      "How do you distribute beyond a single platform?",
      "Share a collaboration that raised the work quality.",
      "What payment or brief lesson do newer creators need?",
    ],
    pollQuestion: "Primary creator medium?",
    pollOptions: ["Video", "Music", "Writing", "Design / visual", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: UGC & Clipping",
        body: "From Jimvio — Explore UGC & Clipping campaigns. Apply when the brief fits your voice.\n\nBrowse: /ugc",
      },
      {
        href: "/identity",
        title: "From Jimvio: Creator Profile",
        body: "From Jimvio — Build your Creator Profile on Jimvio.\n\nStart: /identity",
      },
    ],
  },
  {
    slug: "rwanda-community",
    name: "Rwanda Community",
    category: "Other",
    tags: ["rwanda", "kigali", "local"],
    tagline: "People connected to Rwanda — work, culture, and community.",
    description: "Local and diaspora conversation about Rwanda: work, culture, and building together.",
    topic: "Rwanda community",
    createdAt: "2026-06-27T09:00:00.000Z",
    avatarUrl: unsplash("photo-1523805009345-7448845a9e53", 400, 400),
    coverImage: unsplash("photo-1489392191049-fc10c97e64b6", 1200, 480),
    rooms: [
      { slug: "kigali", name: "Kigali", focus: "city life and work" },
      { slug: "builders", name: "Builders", focus: "startups and projects" },
      { slug: "culture", name: "Culture", focus: "arts and heritage" },
      { slug: "diaspora", name: "Diaspora", focus: "staying connected" },
    ],
    prompts: [
      "What is one underrated thing about building from Kigali?",
      "How do diaspora members stay useful without being distant critics?",
      "Share a cultural event or habit worth protecting.",
      "What collaboration across Rwanda and the region excites you?",
    ],
    pollQuestion: "How are you connected?",
    pollOptions: ["Living in Rwanda", "Diaspora", "Frequent visitor", "Business partner", "Curious learner"],
    promo: [
      {
        href: "/communities",
        title: "From Jimvio: Local communities",
        body: "From Jimvio — Create a tighter community for your neighborhood, alumni, or guild.\n\nCreate: /communities",
      },
      {
        href: "/marketplace",
        title: "From Jimvio: Marketplace",
        body: "From Jimvio — Discover and sell products on Jimvio Marketplace.\n\nExplore: /marketplace",
      },
    ],
  },
  {
    slug: "global-creators",
    name: "Global Creators",
    category: "Creator",
    tags: ["global", "creators", "collab"],
    tagline: "Creators collaborating across borders.",
    description: "Cross-border creator craft: collabs, time zones, and respectful cultural exchange.",
    topic: "global creators",
    createdAt: "2026-06-28T10:00:00.000Z",
    avatarUrl: unsplash("photo-1529156069898-49953e39b3ac", 400, 400),
    coverImage: unsplash("photo-1526778548025-fa2f459cd5c1", 1200, 480),
    rooms: [
      { slug: "collabs", name: "Collabs", focus: "finding partners" },
      { slug: "timezones", name: "Time Zones", focus: "async workflows" },
      { slug: "culture", name: "Culture", focus: "respectful exchange" },
      { slug: "business", name: "Business", focus: "cross-border work" },
    ],
    prompts: [
      "How do you run a collab across time zones without chaos?",
      "What cultural detail do creators often miss in briefs?",
      "Share an async workflow that kept quality high.",
      "How do you price international work fairly?",
    ],
    pollQuestion: "Collab preference?",
    pollOptions: ["Same region", "Cross-region", "Async only", "Live sessions", "Mixed"],
    promo: [
      {
        href: "/ugc",
        title: "From Jimvio: Global campaigns",
        body: "From Jimvio — Explore UGC campaigns open to creators in multiple regions.\n\nBrowse: /ugc",
      },
      {
        href: "/communities/live",
        title: "From Jimvio: Live",
        body: "From Jimvio — Host live creator sessions across your community.\n\nLive: /communities/live",
      },
    ],
  },
];

function buildRoom(bp: EcosystemBlueprint, room: EcosystemBlueprint["rooms"][number], index: number): EditorialRoomSpec {
  const prefix = `${bp.slug}-${room.slug}`;
  const m1: EditorialMessageSpec = {
    key: `${prefix}-m1`,
    body: `Welcome to ${room.name}. This channel is for ${room.focus}. Keep it practical and kind.`,
    daysAgo: 70 - index,
    hour: 9,
    pinned: true,
  };
  const m2: EditorialMessageSpec = {
    key: `${prefix}-m2`,
    body: `Question for the room: ${bp.prompts[index % bp.prompts.length]}`,
    daysAgo: 55 - index,
    hour: 11,
  };
  const m3: EditorialMessageSpec = {
    key: `${prefix}-m3`,
    body:
      index % 2 === 0
        ? "Yes — I found that clarity in the first three seconds matters more than a long setup. Lead with the problem or the product, then explain."
        : "A pattern that helps: write the outcome you want, then the constraint, then one example. People reply faster.",
    daysAgo: 54 - index,
    hour: 14,
    replyToKey: `${prefix}-m2`,
  };
  const m4: EditorialMessageSpec = {
    key: `${prefix}-m4`,
    body:
      index % 2 === 0
        ? "Would you recommend showing the product immediately, or building context first?"
        : "Would you keep that as a checklist in the channel welcome?",
    daysAgo: 40 - index,
    hour: 16,
    replyToKey: `${prefix}-m3`,
  };
  const m5: EditorialMessageSpec = {
    key: `${prefix}-m5`,
    body:
      index % 2 === 0
        ? "Usually yes for product-led clips. I tested both approaches; delayed reveals worked only when the hook was unusually strong."
        : "Yes — short welcome, one example, and a link to the longer post in Discussion.",
    daysAgo: 39 - index,
    hour: 10,
    replyToKey: `${prefix}-m4`,
  };
  const m6: EditorialMessageSpec = {
    key: `${prefix}-m6`,
    body: `Resource note for ${bp.topic}: when you share a tip, add the condition where it fails. That keeps the thread honest.`,
    daysAgo: 12 - Math.min(index, 10),
    hour: 15,
  };

  return {
    slug: room.slug === "general" && index === 0 ? `${bp.slug}-general` : room.slug,
    name: room.name,
    description: room.focus,
    welcomeMessage: `Channel focus: ${room.focus}.`,
    messages: [m1, m2, m3, m4, m5, m6],
  };
}

function buildPosts(bp: EcosystemBlueprint): EditorialPostSpec[] {
  const posts: EditorialPostSpec[] = [
    {
      key: `${bp.slug}-welcome`,
      title: `How ${bp.name} works`,
      body: `${bp.name} is Jimvio editorial programming — a public community about ${bp.topic}.\n\n${bp.description}\n\nYou will find discussion prompts, a poll, and occasional Jimvio product notes clearly labeled “From Jimvio.” We do not invent testimonials, earnings, or fake member activity.`,
      postType: "discussion",
      origin: "editorial",
      daysAgo: 78,
      hour: 10,
      pinned: true,
      comments: [
        {
          key: `${bp.slug}-welcome-c1`,
          body: "House note: disagree with ideas, cite your experience, and skip fabricated claims.",
          daysAgo: 77,
          hour: 9,
        },
      ],
    },
  ];

  bp.prompts.forEach((prompt, i) => {
    const comments: EditorialCommentSpec[] = [];
    if (i === 0) {
      comments.push(
        {
          key: `${bp.slug}-p${i}-c1`,
          body: "I found that naming the constraint first gets better replies than starting with a hot take.",
          daysAgo: 60 - i * 8,
          hour: 12,
        },
        {
          key: `${bp.slug}-p${i}-c2`,
          body: "Agree — and one concrete example beats three abstract principles.",
          daysAgo: 59 - i * 8,
          hour: 15,
        }
      );
    }
    posts.push({
      key: `${bp.slug}-prompt-${i}`,
      title: prompt.length > 72 ? `${prompt.slice(0, 69)}…` : prompt,
      body: `${prompt}\n\nShare what you have tried in ${bp.topic}. Prefer specifics over slogans. If you are unsure, ask a clarifying question instead of inventing certainty.`,
      postType: "discussion",
      origin: "editorial",
      daysAgo: 62 - i * 9,
      hour: 11 + (i % 5),
      comments,
    });
  });

  posts.push({
    key: `${bp.slug}-poll`,
    title: bp.pollQuestion,
    body: "A snapshot of how this room works — answer for your current season, not the ideal one.",
    postType: "poll",
    origin: "editorial",
    daysAgo: 28,
    hour: 13,
    pollOptions: bp.pollOptions,
  });

  bp.promo.forEach((promo, i) => {
    posts.push({
      key: `${bp.slug}-promo-${i}`,
      title: promo.title,
      body: promo.body,
      postType: "discussion",
      origin: "promotion" as JimvioContentOrigin,
      daysAgo: 8 - i,
      hour: 12,
      href: promo.href,
    });
  });

  posts.push({
    key: `${bp.slug}-recent`,
    title: `Open thread: ${bp.topic}`,
    body: `What is one thing you are practicing in ${bp.topic} this week?\n\nKeep it short. Teach one detail. Leave room for someone else to add the next step.`,
    postType: "discussion",
    origin: "editorial",
    daysAgo: 1,
    hour: 9,
  });

  return posts;
}

export function buildEcosystemCommunity(bp: EcosystemBlueprint): EditorialCommunitySpec {
  const rooms = bp.rooms.map((room, index) => buildRoom(bp, room, index));
  // Keep first room as primary chat space alias for older seeder field.
  const [primary, ...rest] = rooms;
  return {
    slug: bp.slug,
    name: bp.name,
    tagline: bp.tagline,
    description: bp.description,
    longDescription: `${bp.description}\n\nThis community is Jimvio-managed editorial programming about ${bp.topic}. Conversations are designed to feel coherent and useful. Promotions are labeled From Jimvio. Existing user-created communities are never overwritten by this catalog.`,
    category: bp.category,
    tags: bp.tags,
    createdAt: bp.createdAt,
    welcomeTitle: `Welcome to ${bp.name}`,
    welcomeMessage: `Talk about ${bp.topic}. Be specific. Label opinions. Do not invent results, earnings, or testimonials.`,
    rules: `Stay on ${bp.topic}. No fabricated claims, fake earnings, or harassment. Mark promotions clearly when you share Jimvio product links. Respect people across experience levels.`,
    avatarUrl: bp.avatarUrl,
    coverImage: bp.coverImage,
    featured: Boolean(bp.featured),
    extraRoom: primary!,
    extraRooms: rest,
    posts: buildPosts(bp),
  };
}

export const ECOSYSTEM_CATALOG: EditorialCommunitySpec[] =
  ECOSYSTEM_BLUEPRINTS.map(buildEcosystemCommunity);

export const ECOSYSTEM_COMMUNITY_SLUGS = ECOSYSTEM_BLUEPRINTS.map((b) => b.slug);
