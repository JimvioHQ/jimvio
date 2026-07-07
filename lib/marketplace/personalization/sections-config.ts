import type { PersonalizedSectionId } from "./types";

export type SectionDefinition = {
  id: PersonalizedSectionId;
  title: string;
  description: string;
  viewAllHash: string;
};

export const PERSONALIZED_SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: "recommended-for-you",
    title: "Recommended For You",
    description: "Hand-picked from your browsing patterns and global trends.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "because-you-viewed",
    title: "Because You Viewed",
    description: "More items related to what you recently explored.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "trending-near-you",
    title: "Trending Near You",
    description: "Popular picks shipping to your region right now.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "popular-in-country",
    title: "Popular In Your Country",
    description: "Top sellers loved by shoppers in your area.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "recently-viewed",
    title: "Recently Viewed",
    description: "Jump back into products you checked out earlier.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "continue-shopping",
    title: "Continue Shopping",
    description: "Pick up where your cart left off.",
    viewAllHash: "/cart",
  },
  {
    id: "similar-interests",
    title: "Products Similar To Your Interests",
    description: "Inspired by your searches and categories.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "new-arrivals-for-you",
    title: "New Arrivals For You",
    description: "Fresh drops tailored to your taste.",
    viewAllHash: "#marketplace-products",
  },
  {
    id: "top-picks-today",
    title: "Top Picks Today",
    description: "Today's standout deals and crowd favorites.",
    viewAllHash: "#flash-deals-section",
  },
];

export function getSectionDefinition(id: PersonalizedSectionId) {
  return PERSONALIZED_SECTION_DEFINITIONS.find((s) => s.id === id)!;
}
