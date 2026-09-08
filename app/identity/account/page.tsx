import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdentityAccountClient } from "@/components/identity/IdentityAccountClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings" };

export default async function IdentityAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/account")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <IdentityAccountClient
      email={user.email || ""}
      language={String((profile as { language?: string } | null)?.language || "en")}
    />
  );
}
