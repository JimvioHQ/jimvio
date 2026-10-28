import type { Metadata } from "next";
import { marketplaceCustomerUsd } from "@/lib/marketplace/display-price";
import { notFound } from "next/navigation";
import { getProductPageData, getUserCountry, getProductBySlug } from "@/services/db";
import { loadPublicTrust } from "@/lib/digital-products/trust/service";
import { getFollowedVendorIds } from "@/lib/actions/marketplace";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { constructMetadata, truncateDescription } from "@/lib/seo";
import { getImage } from "@/lib/utils";

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

  const userCountry = await getUserCountry();

  const [pageData, followedVendorIds] = await Promise.all([
    getProductPageData(slug, { userCountry }),
    getFollowedVendorIds().catch(() => [] as string[]),
  ]);

  if (!pageData) notFound();

  const { product, vendor, relatedProducts, allShippingOptions, isDigital } = pageData;
  const trust = isDigital ? await loadPublicTrust(product.id).catch(() => null) : null;

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
    sku: product.sku,
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
