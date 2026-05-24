
import { SettingsTabNav } from "@/components/admin/tab-nav"
import { ReactNode } from "react"
export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                    {/* Title row */}
                    <div className="py-6">
                        <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                            Platform settings
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage fees, features, security, and integrations across your marketplace.
                        </p>
                    </div>

                    {/* Tabs */}
                    <SettingsTabNav />
                </div>
            </header>

            {/* Body */}
            <main className="max-w-6xl mx-auto px-6 md:px-10 py-8">
                {children}
            </main>
        </div>
    )
}