/**
 * Creator Commerce Engine — domain types (Phase 5).
 * Extends community workspace; never forks chat or CE backends.
 */

export const COMMERCE_KINDS = [
  "product",
  "course",
  "affiliate",
  "marketplace_item",
  "booking",
  "donation",
  "subscription",
  "coupon",
  "event_ticket",
  "digital_download",
] as const;

export type CommerceKind = (typeof COMMERCE_KINDS)[number];

export const COMMERCE_KIND_LABELS: Record<CommerceKind, string> = {
  product: "Product",
  course: "Course",
  affiliate: "Affiliate Offer",
  marketplace_item: "Marketplace Item",
  booking: "Booking",
  donation: "Donation",
  subscription: "Subscription",
  coupon: "Coupon",
  event_ticket: "Event Ticket",
  digital_download: "Digital Download",
};

export type BookingType = "call" | "mentorship" | "consulting" | "coaching";

export type DonationMode = "tip" | "one_time" | "monthly" | "support";

/** Compact commerce payload embedded in message metadata.commerce */
export type CommerceEmbed = {
  kind: CommerceKind;
  id: string;
  title: string;
  subtitle?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  imageUrl?: string | null;
  href?: string | null;
  sellerName?: string | null;
  sellerId?: string | null;
  inventory?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  discountLabel?: string | null;
  variants?: string[];
  /** Course */
  progress?: number | null;
  lessons?: number | null;
  instructor?: string | null;
  certificate?: boolean;
  /** Affiliate */
  affiliateCode?: string | null;
  commissionRate?: number | null;
  /** Booking */
  durationMinutes?: number | null;
  bookingType?: BookingType | null;
  /** Donation / membership */
  donationMode?: DonationMode | null;
  /** Coupon / ticket */
  couponCode?: string | null;
};

export type CommunityStoreItem = CommerceEmbed & {
  communityId: string;
  featured: boolean;
  createdAt: string;
  createdBy: string | null;
};

export type CreatorStoreSection =
  | "products"
  | "courses"
  | "services"
  | "bundles"
  | "memberships"
  | "affiliate_offers";

export const CREATOR_STORE_SECTIONS: {
  id: CreatorStoreSection;
  label: string;
}[] = [
  { id: "products", label: "Products" },
  { id: "courses", label: "Courses" },
  { id: "services", label: "Services" },
  { id: "bundles", label: "Bundles" },
  { id: "memberships", label: "Memberships" },
  { id: "affiliate_offers", label: "Affiliate Offers" },
];

export type AffiliateStats = {
  code: string;
  offerId: string;
  clicks: number;
  conversions: number;
  earnings: number;
};

export type CommerceBooking = {
  id: string;
  communityId: string | null;
  roomId: string | null;
  title: string;
  bookingType: BookingType;
  durationMinutes: number;
  price: number | null;
  hostName: string | null;
  startsAt: string | null;
  sourceMessageId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CommerceDonation = {
  id: string;
  communityId: string | null;
  creatorId: string | null;
  mode: DonationMode;
  amount: number;
  currency: string;
  note: string | null;
  sourceMessageId: string | null;
  createdAt: string;
};
