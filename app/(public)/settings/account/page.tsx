import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthMethods } from "@/lib/auth/actions";
import { SettingsAccountForm } from "@/components/settings-center/SettingsAccountForm";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/account")}`);

  const methods = await getAuthMethods();

  return (
    <SettingsAccountForm
      email={user.email || ""}
      emailVerified={Boolean(user.email_confirmed_at)}
      pendingEmail={methods?.pendingEmail ?? null}
      hasPassword={Boolean(methods?.hasPassword)}
      userId={user.id}
    />
  );
}
