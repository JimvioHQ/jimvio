// app/admin/settings/security/page.tsx
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { check2FAStatus, getSessions } from "@/lib/actions/security"
import { SecurityForm } from "@/components/security/security-form"

export const metadata = {
    title: "Security · Platform settings",
}

export default async function SecurityPage() {
    // Fetch on the server so the client doesn't flash a loading state for known data
    const [status, sessions] = await Promise.allSettled([
        check2FAStatus(),
        getSessions(),
    ])

    const initialTwoFa = status.status === "fulfilled" ? status.value : { enabled: false }
    const initialSessions = sessions.status === "fulfilled" ? sessions.value : []

    return (
        <Suspense fallback={<Loader />}>
            <SecurityForm initialTwoFa={initialTwoFa} initialSessions={initialSessions} />
        </Suspense>
    )
}

function Loader() {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
    )
}