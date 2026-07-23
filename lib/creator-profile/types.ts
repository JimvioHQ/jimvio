export type CreatorProfileTab =
  | "products"
  | "courses"
  | "store"
  | "communities"
  | "ugc"
  | "affiliate"
  | "videos"
  | "posts"
  | "reviews"
  | "contributions"
  | "intelligence"
  | "about";

export type CreatorLevel = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type CreatorProfileStats = {
  followers: number;
  following: number;
  totalSales: number;
  rating: number;
  reviewCount: number;
  responseTime: string;
  productsCount: number;
  videosCount: number;
  communitiesCount: number;
};

export type CreatorProfileIdentity = {
  id: string;
  vendorId?: string;
  userId?: string;
  slug: string;
  displayName: string;
  bio: string;
  coverImage: string | null;
  avatarImage: string | null;
  isVerified: boolean;
  level: CreatorLevel;
  country: string;
  languages: string[];
  joinedAt: string | null;
  isOnline: boolean;
  lastActiveLabel: string;
  storeHref?: string;
};

export type CreatorProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  compareAtPrice?: number | null;
  images?: unknown;
  productType: string;
  saleCount?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  isFeatured?: boolean;
  pricingType?: string | null;
  billingPeriod?: string | null;
  createdAt?: string | null;
};

export type CreatorCommunity = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  memberCount: number;
  coverImage?: string | null;
  avatarImage?: string | null;
  isPremium: boolean;
  role: "owner" | "managed";
};

export type CreatorCourse = {
  id: string;
  title: string;
  slug: string;
  students: number;
  rating: number;
  completionRate: number;
  image?: string | null;
};

export type CreatorVideo = {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  views: number;
  kind: "short" | "live-replay" | "product" | "ugc";
  href?: string;
};

export type CreatorReview = {
  id: string;
  author: string;
  rating: number;
  content: string;
  verified: boolean;
  createdAt: string;
};

export type CreatorCampaign = {
  id: string;
  title: string;
  href: string;
  type: "ugc" | "affiliate";
  rateLabel?: string;
  status?: string;
};

export type CreatorPost = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  createdAt: string;
};

export type CreatorProfileData = {
  identity: CreatorProfileIdentity;
  stats: CreatorProfileStats;
};

export type CreatorProfilePayload = {
  profile: CreatorProfileData;
  products: CreatorProduct[];
  communities: CreatorCommunity[];
  courses: CreatorCourse[];
  videos: CreatorVideo[];
  reviews: CreatorReview[];
  ugcCampaigns: CreatorCampaign[];
  affiliateCampaigns: CreatorCampaign[];
  posts: CreatorPost[];
  isFollowing: boolean;
  cartProductIds: string[];
};
