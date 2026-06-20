import type { Product, WithContext } from "schema-dts";
import { SITE } from "@/lib/seo";
import { getImage } from "@/lib/utils";

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
};

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
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : { "@type": "Brand", name: "Jimvio" },
    url: `${SITE.url}/marketplace/${product.slug}`,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/marketplace/${product.slug}`,
      priceCurrency: (product.currency ?? "USD").toUpperCase(),
      price: String(product.price ?? 0),
      availability: product.in_stock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE.name },
    },
    ...(product.average_rating && product.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(product.average_rating),
            reviewCount: String(product.review_count),
          },
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
