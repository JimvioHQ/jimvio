import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserWishlist } from "@/services/db";
import { redirect } from "next/navigation";
import { WishlistGrid } from "@/components/dashboard/wishlist-grid";

import { Heart } from "lucide-react";

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
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{ background: "#f8f7f5" }}
    >
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10 px-4 sm:px-6 pt-6 sm:pt-12 relative z-10">
        <div className="flex items-center gap-4">
           <div className="p-2.5 rounded-2xl bg-white border border-stone-50 shadow-sm shrink-0">
              <Heart className="h-6 w-6 text-rose-500 fill-rose-500/10" />
           </div>
           <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Saved Items</h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-widest leading-none pl-0.5 opacity-80">
                 Manage your bookmarked marketplace products
              </p>
           </div>
        </div>
        <WishlistGrid initialItems={items} />
      </div>
    </div>
  );
}
