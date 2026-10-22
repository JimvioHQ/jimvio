import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsLanguageForm } from "@/components/settings-center/SettingsLanguageForm";

export const metadata = { title: "Language & Region" };
export const dynamic = "force-dynamic";

export default async function SettingsLanguagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/settings/language")}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("language, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const preferredCurrency =
    typeof user.user_metadata?.preferred_currency === "string"
      ? user.user_metadata.preferred_currency
      : "USD";

  return (
    <SettingsLanguageForm
      language={profile?.language || "en"}
      timezone={profile?.timezone || "UTC"}
      preferredCurrency={preferredCurrency}
    />
  );
}
