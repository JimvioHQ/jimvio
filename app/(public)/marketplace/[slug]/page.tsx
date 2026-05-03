// import { getProductBySlug, getTrendingProducts } from "@/services/db";
// import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
// import { notFound } from "next/navigation";
// import { DigitalProductDetail } from "@/components/marketplace/product-detail-digital";
// import { PhysicalProductDetail } from "@/components/marketplace/product-detail-physical";


// interface PageProps {
//   params: Promise<{ slug: string }>;
// }

// export default async function ProductDetailPage({ params }: PageProps) {
//   const { slug } = await params;
//   const product = await getProductBySlug(slug);
//   if (!product) notFound();

//   const [relatedProducts, cartProductIds, followedVendorIds] = await Promise.all([
//     getTrendingProducts(4),
//     getCartProductIds().catch(() => [] as string[]),
//     getFollowedVendorIds().catch(() => [] as string[]),
//   ]);

//   const cartSet = new Set(cartProductIds);
//   const images: string[] = product.images ?? [];
//   const vendor = product.vendors;

//   const savings =
//     product.compare_at_price && product.compare_at_price > product.price
//       ? Math.round((1 - product.price / product.compare_at_price) * 100)
//       : null;

//   const vendorProps = vendor
//     ? {
//         id: vendor.id,
//         business_name: vendor.business_name ?? null,
//         business_logo: vendor.business_logo ?? null,
//         business_slug: vendor.business_slug ?? null,
//       }
//     : null;

//   const isDigital = product.product_type === "digital" || product.is_digital;

//   return isDigital ? (
//     <DigitalProductDetail
//       product={product}
//       vendor={vendor}
//       relatedProducts={relatedProducts}
//       cartSet={cartSet}
//       followedVendorIds={followedVendorIds}
//     />
//   ) : (
//     <PhysicalProductDetail
//       product={product}
//       vendor={vendor}
//       relatedProducts={relatedProducts}
//       cartSet={cartSet}
//       followedVendorIds={followedVendorIds}
//     />
//   );
// }

import { getProductBySlug, getTrendingProducts } from "@/services/db";
import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
import { notFound } from "next/navigation";
import { DigitalProductDetail } from "@/components/marketplace/product-detail-digital";
import { PhysicalProductDetail } from "@/components/marketplace/product-detail-physical";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // FIX: DigitalProductDetail no longer accepts relatedProducts or cartSet.
  // PhysicalProductDetail may still need them — kept in the fetch for that path.
  const [relatedProducts, cartProductIds, followedVendorIds] = await Promise.all([
    getTrendingProducts(4),
    getCartProductIds().catch(() => [] as string[]),
    getFollowedVendorIds().catch(() => [] as string[]),
  ]);

  const cartSet = new Set(cartProductIds);
  const vendor = product.vendors ?? null;
  const isDigital = product.product_type === "digital" || product.is_digital;

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
      cartSet={cartSet}
      followedVendorIds={followedVendorIds}
    />
  );
}