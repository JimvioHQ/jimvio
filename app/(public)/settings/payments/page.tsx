import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPaymentsPanel } from "@/components/settings-center/SettingsPaymentsPanel";

export const metadata = { title: "Payments & Payouts" };
export const dynamic = "force-dynamic";

export default async function SettingsPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/payments")}`);

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("payout_method")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <SettingsPaymentsPanel
      affiliatePayoutMethod={
        typeof affiliate?.payout_method === "string" && affiliate.payout_method.trim()
          ? affiliate.payout_method
          : null
      }
    />
  );
}
