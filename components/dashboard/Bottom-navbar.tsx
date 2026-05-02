"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Globe, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
    href?: string;
    icon: React.ReactNode;
    label: string;
    activeMatch?: (path: string) => boolean;
    badge?: number;       // numeric unread count
    dot?: boolean;        // simple notification dot (no count)
    onClick?: () => void;
}

// ─── Ripple ───────────────────────────────────────────────────────────────────

function useRipple() {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>();

    const trigger = (e: React.TouchEvent | React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const point =
            "touches" in e
                ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
                : { clientX: e.clientX, clientY: e.clientY };

        const x = point.clientX - rect.left;
        const y = point.clientY - rect.top;
        const id = Date.now();

        // Haptic feedback (supported on iOS/Android)
        if ("vibrate" in navigator) navigator.vibrate(8);

        setRipples((prev) => [...(prev ?? []), { id, x, y }]);
        setTimeout(() => {
            setRipples((prev) => prev?.filter((r) => r.id !== id));
        }, 550);
    };

    return { ripples, trigger };
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ count }: { count: number }) {
    return (
        <span
            className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-[3px]",
                "flex items-center justify-center",
                "rounded-full bg-[var(--color-accent)] text-white",
                "text-[9px] font-black leading-none tabular-nums",
                "ring-2 ring-[var(--color-bg)]",
                "animate-in zoom-in-50 duration-200"
            )}
        >
            {count > 99 ? "99+" : count}
        </span>
    );
}

function NotifDot() {
    return (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg)]">
            <span className="absolute inset-0 rounded-full bg-[var(--color-accent)] animate-ping opacity-60" />
        </span>
    );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function BottomNavItem({
    item,
    isActive,
}: {
    item: NavItem;
    isActive: boolean;
}) {
    const { ripples, trigger } = useRipple();
    const router = useRouter();

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        trigger(e);
        if (item.onClick) {
            item.onClick();
        } else if (item.href) {
            router.push(item.href);
        }
    };

    return (
        <button
            onMouseDown={handleInteraction}
            onTouchStart={handleInteraction}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 overflow-hidden select-none outline-none group"
        >
            {/* Ripple container */}
            {ripples?.map((r) => (
                <span
                    key={r.id}
                    className="pointer-events-none absolute rounded-full bg-[var(--color-accent)]/10 animate-[ripple_0.55s_ease-out_forwards]"
                    style={{
                        left: r.x,
                        top: r.y,
                        width: 6,
                        height: 6,
                        marginLeft: -3,
                        marginTop: -3,
                    }}
                />
            ))}

            {/* Active pill indicator */}
            <span
                className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-300",
                    isActive
                        ? "w-6 bg-[var(--color-accent)]"
                        : "w-0 bg-transparent"
                )}
            />

            {/* Icon wrapper */}
            <span className="relative">
                <span
                    className={cn(
                        "flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                        isActive
                            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] scale-105"
                            : "text-[var(--color-text-muted)] group-active:scale-90"
                    )}
                >
                    {item.icon}
                </span>

                {/* Badge or dot */}
                {item.badge && item.badge > 0 ? (
                    <Badge count={item.badge} />
                ) : item.dot ? (
                    <NotifDot />
                ) : null}
            </span>

            {/* Label */}
            <span
                className={cn(
                    "text-[10px] font-semibold tracking-wide transition-all duration-200",
                    isActive
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text-muted)]"
                )}
            >
                {item.label}
            </span>
        </button>
    );
}

// ─── Main nav ─────────────────────────────────────────────────────────────────

function useScrollDirection(threshold = 8) {
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            if (Math.abs(y - lastY.current) < threshold) return;
            setHidden(y > lastY.current && y > 60);
            lastY.current = y;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    return hidden;
}

export function BottomNav({
    unreadMessages = 0,
    hasMoreNotifications = false,
    onMoreClick,
}: {
    unreadMessages?: number;
    hasMoreNotifications?: boolean;
    onMoreClick?: () => void;
}) {
    const pathname = usePathname();
    const navHidden = useScrollDirection();

    const NAV_ITEMS: NavItem[] = [
        {
            href: "/dashboard",
            icon: <LayoutDashboard className="h-5 w-5" />,
            label: "Home",
            activeMatch: (p) => p === "/dashboard",
        },
        {
            href: "/dashboard/marketplace",
            icon: <Globe className="h-5 w-5" />,
            label: "Shop",
            activeMatch: (p) =>
                p.startsWith("/dashboard/marketplace") || p.startsWith("/marketplace"),
        },
        {
            href: "/dashboard/messages",
            icon: <MessageSquare className="h-5 w-5" />,
            label: "Inbox",
            badge: unreadMessages,
        },
        {
            icon: <MoreHorizontal className="h-5 w-5" />,
            label: "More",
            dot: hasMoreNotifications,
            onClick: onMoreClick,
        },
    ];

    return (
        <>
            {/* Ripple keyframe */}
            <style>{`
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(28);  opacity: 0; }
        }
      `}</style>

            {/* Safe-area spacer so content isn't hidden behind the nav */}
            <div className="lg:hidden h-[calc(64px+env(safe-area-inset-bottom))]" />

            <nav
                className={cn(
                    "lg:hidden fixed bottom-0 inset-x-0 z-40",
                    "bg-[var(--color-surface)]/95 backdrop-blur-md",
                    "border-t border-[var(--color-border)]",
                    "pb-[env(safe-area-inset-bottom)]",
                    "transition-transform duration-300 ease-in-out will-change-transform",
                    navHidden && "translate-y-full"
                )}
            >
                <div className="flex items-stretch h-16">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.activeMatch
                            ? item.activeMatch(pathname)
                            : item.href
                                ? pathname === item.href
                                : false;

                        return (
                            <BottomNavItem key={item.label} item={item} isActive={isActive} />
                        );
                    })}
                </div>
            </nav>
        </>
    );
}