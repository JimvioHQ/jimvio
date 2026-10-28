/**
 * The seven Digital Marketplace category cards.
 * Each visible name maps to an existing product_categories slug.
 * Images come from digitalCategoryPhotoUrl so the client does not import the photo catalog.
 */

export type DigitalShopCategory = {
  name: string;
  slug: string;
};

export const DIGITAL_SHOP_CATEGORIES: readonly DigitalShopCategory[] = [
  { name: "Courses & Education", slug: "digital-education-learning" },
  { name: "Ebooks", slug: "digital-ebooks-publications" },
  { name: "Templates", slug: "digital-documents-templates" },
  { name: "AI Tools", slug: "digital-ai-automation" },
  { name: "SaaS Products", slug: "digital-software-technology" },
  { name: "Creator Resources", slug: "digital-creator-influencer" },
  { name: "Design Assets", slug: "digital-design-creative" },
] as const;

export function isDigitalShopCategorySlug(slug: string | null | undefined): boolean {
  return DIGITAL_SHOP_CATEGORIES.some((category) => category.slug === slug);
}
