import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { MerchantShell } from "@/components/dropshipping/merchant-shell";

export default async function DropshippingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/commerce");
  }

  return <MerchantShell>{children}</MerchantShell>;
}
