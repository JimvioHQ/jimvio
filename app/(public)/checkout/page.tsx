// import React from "react";
// import { redirect } from "next/navigation";
// import { getCart } from "@/lib/actions/marketplace";
// import { createClient } from "@/lib/supabase/server";
// import { CheckoutExperience } from "@/components/checkout/checkout-experience";

// export const dynamic = "force-dynamic";

// export default async function CheckoutPage(props: { searchParams: Promise<{ order_id?: string }> }) {
//   const searchParams = await props.searchParams;
//   const orderId = searchParams.order_id;

//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) {
//     redirect(`/login?next=/checkout${orderId ? `?order_id=${orderId}` : ''}`);
//   }

//   let finalOrders: any[] = [];

//   if (orderId) {
//     const { data: order, error } = await supabase
//       .from("orders")
//       .select(`
//         *,
//         vendors (id, business_name, business_slug),
//         order_items (*)
//       `)
//       .eq("id", orderId)
//       .eq("buyer_id", user.id)
//       .single();

//     if (!error && order) {
//       finalOrders = [order];
//     }
//   } else {
//     const { orders } = await getCart();
//     finalOrders = orders;
//   }

//   if (!finalOrders?.length) {
//     redirect("/cart");
//   }

//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("full_name, email, phone")
//     .eq("id", user.id)
//     .single();

//   const normalized = finalOrders.map((o: Record<string, unknown>) => ({
//     ...o,
//     vendors: Array.isArray(o.vendors) ? o.vendors[0] : o.vendors,
//   }));

//   const isCommunity = normalized.some((o: any) => o.integration_source === "community");

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6">
//         <CheckoutExperience
//           orders={normalized as never}
//           profile={profile}
//           mode={isCommunity ? "community" : "cart"}
//         />
//       </div>
//     </div>
//   );
// }

import React from "react";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/actions/marketplace";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";

export const dynamic = "force-dynamic";

export default async function CheckoutPage(props: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/checkout${orderId ? `?order_id=${orderId}` : ""}`);
  }

  let finalOrders: any[] = [];

  if (orderId) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        vendors (id, business_name, business_slug),
        order_items (
          *,
          product_variants (cj_vid, cj_pid, weight, length, width, height)
        )
      `)
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (!error && order) {
      finalOrders = [order];
    }
  } else {
    const { orders } = await getCart();
    finalOrders = orders;
  }

  if (!finalOrders?.length) {
    redirect("/cart");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  // Normalize vendors (Supabase returns array for joined tables)
  // Also flatten product_variants fields into order_items for CJ
  const normalized = finalOrders.map((o: Record<string, unknown>) => ({
    ...o,
    vendors: Array.isArray(o.vendors) ? o.vendors[0] : o.vendors,
    order_items: Array.isArray(o.order_items)
      ? (o.order_items as any[]).map((item) => {
        const variant = Array.isArray(item.product_variants)
          ? item.product_variants[0]
          : item.product_variants;
        return {
          ...item,
          cj_vid: variant?.cj_vid ?? null,
          cj_pid: variant?.cj_pid ?? null,
          variant_weight: variant?.weight ?? null,
          variant_length: variant?.length ?? null,
          variant_width: variant?.width ?? null,
          variant_height: variant?.height ?? null,
          product_variants: undefined, // clean up nested object
        };
      })
      : o.order_items,
  }));

  const isCommunity = normalized.some(
    (o: any) => o.integration_source === "community"
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={normalized as never}
          profile={profile}
          mode={isCommunity ? "community" : "cart"}
        />
      </div>
    </div>
  );
}