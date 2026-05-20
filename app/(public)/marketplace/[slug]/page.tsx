// import { getProductBySlug, getTrendingProducts } from "@/services/db";
// import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
// import { createClient } from "@/lib/supabase/server"; // adjust import to your setup
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

//   let userCountry = "RW";
//   try {
//     const supabase = await createClient();
//     const {
//       data: { user },
//     } = await supabase.auth.getUser();
//     if (user) {
//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("country")
//         .eq("id", user.id)
//         .maybeSingle();
//       if (profile?.country) userCountry = profile.country;
//     }
//   } catch {
//     // non-fatal — keep default
//   }

//   const [relatedProducts, followedVendorIds] = await Promise.all([
//     getTrendingProducts(4),
//     // cartProductIds removed — PhysicalProductDetail no longer needs it
//     getFollowedVendorIds().catch(() => [] as string[]),
//   ]);

//   const vendor = product.vendors ?? null;
//   const isDigital = product.product_type === "digital" || product.is_digital;

//   const rawShippingOptions: any[] = product.product_shipping_options ?? [];
//   const activeShippingOptions = rawShippingOptions.filter((o) => o.is_active);

//   const countryOptions = activeShippingOptions.filter(
//     (o) => o.ship_to_country === userCountry,
//   );
//   const shippingOptions = countryOptions.length > 0 ? countryOptions : activeShippingOptions;

//   if (isDigital) {
//     return (
//       <DigitalProductDetail
//         product={product}
//         vendor={vendor}
//         followedVendorIds={followedVendorIds}
//       />
//     );
//   }

//   return (
//     <PhysicalProductDetail
//       product={product}
//       vendor={vendor}
//       relatedProducts={relatedProducts}
//       shippingOptions={shippingOptions}
//       userCountry={userCountry}
//       followedVendorIds={followedVendorIds}
//     />
//   );
// }

// app/marketplace/[slug]/page.tsx
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