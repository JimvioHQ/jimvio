import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIdentityByUserId } from "@/lib/identity/resolve";
import { IdentityEditClient } from "@/components/identity/IdentityEditClient";

export const dynamic = "force-dynamic";

export default async function IdentityEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/identity/edit")}`);
  }

  const payload = await getIdentityByUserId(user.id, user.id);
  if (!payload) {
    redirect("/dashboard");
  }

  return <IdentityEditClient initialPayload={payload} />;
}
