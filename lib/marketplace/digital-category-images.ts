/**
 * Digital category art uses the first licensed photo already curated for the
 * matching key in lib/community/photo-content/catalog.ts.
 * The unit test keeps these ids aligned with that catalog.
 * A database image_url still wins. Lifestyle and culture have no close key.
 */

const SLUG_TO_PHOTO_ID: Record<string, string> = {
  "digital-education-learning": "photo-1434030216411-0b793f4b4173",
  "digital-business-entrepreneurship": "photo-1454165804606-c3d57bc86b40",
  "digital-marketing-sales": "photo-1432888622747-4eb9a8f2c1c5",
  "digital-design-creative": "photo-1561070791-2526d30994b5",
  "digital-photography-video": "photo-1452587925148-ce544e77e293",
  "digital-music-audio": "photo-1470225620780-dba8ba36b745",
  "digital-software-technology": "photo-1518770660439-4636190af475",
  "digital-ai-automation": "photo-1677442136019-21780ecad995",
  "digital-finance-investing": "photo-1554224155-6726b3ff858f",
  "digital-health-fitness": "photo-1505576399279-565b52d4ac71",
  "digital-creator-influencer": "photo-1492691527719-9d1e07e534b4",
  "digital-ebooks-publications": "photo-1434030216411-0b793f4b4173",
  "digital-documents-templates": "photo-1561070791-2526d30994b5",
  "digital-memberships-access": "photo-1454165804606-c3d57bc86b40",
  "digital-events-experiences": "photo-1478720568477-152d9b164e26",
  "digital-games-entertainment": "photo-1511512578047-dfb367046420",
  "digital-art-collectibles": "photo-1561070791-2526d30994b5",
  "digital-other": "photo-1522202176988-66273c2fd55f",
};

function licensedCrop(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=960&q=85&fm=jpg`;
}

export function digitalCategoryPhotoUrl(slug: string | null | undefined): string | null {
  const photoId = SLUG_TO_PHOTO_ID[(slug ?? "").trim()];
  return photoId ? licensedCrop(photoId) : null;
}
