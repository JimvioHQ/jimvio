import type { Metadata } from "next";
import { marketplaceCustomerUsd } from "@/lib/marketplace/display-price";
import { notFound } from "next/navigation";
import { getProductPageData, getUserCountry, getProductBySlug } from "@/services/db";
import { deriveIsDigital } from "@/services/products";
import { loadPublicTrust } from "@/lib/digital-products/trust/service";
import { getFollowedVendorIds } from "@/lib/actions/marketplace";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { constructMetadata, truncateDescription } from "@/lib/seo";
import { getImage } from "@/lib/utils";
import { publicSku } from "@/lib/marketplace/public-sku";
import { toPublicProduct } from "@/lib/marketplace/public-product";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  const image = getImage(product.images);
  const description = truncateDescription(
    product.short_description ||
      product.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
      `Shop ${product.name} on Jimvio.`,
  );

  return constructMetadata({
    title: product.name,
    description,
    image: image.startsWith("http") ? image : image,
    path: `/marketplace/${slug}`,
    type: "product",
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Country, product data and follows load together instead of one after another.
  const [userCountry, product0, followedVendorIds] = await Promise.all([
    getUserCountry(),
    getProductBySlug(slug),
    getFollowedVendorIds().catch(() => [] as string[]),
  ]);
  if (!product0) notFound();

  const [pageData, trust] = await Promise.all([
    getProductPageData(slug, { userCountry }),
    deriveIsDigital(product0) ? loadPublicTrust(product0.id).catch(() => null) : Promise.resolve(null),
  ]);

  if (!pageData) notFound();

  // Only buyer-safe fields leave the server (no cost, supplier, file or admin data).
  const product = toPublicProduct(pageData.product);
  const relatedProducts = pageData.relatedProducts.map((related) => toPublicProduct(related));
  const { vendor, allShippingOptions, isDigital } = pageData;

  const reviews = product.reviews ?? [];
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: { rating?: number }) => sum + (r.rating ?? 0), 0) / reviewCount
      : null;

  const jsonLdProduct = {
    name: product.name,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,
    // M-7: structured data matches the USD price shown on the page.
    price: marketplaceCustomerUsd({
      price: product.price,
      price_usd: (product as { price_usd?: number | null }).price_usd,
      currency: product.currency,
    }),
    currency: "USD",
    images: product.images,
    sku: publicSku(product.sku),
    brand: vendor?.business_name ?? null,
    average_rating: averageRating,
    review_count: reviewCount,
    in_stock: true,
    reviews,
  };

  const breadcrumb = (
    <BreadcrumbJsonLd
      items={[
        { name: "Home", path: "/" },
        { name: "Marketplace", path: "/marketplace" },
        { name: product.name, path: `/marketplace/${product.slug}` },
      ]}
    />
  );

  if (isDigital) {
    const { DigitalProductDetail } = await import(
      "@/components/marketplace/product-detail-digital"
    );
    return (
      <>
        {breadcrumb}
        <ProductJsonLd product={jsonLdProduct} />
        <DigitalProductDetail
          product={product}
          vendor={vendor}
          relatedProducts={relatedProducts}
          followedVendorIds={followedVendorIds}
          trust={trust}
        />
      </>
    );
  }

  const { PhysicalProductDetail } = await import(
    "@/components/marketplace/product-detail-physical"
  );

  return (
    <>
      {breadcrumb}
      <ProductJsonLd product={jsonLdProduct} />
      <PhysicalProductDetail
        product={product}
        vendor={vendor}
        relatedProducts={relatedProducts}
        allShippingOptions={allShippingOptions}
        userCountry={pageData.userCountry}
        followedVendorIds={followedVendorIds}
      />
    </>
  );
}
