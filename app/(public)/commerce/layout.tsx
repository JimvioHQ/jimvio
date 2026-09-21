import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { CommerceShell } from "@/components/commerce-os/commerce-shell";

export default async function CommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user: authUser },
  } = await getCachedUser();

  if (!authUser) {
    redirect("/login?next=/commerce");
  }

  let user:
    | { name: string; avatarUrl?: string | null; isPremium?: boolean }
    | undefined;

  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", authUser.id)
      .maybeSingle();
    user = {
      name:
        profile?.full_name ??
        authUser.user_metadata?.full_name ??
        authUser.email?.split("@")[0] ??
        "Merchant",
      avatarUrl: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
    };
  } catch {
    user = {
      name:
        authUser.user_metadata?.full_name ??
        authUser.email?.split("@")[0] ??
        "Merchant",
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
    };
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] text-sm text-[#6B7280]">
          Loading Commerce…
        </div>
      }
    >
      <CommerceShell user={user}>{children}</CommerceShell>
    </Suspense>
  );
}
