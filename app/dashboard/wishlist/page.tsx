import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserWishlist } from "@/services/db";
import { redirect } from "next/navigation";
import { WishlistGrid } from "@/components/dashboard/wishlist-grid";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = await getUserWishlist(user.id);
  const items = (raw ?? []).map((row: any) => {
    const p = row.products;
    const product = p ? {
      ...p,
      vendors: Array.isArray(p.vendors) ? p.vendors[0] ?? null : p.vendors,
    } : null;
    return { id: row.id, created_at: row.created_at, product };
  }).filter((item) => item.product != null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Saved Products</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Products you’ve bookmarked</p>
      </div>
      <WishlistGrid initialItems={items} />
    </div>
  );
}
