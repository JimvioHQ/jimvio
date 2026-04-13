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
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.07) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 pt-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-3">
             <div className="p-2 rounded-[14px] bg-white/60 border border-white/80 shadow-sm shrink-0">
               <Heart className="h-6 w-6 text-rose-500" />
             </div>
             Saved Products
          </h1>
          <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest pl-14">Products you’ve bookmarked</p>
        </div>
        <WishlistGrid initialItems={items} />
      </div>
    </div>
  );
}
