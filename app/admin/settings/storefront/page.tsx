import { StorefrontForm } from "@/components/settings/storefront-form";
import { getPlatformSettings } from "@/lib/actions/security";

export const metadata = { title: "Storefront · Platform settings" };

export default async function StorefrontPage() {
    const settings = await getPlatformSettings();
    return <StorefrontForm initial={settings} />;
}
