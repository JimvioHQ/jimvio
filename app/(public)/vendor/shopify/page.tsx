import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopifyConnectForm } from "@/components/vendor/ShopifyConnectForm";

export const dynamic = "force-dynamic";

export default async function VendorShopifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/vendor/shopify");
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isVendor = roles?.some((r) => r.role === "vendor") ?? false;
  if (!isVendor) {
    redirect("/dashboard");
  }

  const { data: vendor, error } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
  if (error || !vendor) {
    redirect("/dashboard/activate/vendor");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[640px] mx-auto px-4">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] text-center mb-2">Connect your Shopify store</h1>
        <p className="text-sm text-[var(--color-text-secondary)] text-center mb-10">
          Sync products automatically and fulfill orders from Jimvio
        </p>
        <ShopifyConnectForm vendorId={vendor.id} />
      </div>
    </div>
  );
}

