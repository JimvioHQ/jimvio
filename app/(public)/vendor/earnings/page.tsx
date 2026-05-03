import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorEarningsDashboard } from "@/components/vendor/vendor-earnings-dashboard";

export const dynamic = "force-dynamic";

export default async function VendorEarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/vendor/earnings");
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
      <VendorEarningsDashboard />
    </div>
  );
}

