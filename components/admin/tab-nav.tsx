"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Coins, Truck, ToggleLeft, ShieldCheck, Store, UserRound,
} from "lucide-react"

const TABS = [
    {
        href: "/admin/settings/profile", label: "Profile", icon: UserRound,
        description: "Your admin account"
    },
    {
        href: "/admin/settings/commerce", label: "Commerce", icon: Coins,
        description: "Fees, defaults, pricing"
    },
    {
        href: "/admin/settings/suppliers", label: "Suppliers", icon: Truck,
        description: "Vendor channels"
    },
    {
        href: "/admin/settings/features", label: "Features", icon: ToggleLeft,
        description: "Flags and fraud rules"
    },
    {
        href: "/admin/settings/security", label: "Security", icon: ShieldCheck,
        description: "Access and 2FA"
    },
    {
        href: "/admin/settings/storefront", label: "Storefront", icon: Store,
        description: "Marketing and contact"
    },
] as const

export function SettingsTabNav() {
    const pathname = usePathname()

    return (
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-none" aria-label="Settings sections">
            {TABS.map(tab => {
                const active = pathname.startsWith(tab.href)
                const Icon = tab.icon
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={cn(
                            "group inline-flex items-center gap-2 px-4 py-3 text-sm font-medium",
                            "border-b-2 transition-all whitespace-nowrap relative",
                            active
                                ? "border-[var(--color-accent,#fd5000)] text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        aria-current={active ? "page" : undefined}
                    >
                        <Icon
                            className={cn(
                                "size-4 shrink-0 transition-transform",
                                active && "scale-110"
                            )}
                            style={{ color: active ? "var(--color-accent, #fd5000)" : undefined }}
                        />
                        <span>{tab.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}