import type { ParsedCampaign, ParsedCommunity, ParsedPost, ParsedProduct } from "@/lib/ai/chat-shared";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { normalizeHashtagQuery } from "@/lib/feed/hashtag-query";

export type DiscoveryKind = "products" | "communities" | "campaigns" | "posts";

export type DiscoveryRequest = {
  kind: DiscoveryKind;
  path: string;
  label: string;
};

export type DiscoveryCards = {
  products?: ParsedProduct[];
  communities?: ParsedCommunity[];
  campaigns?: ParsedCampaign[];
  posts?: ParsedPost[];
};

const TERM_STOP = new Set([
  "show", "me", "the", "a", "an", "some", "please", "find", "discover", "browse", "recommend",
  "trending", "popular", "hot", "most", "viewed", "products", "product", "communities", "community",
  "posts", "post", "campaigns", "campaign", "ugc", "in", "on", "for", "about", "of", "jimvio", "what",
  "is", "are", "with", "to", "list", "active", "public", "this", "topic", "category", "help", "my",
  "interests", "interest", "creators", "creator", "relevant", "ndashaka", "nyereka", "ibicuruzwa",
  "bigezweho", "bikunzwe", "imiryango", "umuryango", "can", "you", "want", "looking", "and", "or",
]);

const PRODUCT_TRENDING = "Ordered by stored view count.";
const PRODUCT_SEARCH = "Name search, then stored view count.";
const COMMUNITY_TRENDING = "Public communities ordered by stored post count.";
const CAMPAIGN_POPULAR = "Ordered by stored submission count.";
const CAMPAIGN_SEARCH = "Title search, then stored submission count.";
const POST_TRENDING = "Public feed posts for the trending filter. Stored like and comment counts only. Private rooms are not included.";
const POST_TAG = "Public posts that include this hashtag. Private rooms are not included.";

function specificTerm(message: string): string {
  const words = message
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !TERM_STOP.has(word.toLowerCase()));
  return words.slice(0, 6).join(" ").slice(0, 60);
}

function blocksCatalog(text: string): boolean {
  const privateAsk = /\b(password|ticket|refund|wallet|payout|orders?|sign[\s-]?in|login|api key|secret|verification)\b/i.test(text);
  if (!privateAsk) return false;
  return !(/\b(trending|popular|ibicuruzwa|bigezweho)\b/i.test(text)
    || /\b(show|find|discover)\b.{0,40}\b(products?|communities|campaigns?|posts?)\b/i.test(text));
}

function productIntent(text: string): boolean {
  if (/\bibicuruzwa\b/i.test(text)) return true;
  if (/\b(trending|popular|most viewed)\b.{0,40}\bproducts?\b/i.test(text)) return true;
  if (/\bproducts?\b.{0,40}\b(trending|popular)\b/i.test(text)) return true;
  if (/\b(show|find|discover|browse)\b.{0,40}\bproducts?\b/i.test(text)) return true;
  if (/^(find|show|search)\s+\S+/i.test(text) && !/\b(community|communities|posts?|campaigns?|creators?|ticket|password|orders?)\b/i.test(text)) {
    return true;
  }
  return false;
}

function communityIntent(text: string): boolean {
  if (/\btrending in the community\b/i.test(text)) return true;
  if (/\b(trending|popular)\b.{0,40}\b(community|communities)\b/i.test(text)) return true;
  if (/\b(show|find|discover|browse)\b.{0,40}\b(community|communities)\b/i.test(text)) return true;
  if (/\b(imiryango|umuryango)\b/i.test(text) && /\b(bigezweho|bikunzwe|show|find|ndashaka)\b/i.test(text)) return true;
  return false;
}

function postIntent(text: string): boolean {
  return /\bposts?\b/i.test(text) && /\b(find|show|search|trending|popular|about)\b/i.test(text);
}

function campaignIntent(text: string): boolean {
  if (/\b(trending|popular)\b.{0,40}\bcampaigns?\b/i.test(text)) return true;
  if (/\b(show|find|discover|browse)\b.{0,40}\bcampaigns?\b/i.test(text)) return true;
  if (/\b(show|find|discover)\b.{0,40}\bcreators?\b/i.test(text)) return true;
  return false;
}

function requestPath(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${base}?${search.toString()}`;
}

/** Decide which public catalogs a chat message may show. How-to and account questions return nothing. */
export function planDiscovery(message: string): DiscoveryRequest[] {
  const text = message.trim();
  if (!text || text.length > 500 || blocksCatalog(text)) return [];
  const term = specificTerm(text);
  const requests: DiscoveryRequest[] = [];
  if (productIntent(text)) {
    const params: Record<string, string> = { sort: "trending", limit: "4" };
    if (term) params.q = term;
    requests.push({
      kind: "products",
      path: requestPath("/api/products", params),
      label: term ? PRODUCT_SEARCH : PRODUCT_TRENDING,
    });
  }
  if (communityIntent(text)) {
    const params: Record<string, string> = { sort: "trending", limit: "4" };
    if (term) params.search = term;
    requests.push({
      kind: "communities",
      path: requestPath("/api/communities", params),
      label: term ? `${COMMUNITY_TRENDING} Matching the search.` : COMMUNITY_TRENDING,
    });
  }
  if (postIntent(text)) {
    const tag = term ? normalizeHashtagQuery(term) : null;
    const trending = /\b(trending|popular)\b/i.test(text) && !tag;
    if (tag) {
      requests.push({
        kind: "posts",
        path: requestPath("/api/posts/feed", { tag, limit: "4" }),
        label: `${POST_TAG} #${tag}.`,
      });
    } else if (trending) {
      requests.push({
        kind: "posts",
        path: requestPath("/api/posts/feed", { filter: "trending", limit: "4" }),
        label: POST_TRENDING,
      });
    }
  }
  if (campaignIntent(text)) {
    const params: Record<string, string> = { sort: "popular", limit: "4" };
    if (term) params.q = term;
    requests.push({
      kind: "campaigns",
      path: requestPath("/api/ugc/campaigns", params),
      label: term ? CAMPAIGN_SEARCH : CAMPAIGN_POPULAR,
    });
  }
  return requests;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rowsFrom(payload: unknown, key: string): Record<string, unknown>[] {
  const body = asRecord(payload);
  const rows = body?.[key];
  if (!Array.isArray(rows)) return [];
  return rows.map(asRecord).filter((row): row is Record<string, unknown> => row !== null).slice(0, 4);
}

function textField(value: unknown, max = 140): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > max) return null;
  return cleaned;
}

function safeId(value: unknown): string | null {
  const id = textField(value, 80);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
}

function safeSlug(value: unknown): string | undefined {
  const slug = textField(value, 120);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return undefined;
  return slug;
}

function safeImage(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value.find((item) => typeof item === "string") : value;
  if (typeof candidate !== "string" || !/^https?:\/\//i.test(candidate)) return null;
  if (candidate.length > 400) return null;
  return candidate;
}

function finiteCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function listedPrice(price: unknown, currency: unknown): string {
  const amount = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(amount)) return "Price unavailable";
  const code = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : null;
  if (!code) return String(amount);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

function withCount(label: string, name: string, count: number | null): string {
  return count === null ? label : `${label} ${name}: ${count}.`;
}

export function mapProductPayload(payload: unknown, label: string): ParsedProduct[] {
  return rowsFrom(payload, "data").flatMap((row) => {
    const id = safeId(row.id);
    const name = textField(row.name, 160);
    if (!id || !name) return [];
    const rate = finiteCount(row.affiliate_commission_rate);
    const views = finiteCount(row.view_count);
    return [{
      id,
      name,
      slug: safeSlug(row.slug),
      image: safeImage(row.images),
      price: listedPrice(row.price, row.currency),
      mqo: "",
      commission: row.affiliate_enabled === true && rate !== null && rate <= 100 ? `${rate}%` : null,
      basis: withCount(label, "Stored view count", views),
    }];
  });
}

export function mapCommunityPayload(payload: unknown, label: string): ParsedCommunity[] {
  return rowsFrom(payload, "communities").flatMap((row) => {
    if (!communityIsPubliclyDiscoverable({
      is_active: row.is_active as boolean | null | undefined,
      is_private: row.is_private as boolean | null | undefined,
      visibility: typeof row.visibility === "string" ? row.visibility : null,
      visibility_mode: typeof row.visibility_mode === "string" ? row.visibility_mode : null,
      archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
    })) return [];
    const id = safeId(row.id);
    const name = textField(row.name, 160);
    if (!id || !name) return [];
    const members = finiteCount(row.member_count);
    const posts = finiteCount(row.post_count);
    return [{
      id,
      name,
      slug: safeSlug(row.slug),
      members: members === null ? "Not listed" : String(members),
      avatar: safeImage(row.avatar_url) ?? safeImage(row.cover_image),
      tagline: textField(row.tagline, 160),
      basis: withCount(label, "Stored post count", posts),
    }];
  });
}

export function postSearchLimitation(message: string): string | null {
  const text = message.trim();
  if (!text || !postIntent(text) || blocksCatalog(text)) return null;
  if (planDiscovery(text).some((item) => item.kind === "posts")) return null;
  return "Jimvio cannot search every room for that phrase. A single public hashtag such as #phones can be matched on the public feed. Private rooms stay hidden, and no post was searched as a private room post.";
}

export function discoveryPreface(message: string): string | null {
  return postSearchLimitation(message) ?? planDiscovery(message).find((item) => item.kind === "posts")?.label ?? null;
}

export function mapPostPayload(payload: unknown, label: string): ParsedPost[] {
  return rowsFrom(payload, "posts").flatMap((row) => {
    if (row.is_exclusive === true) return [];
    const audience = typeof row.audience === "string" ? row.audience : "";
    if (audience === "followers" || audience === "private") return [];
    const community = asRecord(row.communities);
    if (community && !communityIsPubliclyDiscoverable({
      is_active: community.is_active as boolean | null | undefined,
      is_private: community.is_private as boolean | null | undefined,
      visibility: typeof community.visibility === "string" ? community.visibility : null,
      visibility_mode: typeof community.visibility_mode === "string" ? community.visibility_mode : null,
      archived_at: typeof community.archived_at === "string" ? community.archived_at : null,
    })) return [];
    const id = safeId(row.id);
    const title = textField(row.title, 140) ?? textField(row.body, 140);
    if (!id || !title) return [];
    const slug = community ? safeSlug(community.slug) : undefined;
    const likes = finiteCount(row.like_count);
    const comments = finiteCount(row.comment_count);
    const commentNote = comments === null ? "" : ` Stored comment count: ${comments}.`;
    return [{
      id,
      title,
      href: slug ? `/communities/${slug}/feed?post=${id}` : `/communities/feed?post=${id}`,
      basis: `${withCount(label, "Stored like count", likes)}${commentNote}`,
    }];
  });
}

export function mapCampaignPayload(payload: unknown, label: string): ParsedCampaign[] {
  return rowsFrom(payload, "data").flatMap((row) => {
    if (row.status !== "active") return [];
    const id = safeId(row.id);
    const title = textField(row.title, 160);
    if (!id || !title) return [];
    const submissions = finiteCount(row.submission_count);
    const fixed = row.payment_model === "fixed_per_content" ? finiteCount(row.fixed_rate) : null;
    const perView = finiteCount(row.rate_per_1k_views);
    const rate = fixed !== null
      ? `Listed fixed rate ${fixed}`
      : perView !== null
        ? `Listed rate per 1K views ${perView}`
        : "Rate on the campaign page";
    return [{
      id,
      title,
      type: textField(row.campaign_type, 40) ?? "Campaign",
      rate,
      basis: withCount(label, "Stored submission count", submissions),
    }];
  });
}

export async function resolveDiscoveryCards(
  message: string,
  fetchJson: (path: string, signal: AbortSignal) => Promise<unknown | null>,
  signal: AbortSignal,
): Promise<DiscoveryCards> {
  const requests = planDiscovery(message);
  if (!requests.length || signal.aborted) return {};
  const cards: DiscoveryCards = {};
  await Promise.all(requests.map(async (request) => {
    const payload = await fetchJson(request.path, signal);
    if (request.kind === "products") {
      const products = mapProductPayload(payload, request.label);
      if (products.length) cards.products = products;
    } else if (request.kind === "communities") {
      const communities = mapCommunityPayload(payload, request.label);
      if (communities.length) cards.communities = communities;
    } else if (request.kind === "posts") {
      const posts = mapPostPayload(payload, request.label);
      if (posts.length) cards.posts = posts;
    } else {
      const campaigns = mapCampaignPayload(payload, request.label);
      if (campaigns.length) cards.campaigns = campaigns;
    }
  }));
  return cards;
}
