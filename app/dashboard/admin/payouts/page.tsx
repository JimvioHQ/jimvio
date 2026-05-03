import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPayoutsDashboard } from "@/components/admin/admin-payouts-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard/admin/payouts");
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  if (!isAdmin) {
    redirect("/");
  }

  return <AdminPayoutsDashboard />;
}

