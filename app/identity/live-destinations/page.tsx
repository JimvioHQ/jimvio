import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { IdentityLiveDestinationsClient } from "@/components/identity/IdentityLiveDestinationsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Destinations" };

export default async function IdentityLiveDestinationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/live-destinations")}`);
  }

  return <IdentityLiveDestinationsClient />;
}
