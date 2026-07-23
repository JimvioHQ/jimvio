export type {
  CreatorCampaign,
  CreatorCommunity,
  CreatorCourse,
  CreatorLevel,
  CreatorPost,
  CreatorProduct,
  CreatorProfileData,
  CreatorProfileIdentity,
  CreatorProfilePayload,
  CreatorProfileStats,
  CreatorProfileTab,
  CreatorReview,
  CreatorVideo,
} from "./types";
export {
  mapVendorToCreatorProfile,
  mapVendorProducts,
  mapVendorClipsToVideos,
  mapCommunities,
  mapInfluencerUserToCreatorProfile,
} from "./adapters";

export const CREATOR_PROFILE_TABS: Array<{ id: import("./types").CreatorProfileTab; label: string }> = [
  { id: "products", label: "Products" },
  { id: "courses", label: "Courses" },
  { id: "communities", label: "Communities" },
  { id: "ugc", label: "UGC" },
  { id: "affiliate", label: "Affiliate" },
  { id: "videos", label: "Videos" },
  { id: "posts", label: "Posts" },
  { id: "reviews", label: "Reviews" },
  { id: "contributions", label: "Contributions" },
  { id: "about", label: "About" },
];

export const CREATOR_LEVEL_LABELS: Record<import("./types").CreatorLevel, string> = {
  bronze: "Bronze Creator",
  silver: "Silver Creator",
  gold: "Gold Creator",
  platinum: "Platinum Creator",
  diamond: "Diamond Creator",
};
