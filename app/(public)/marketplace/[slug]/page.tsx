import { notFound } from "next/navigation";
import { getProductPageData, getUserCountry } from "@/services/db";
import { getFollowedVendorIds } from "@/lib/actions/marketplace";
import { DigitalProductDetail } from "@/components/marketplace/product-detail-digital";
import { PhysicalProductDetail } from "@/components/marketplace/product-detail-physical";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const userCountry = await getUserCountry();

  const [pageData, followedVendorIds] = await Promise.all([
    getProductPageData(slug, { userCountry }),
    getFollowedVendorIds().catch(() => [] as string[]),
  ]);

  if (!pageData) notFound();

  const { product, vendor, relatedProducts, shippingOptions, isDigital } = pageData;

  if (isDigital) {
    return (
      <DigitalProductDetail
        product={product}
        vendor={vendor}
        followedVendorIds={followedVendorIds}
      />
    );
  }

  return (
    <PhysicalProductDetail
      product={product}
      vendor={vendor}
      relatedProducts={relatedProducts}
      shippingOptions={shippingOptions}
      userCountry={userCountry}
      followedVendorIds={followedVendorIds}
    />
  );
}