import { FeaturesForm } from "@/components/settings/features-form";
import { getPlatformSettings } from "@/lib/actions/security";

export const metadata = { title: "Features · Platform settings" };

export default async function FeaturesPage() {
    const settings = await getPlatformSettings();
    return <FeaturesForm initial={settings} />;
}
