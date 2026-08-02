import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { IdentityAnalyticsPanel } from "@/components/identity/IdentityAnalyticsPanel";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function IdentityAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/analytics")}`);
  }

  const identity = await getIdentityByUserId(user.id, user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        {identity?.profile.username && (
          <Link
            href={`/u/${identity.profile.username}`}
            className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7C766B] hover:text-[#1C1B19]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
          </Link>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Analytics
        </h1>
        <p className="mt-1 text-[13.5px] text-[#8B8579]">
          Your cross-surface performance — UGC, affiliate, marketplace, social and community, in one view.
        </p>
      </div>

      <IdentityAnalyticsPanel />
    </div>
  );
}
