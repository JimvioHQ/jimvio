
import { SettingsTabNav } from "@/components/admin/tab-nav";
import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
                <div className="px-4 py-4 sm:px-5 border-b border-[var(--color-border)]/60">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Admin · Configuration
                    </p>
                    <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] mt-1">
                        Platform settings
                    </h1>
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1 max-w-2xl">
                        Fees, supplier channels, feature flags, security, and storefront copy. Changes apply platform-wide after save.
                    </p>
                </div>
                <SettingsTabNav />
            </div>

            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4 sm:p-6">
                {children}
            </div>
        </div>
    );
}
