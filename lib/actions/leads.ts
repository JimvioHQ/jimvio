"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BuyingLeadForm = {
  product_name: string;
  category: string;
  quantity_needed: number;
  budget_min?: number;
  budget_max?: number;
  delivery_country: string;
  description: string;
};

export async function createBuyingLead(form: BuyingLeadForm) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { error } = await supabase.from("buying_requests").insert({
      buyer_id: user.id,
      product_name: form.product_name.trim(),
      category: form.category.trim() || null,
      quantity_needed: form.quantity_needed,
      budget_min: form.budget_min ?? null,
      budget_max: form.budget_max ?? null,
      delivery_country: form.delivery_country.trim() || null,
      description: form.description.trim() || null,
      status: "open",
    });

    if (error) throw error;
    revalidatePath("/dashboard/requests");
    return { success: true };
  } catch (e: any) {
    console.error("createBuyingLead:", e);
    return { success: false, error: e.message ?? "Failed to post lead" };
  }
}

export async function getBuyerLeads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("buying_requests")
    .select(`
      id, product_name, category, quantity_needed, budget_min, budget_max,
      delivery_country, description, status, created_at,
      buying_lead_offers ( id, message, offered_price, status, created_at, vendors ( business_name, business_slug ) )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
