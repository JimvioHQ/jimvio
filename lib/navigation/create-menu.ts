import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  Layers,
  Megaphone,
  Mic,
  Package,
  Radio,
  SquarePen,
  Target,
  Users,
} from "lucide-react";

export type CreateMenuContext =
  | "global"
  | "home"
  | "marketplace"
  | "affiliates"
  | "ugc"
  | "communities";

export type CreateMenuItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Soft accent for icon chip */
  tone: "orange" | "red" | "violet" | "green" | "sky";
};

/** Canonical product upload — remounted ProductFormShell at this path. */
export const UPLOAD_PRODUCT_HREF = "/marketplace/new";
export const SELLER_HUB_HREF = "/seller/products";
export const CREATE_CAMPAIGN_HREF = "/ugc/campaign-center/create";
export const CREATE_POST_HREF = "/create/post";
export const GO_LIVE_HREF = "/communities/live";
export const CREATE_COMMUNITY_HREF = "/communities/create";

const UPLOAD_PRODUCT: CreateMenuItem = {
  id: "upload-product",
  label: "Upload Product",
  description: "Add a product to your Jimvio store",
  href: UPLOAD_PRODUCT_HREF,
  icon: Package,
  tone: "orange",
};

const CREATE_POST: CreateMenuItem = {
  id: "create-post",
  label: "Create Post",
  description: "Share a post with your community",
  href: CREATE_POST_HREF,
  icon: SquarePen,
  tone: "orange",
};

const GO_LIVE: CreateMenuItem = {
  id: "go-live",
  label: "Go Live",
  description: "Start a live session",
  href: GO_LIVE_HREF,
  icon: Radio,
  tone: "red",
};

const VOICE_ROOM: CreateMenuItem = {
  id: "voice-room",
  label: "Start Voice Room",
  description: "Start an audio conversation",
  href: GO_LIVE_HREF,
  icon: Mic,
  tone: "violet",
};

const CREATE_CAMPAIGN: CreateMenuItem = {
  id: "create-campaign",
  label: "Create Campaign",
  description: "Launch a UGC or clipping campaign",
  href: CREATE_CAMPAIGN_HREF,
  icon: Megaphone,
  tone: "orange",
};

const CREATE_COURSE: CreateMenuItem = {
  id: "create-course",
  label: "Create Course",
  description: "Build a new course listing",
  href: UPLOAD_PRODUCT_HREF,
  icon: GraduationCap,
  tone: "violet",
};

const CREATE_MISSION: CreateMenuItem = {
  id: "create-mission",
  label: "Create Mission",
  description: "Engage your community",
  href: "/communities/missions",
  icon: Target,
  tone: "orange",
};

const CREATE_SPACE: CreateMenuItem = {
  id: "create-space",
  label: "Create Space",
  description: "Build your community",
  href: CREATE_COMMUNITY_HREF,
  icon: Layers,
  tone: "green",
};

const CREATE_COMMUNITY: CreateMenuItem = {
  id: "create-community",
  label: "Create Community",
  description: "Launch a new hub",
  href: CREATE_COMMUNITY_HREF,
  icon: Users,
  tone: "green",
};

/**
 * Context-aware Create menu items.
 * Only includes destinations that exist in the app today.
 * Upload Product stays near the top on commerce surfaces.
 */
export function getCreateMenuItems(context: CreateMenuContext = "global"): CreateMenuItem[] {
  switch (context) {
    case "ugc":
      return [CREATE_CAMPAIGN, UPLOAD_PRODUCT, CREATE_POST, GO_LIVE, CREATE_COMMUNITY];
    case "communities":
      return [CREATE_POST, GO_LIVE, VOICE_ROOM, CREATE_SPACE, CREATE_MISSION, CREATE_COURSE, UPLOAD_PRODUCT];
    case "marketplace":
      return [UPLOAD_PRODUCT, CREATE_CAMPAIGN, CREATE_POST, GO_LIVE, CREATE_COURSE];
    case "affiliates":
      return [UPLOAD_PRODUCT, CREATE_POST, GO_LIVE, CREATE_CAMPAIGN];
    case "home":
    case "global":
    default:
      return [
        UPLOAD_PRODUCT,
        CREATE_POST,
        GO_LIVE,
        VOICE_ROOM,
        CREATE_CAMPAIGN,
        CREATE_COURSE,
        CREATE_MISSION,
        CREATE_SPACE,
      ];
  }
}

/** Soft chip colors for Create menu icons */
export const CREATE_MENU_TONE_CLASS: Record<CreateMenuItem["tone"], string> = {
  orange: "bg-[#fd5000]/10 text-[#fd5000]",
  red: "bg-red-50 text-red-500",
  violet: "bg-violet-50 text-violet-500",
  green: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
};
