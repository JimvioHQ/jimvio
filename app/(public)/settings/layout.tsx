import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsCenterShell } from "@/components/settings-center/SettingsCenterShell";
import { isSettingsPath } from "@/lib/settings/nav";

export const metadata: Metadata = {
  title: {
    template: "%s · Settings",
    default: "Settings",
  },
};

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const headerStore = await headers();
    const requested =
      headerStore.get("x-pathname") || headerStore.get("x-invoke-path") || "/settings/profile";
    const next = isSettingsPath(requested) ? requested : "/settings/profile";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsCenterShell
      account={{
        displayName: profile?.full_name?.trim() || user.email || "Account",
        email: profile?.email || user.email || "",
        avatarUrl: profile?.avatar_url ?? null,
        username: profile?.username ?? null,
      }}
    >
      {children}
    </SettingsCenterShell>
  );
}
