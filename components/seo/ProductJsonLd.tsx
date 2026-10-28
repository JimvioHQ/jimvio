import type { Product, Review, WithContext } from "schema-dts";
import { SITE } from "@/lib/seo";
import { getImage } from "@/lib/utils";

type ProductReviewInput = {
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
  buyer?: { full_name?: string | null } | null;
};

type ProductJsonLdInput = {
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  price?: number | null;
  currency?: string | null;
  images?: unknown;
  sku?: string | null;
  brand?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean;
  reviews?: ProductReviewInput[];
};

function toReviewSchema(review: ProductReviewInput, productName: string): Review {
  const authorName = review.buyer?.full_name?.trim() || "Jimvio buyer";
  return {
    "@type": "Review",
    author: { "@type": "Person", name: authorName },
    datePublished: review.created_at ?? undefined,
    name: review.title?.trim() || `Review of ${productName}`,
    reviewBody: review.body?.trim() || undefined,
    reviewRating: review.rating
      ? {
          "@type": "Rating",
          ratingValue: String(review.rating),
          bestRating: "5",
          worstRating: "1",
        }
      : undefined,
  };
}

export function ProductJsonLd({ product }: { product: ProductJsonLdInput }) {
  const image = getImage(product.images);
  const absoluteImage = image.startsWith("http") ? image : `${SITE.url}${image}`;
  const description =
    product.short_description?.trim() ||
    product.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) ||
    `${product.name} — sold on Jimvio.`;

  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: absoluteImage,
    sku: product.sku ?? product.slug,
    // No invented brand: only a real brand or seller name is emitted.
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    url: `${SITE.url}/marketplace/${product.slug}`,
    ...(product.price == null || !Number.isFinite(Number(product.price))
      ? {}
      : { offers: {
      "@type": "Offer",
      url: `${SITE.url}/marketplace/${product.slug}`,
      priceCurrency: (product.currency ?? "USD").toUpperCase(),
      price: String(product.price),
      availability: product.in_stock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE.name },
    } }),
    ...(product.average_rating && product.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(product.average_rating),
            reviewCount: String(product.review_count),
          },
        }
      : {}),
    ...(product.reviews?.length
      ? {
          review: product.reviews
            .filter((r) => r.rating && (r.body || r.title))
            .slice(0, 10)
            .map((r) => toReviewSchema(r, product.name)),
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
