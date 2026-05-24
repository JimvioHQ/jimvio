
import { CommerceForm } from "@/components/settings/commerce-form"
import { getPlatformSettings } from "@/lib/actions/security"

export const metadata = { title: "Commerce · Platform settings" }

export default async function CommercePage() {
    const settings = await getPlatformSettings()
    return <CommerceForm initial={settings} />
}