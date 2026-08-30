/**
 * Expands compact WORLD_COMMUNITY_SEEDS into full EditorialCommunitySpec records.
 */
import {
  MEMBER_TIER_RANGES,
  WORLD_COMMUNITY_SEEDS,
  type WorldCommunitySeed,
} from "./editorial-world-blueprints";
import type {
  EditorialCommentSpec,
  EditorialCommunitySpec,
  EditorialMessageSpec,
  EditorialPostSpec,
  EditorialRoomSpec,
} from "./editorial-types";
import type { JimvioContentOrigin } from "./editorial-origin";

function unsplash(id: string, w: number, h: number): string {
  const photo = id.startsWith("photo-") ? id : `photo-${id}`;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

/** Stable Cloudinary demo videos only (no third-party buckets that 403). */
const SAMPLE_VIDEOS = [
  "https://res.cloudinary.com/demo/video/upload/dog.mp4",
  "https://res.cloudinary.com/demo/video/upload/docs/walking_talking.mp4",
  "https://res.cloudinary.com/demo/video/upload/elephants.mp4",
  "https://res.cloudinary.com/demo/video/upload/ski_jump.mp4",
  "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
];

const PROMO_COPY: Record<
  WorldCommunitySeed["promoHref"],
  { title: string; body: string }
> = {
  "/ugc": {
    title: "From Jimvio: UGC & Clipping campaigns",
    body: "From Jimvio — Looking for ways to turn your skills into income? Explore UGC & Clipping campaigns. Read each brief; apply only if it fits.\n\nBrowse: /ugc",
  },
  "/affiliates": {
    title: "From Jimvio: Affiliates",
    body: "From Jimvio — Share products you already trust and earn commissions through Jimvio Affiliates. No invented payout claims.\n\nLearn more: /affiliates",
  },
  "/identity": {
    title: "From Jimvio: Creator Profile",
    body: "From Jimvio — Build your Creator Profile so opportunities on Jimvio can find the work you already do.\n\nStart: /identity",
  },
  "/marketplace": {
    title: "From Jimvio: Marketplace",
    body: "From Jimvio — Discover products and grow an online storefront on Jimvio Marketplace.\n\nExplore: /marketplace",
  },
  "/communities": {
    title: "From Jimvio: Create a community",
    body: "From Jimvio — Ready for a tighter room? Create your own community and build around the problem you solve.\n\nCreate: /communities",
  },
  "/communities/live": {
    title: "From Jimvio: Go Live",
    body: "From Jimvio — Take your community live for AMAs, workshops, or watchalongs.\n\nLive: /communities/live",
  },
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function targetMemberCountFor(seed: WorldCommunitySeed): number {
  const range = MEMBER_TIER_RANGES[seed.memberTier] ?? MEMBER_TIER_RANGES[0]!;
  const [lo, hi] = range;
  const span = Math.max(1, hi - lo);
  const n = lo + (hash(seed.slug) % (span + 1));
  return Math.min(2000, Math.max(40, n));
}

function postBudget(activity: WorldCommunitySeed["activity"], slug: string): number {
  const h = hash(`${slug}:posts`);
  if (activity === "high") return 24 + (h % 15); // 24–38
  if (activity === "medium") return 14 + (h % 11); // 14–24
  return 8 + (h % 7); // 8–14
}

function engagement(slug: string, key: string, activity: WorldCommunitySeed["activity"]) {
  const h = hash(`${slug}:${key}:eng`);
  const baseViews =
    activity === "high" ? 400 + (h % 5200) : activity === "medium" ? 120 + (h % 1800) : 40 + (h % 400);
  const likeRate = 0.02 + ((h >> 3) % 8) / 100;
  const likes = Math.max(0, Math.min(baseViews - 1, Math.floor(baseViews * likeRate)));
  return { viewCount: baseViews, likeCount: likes };
}

function buildRooms(seed: WorldCommunitySeed): EditorialRoomSpec[] {
  return seed.rooms.map((room, index) => {
    const prefix = `${seed.slug}-${room.slug}`;
    const messages: EditorialMessageSpec[] = [
      {
        key: `${prefix}-m1`,
        body: `Welcome to ${room.name}. Focus: ${room.focus}. Keep it practical and kind.`,
        daysAgo: 70 - index,
        hour: 9,
        pinned: true,
      },
      {
        key: `${prefix}-m2`,
        body: `Question: ${seed.prompts[index % seed.prompts.length]}`,
        daysAgo: 52 - index,
        hour: 11,
      },
      {
        key: `${prefix}-m3`,
        body:
          index % 2 === 0
            ? "I tried a similar approach last month. The hard part was getting the first step clear before optimizing."
            : "That matches what I have seen — constraints first, then tools.",
        daysAgo: 51 - index,
        hour: 14,
        replyToKey: `${prefix}-m2`,
      },
      {
        key: `${prefix}-m4`,
        body:
          index % 2 === 0
            ? "Would you share what you would change if you ran it again?"
            : "Any checklist you keep for newcomers in this channel?",
        daysAgo: 28 - index,
        hour: 16,
        replyToKey: `${prefix}-m3`,
      },
      {
        key: `${prefix}-m5`,
        body:
          index % 2 === 0
            ? "I would document the failure mode earlier. It saves the second week of thrash."
            : "Short welcome, one example, link to the longer Discussion post.",
        daysAgo: 27 - index,
        hour: 10,
        replyToKey: `${prefix}-m4`,
      },
    ];
    if (seed.activity !== "low") {
      messages.push({
        key: `${prefix}-m6`,
        body: `Resource note for ${seed.topic}: when you share a tip, add where it fails. That keeps the thread honest.`,
        daysAgo: 9 - Math.min(index, 8),
        hour: 15,
      });
    }
    return {
      slug: room.slug === "general" && index === 0 ? `${seed.slug}-general` : room.slug,
      name: room.name,
      description: room.focus,
      welcomeMessage: `Channel focus: ${room.focus}.`,
      messages,
    };
  });
}

function buildPosts(seed: WorldCommunitySeed): EditorialPostSpec[] {
  const budget = postBudget(seed.activity, seed.slug);
  const posts: EditorialPostSpec[] = [];
  const imageA = unsplash(seed.coverPhoto, 1200, 800);
  const imageB = unsplash(seed.avatarPhoto, 1000, 1000);

  posts.push({
    key: `${seed.slug}-welcome`,
    title: `How ${seed.name} works`,
    body: `${seed.name} is a Jimvio-managed public community about ${seed.topic}.\n\n${seed.description}\n\nPromotions appear occasionally and are labeled From Jimvio. We do not invent testimonials or earnings.`,
    postType: "discussion",
    origin: "editorial",
    daysAgo: 95,
    hour: 10,
    pinned: true,
    ...engagement(seed.slug, "welcome", seed.activity),
    comments: [
      {
        key: `${seed.slug}-welcome-c1`,
        body: "House note: disagree with ideas, cite your experience, skip fabricated claims.",
        daysAgo: 94,
        hour: 9,
      },
    ],
  });

  let i = 0;
  while (posts.length < budget - 2) {
    const prompt = seed.prompts[i % seed.prompts.length]!;
    const kind = hash(`${seed.slug}:kind:${i}`) % 10;
    // ~40% text, ~35% photo, ~15% video, remainder structured later via poll/promo
    const isPhoto = kind >= 4 && kind <= 7;
    const isVideo = kind >= 8;
    const eng = engagement(seed.slug, `p${i}`, seed.activity);
    const comments: EditorialCommentSpec[] = [];
    if (i % 3 === 0) {
      comments.push({
        key: `${seed.slug}-p${i}-c1`,
        body: "Naming the constraint first usually gets better replies than a hot take.",
        daysAgo: Math.max(1, 60 - i * 3),
        hour: 12,
      });
    }
    if (i % 4 === 0) {
      comments.push({
        key: `${seed.slug}-p${i}-c2`,
        body: "Agree — one concrete example beats three abstract principles.",
        daysAgo: Math.max(1, 59 - i * 3),
        hour: 15,
      });
    }
    if (i % 5 === 0 && seed.activity === "high") {
      comments.push({
        key: `${seed.slug}-p${i}-c3`,
        body: "Curious what you would try differently with half the time.",
        daysAgo: Math.max(1, 58 - i * 3),
        hour: 18,
      });
    }

    const post: EditorialPostSpec = {
      key: `${seed.slug}-prompt-${i}`,
      title: prompt.length > 72 ? `${prompt.slice(0, 69)}…` : prompt,
      body: `${prompt}\n\nShare what you have tried in ${seed.topic}. Prefer specifics over slogans.`,
      postType: "discussion",
      origin: "editorial",
      daysAgo: Math.max(1, 70 - i * 2),
      hour: 10 + (i % 8),
      comments,
      ...eng,
      ...(isPhoto
        ? { images: [i % 2 === 0 ? imageA : imageB] }
        : isVideo
          ? { videoUrl: SAMPLE_VIDEOS[hash(`${seed.slug}:vid:${i}`) % SAMPLE_VIDEOS.length] }
          : {}),
    };
    posts.push(post);
    i += 1;
    if (i > 60) break;
  }

  posts.push({
    key: `${seed.slug}-poll`,
    title: seed.pollQuestion,
    body: "A snapshot of how this room works — answer for your current season.",
    postType: "poll",
    origin: "editorial",
    daysAgo: 21,
    hour: 13,
    pollOptions: seed.pollOptions,
    ...engagement(seed.slug, "poll", seed.activity),
  });

  // ~1 promo per community (not spammy at world scale)
  const promo = PROMO_COPY[seed.promoHref];
  posts.push({
    key: `${seed.slug}-promo-0`,
    title: promo.title,
    body: promo.body,
    postType: "discussion",
    origin: "promotion" as JimvioContentOrigin,
    daysAgo: 6,
    hour: 12,
    href: seed.promoHref,
    ...engagement(seed.slug, "promo", "low"),
  });

  return posts;
}

export function buildWorldCommunity(seed: WorldCommunitySeed): EditorialCommunitySpec {
  const rooms = buildRooms(seed);
  const [primary, ...rest] = rooms;
  const createdDay = 10 + (hash(seed.slug) % 100);
  const createdAt = new Date(Date.UTC(2026, 2, 1 + (createdDay % 28), 9, 0, 0)).toISOString();
  return {
    slug: seed.slug,
    name: seed.name,
    tagline: seed.tagline,
    description: seed.description,
    longDescription: `${seed.description}\n\nJimvio-managed editorial programming about ${seed.topic}. Conversations are designed to feel coherent. Promotions are labeled From Jimvio.`,
    category: seed.category,
    tags: seed.tags,
    createdAt,
    welcomeTitle: `Welcome to ${seed.name}`,
    welcomeMessage: `Talk about ${seed.topic}. Be specific. Label opinions. Do not invent results or testimonials.`,
    rules: `Stay on ${seed.topic}. No fabricated claims or harassment. Mark Jimvio product links clearly. Respect all experience levels.`,
    avatarUrl: unsplash(seed.avatarPhoto, 400, 400),
    coverImage: unsplash(seed.coverPhoto, 1200, 480),
    featured: Boolean(seed.featured),
    targetMemberCount: targetMemberCountFor(seed),
    activity: seed.activity,
    extraRoom: primary!,
    extraRooms: rest,
    posts: buildPosts(seed),
  };
}

export function buildWorldCatalog(excludeSlugs: Set<string> = new Set()): EditorialCommunitySpec[] {
  return WORLD_COMMUNITY_SEEDS.filter((seed) => !excludeSlugs.has(seed.slug)).map(buildWorldCommunity);
}
