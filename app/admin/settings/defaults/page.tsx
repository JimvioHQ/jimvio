import { DefaultsForm } from "@/components/settings/defaults-form";
import { getPlatformSettings } from "@/lib/actions/security";

export const metadata = { title: "Defaults · Platform settings" };

export default async function DefaultsPage() {
  const settings = await getPlatformSettings();
  return <DefaultsForm initial={settings} />;
}
