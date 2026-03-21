import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommissionsDashboard } from "./commissions-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/admin/commissions");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
  if (!isAdmin) redirect("/");

  const platformId = process.env.JIMVIO_PLATFORM_WALLET_USER_ID;

  const { data: wallet } = platformId
    ? await supabase.from("wallets").select("available_balance, total_earned").eq("user_id", platformId).single()
    : { data: null };

  const { data: txRows } = await supabase
    .from("transactions")
    .select("id, created_at, order_id, amount, currency, status, provider, description")
    .eq("type", "platform_commission")
    .order("created_at", { ascending: false })
    .limit(500);

  const orderIds = [...new Set((txRows ?? []).map((t) => t.order_id).filter(Boolean))] as string[];
  const { data: orderRows } =
    orderIds.length > 0
      ? await supabase.from("orders").select("id, order_number").in("id", orderIds)
      : { data: [] as { id: string; order_number: string }[] };

  const orderNumById = new Map((orderRows ?? []).map((o) => [o.id, o.order_number]));

  const rows =
    txRows?.map((t) => ({
      id: t.id,
      created_at: t.created_at,
      order_id: t.order_id,
      order_number: t.order_id ? orderNumById.get(t.order_id) ?? null : null,
      amount: Number(t.amount),
      currency: t.currency || "USD",
      status: t.status || "",
      provider: t.provider,
      description: t.description,
    })) ?? [];

  return (
    <CommissionsDashboard
      initialRows={rows}
      walletBalance={wallet ? Number(wallet.available_balance) : null}
      walletTotal={wallet ? Number(wallet.total_earned) : null}
    />
  );
}
