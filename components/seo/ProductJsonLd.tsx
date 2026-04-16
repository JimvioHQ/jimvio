import { Product, Offer } from "schema-dts";

interface ProductJsonLdProps {
  product: {
    name: string;
    description?: string;
    images?: string[];
    price: number;
    currency: string;
    vendorName?: string;
    sku?: string;
    availability?: string;
  };
  siteUrl: string;
}

export const ProductJsonLd = ({ product, siteUrl }: ProductJsonLdProps) => {
  const jsonLd: Product = {
    "@type": "Product",
    "name": product.name,
    "description": product.description || `Buy ${product.name} on Jimvio B2B Marketplace.`,
    "image": product.images || [],
    "sku": product.sku,
    "brand": {
      "@type": "Brand",
      "name": product.vendorName || "Jimvio"
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": product.currency,
      "availability": (product.availability as "https://schema.org/InStock") || "https://schema.org/InStock",
      "url": `${siteUrl}/products/${product.name.toLowerCase().replace(/ /g, '-')}`, // Usually we'd use the slug but fallback
      "seller": {
        "@type": "Organization",
        "name": product.vendorName || "Jimvio"
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};
