import { getAuthMethods } from "@/lib/auth/actions";
import { SettingsConnectedPanel } from "@/components/settings-center/SettingsConnectedPanel";

export const metadata = { title: "Connected Accounts" };
export const dynamic = "force-dynamic";

export default async function SettingsConnectedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const methods = await getAuthMethods();

  return (
    <SettingsConnectedPanel
      methods={methods}
      linkError={params.error === "link_failed" ? "Google could not be connected. Try again." : null}
    />
  );
}
