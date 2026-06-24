import { PaymentsSettingsForm } from "@/components/settings/payments-form";
import { getPlatformSettings } from "@/lib/actions/security";

export const metadata = { title: "Payments · Platform settings" };

export default async function PaymentsSettingsPage() {
  const settings = await getPlatformSettings();
  return <PaymentsSettingsForm initial={settings} />;
}
