"use client";

import { useRouter } from "next/navigation";
import React, { createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── context ──────────────────────────────────────────────────────────────────

interface CardCtx {
    accent: string;
}
const CardContext = createContext<CardCtx>({ accent: "#fd5000" });
const useCard = () => useContext(CardContext);

interface CardShellProps {
    href?: string;
    accent?: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
}

function CardShellRoot({
    href,
    accent = "#fd5000",
    className,
    children,
    onClick,
}: CardShellProps) {
    const accentAlpha25 = `${accent}40`;
    const accentAlpha10 = `${accent}1a`;

    const inner = (
        <article
            onClick={onClick}
            className={cn(
                "group relative flex flex-col h-full rounded-[20px] overflow-hidden",
                "bg-white dark:bg-[#0d0d0d]",
                "border border-black/[0.07] dark:border-white/[0.07]",
                "shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_16px_rgba(0,0,0,0.04)]",
                "hover:-translate-y-1",
                "transition-all duration-300 ease-out",
                href || onClick ? "cursor-pointer" : "",
                className,
            )}
            style={
                {
                    "--card-accent": accent,
                    "--card-accent-25": accentAlpha25,
                    "--card-accent-10": accentAlpha10,
                } as React.CSSProperties
            }
            // hover border + shadow injected via inline style so accent colour works
            onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = `${accent}40`;
                el.style.boxShadow = `0 8px 32px ${accent}29, 0 2px 8px rgba(0,0,0,0.06)`;
            }}
            onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "";
                el.style.boxShadow = "";
            }}
        >
            {children}
        </article>
    );

    return (
        <CardContext.Provider value={{ accent }}>
            {href ? (
                <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-[20px]" style={{ "--tw-ring-color": accent } as React.CSSProperties}>
                    {inner}
                </Link>
            ) : (
                inner
            )}
        </CardContext.Provider>
    );
}

// ─── cover ────────────────────────────────────────────────────────────────────

interface CoverProps {
    src?: string | null;
    alt?: string;
    /** Single large letter shown when no image */
    fallbackInitial?: string;
    /** bg colour of the fallback area */
    fallbackBg?: string;
    height?: number;
    children?: React.ReactNode; // badge slots
}

function Cover({
    src,
    alt = "",
    fallbackInitial,
    fallbackBg,
    height = 140,
    children,
}: CoverProps) {
    const { accent } = useCard();
    const bg = fallbackBg ?? `${accent}0f`;

    return (
        <div
            className="relative shrink-0 overflow-hidden"
            style={{ height, background: bg }}
        >
            {src ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 80vw, 33vw"
                    unoptimized
                />
            ) : (
                /* Watermark initial — distinctive, not a flat blob */
                <div
                    className="absolute inset-0 flex items-end justify-end p-3 select-none pointer-events-none"
                    aria-hidden
                >
                    <span
                        className="text-[72px] leading-none font-bold italic tracking-tighter"
                        style={{ color: `${accent}1a` }}
                    >
                        {fallbackInitial}
                    </span>
                </div>
            )}

            {/* Bottom scrim — only when there's an image */}
            {src && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
            )}

            {/* Badge children rendered inside cover */}
            {children}
        </div>
    );
}

// ─── badge ────────────────────────────────────────────────────────────────────

type BadgeSlot = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type BadgeVariant = "default" | "rank" | "premium" | "new";

const slotClass: Record<BadgeSlot, string> = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
};

interface BadgeProps {
    slot?: BadgeSlot;
    variant?: BadgeVariant;
    className?: string;
    children: React.ReactNode;
}

function Badge({ slot = "top-left", variant = "default", className, children }: BadgeProps) {
    const { accent } = useCard();

    const variantClass: Record<BadgeVariant, string> = {
        default: "bg-white/85 dark:bg-black/50 backdrop-blur-md border-white/40 dark:border-white/10 text-stone-700 dark:text-stone-200",
        new: "bg-white/85 dark:bg-black/50 backdrop-blur-md border-white/40 dark:border-white/10",
        rank: "text-white",
        premium: "bg-black/50 backdrop-blur-sm text-white text-[9px] tracking-widest uppercase",
    };

    return (
        <div
            className={cn(
                "absolute flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold",
                slotClass[slot],
                variantClass[variant],
                className,
            )}
            style={variant === "rank" ? { background: accent } : undefined}
        >
            {variant === "new" && (
                <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ background: accent }}
                />
            )}
            <span style={variant === "new" ? { color: accent } : undefined}>
                {children}
            </span>
        </div>
    );
}

// ─── avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
    src?: string | null;
    initial?: string;
    size?: number;
    shape?: "circle" | "rounded";
}

function Avatar({ src, initial = "?", size = 48, shape = "rounded" }: AvatarProps) {
    const { accent } = useCard();
    const radius = shape === "circle" ? "9999px" : "12px";

    return (
        <div className="relative px-4">
            <div
                className="absolute z-10 border-[3px] border-white dark:border-[#0d0d0d] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:scale-105"
                style={{
                    top: -(size / 2 + 8),
                    left: 16,
                    width: size,
                    height: size,
                    borderRadius: radius,
                }}
            >
                {src ? (
                    <Image
                        src={src}
                        alt={initial}
                        width={size}
                        height={size}
                        className="object-cover w-full h-full"
                        unoptimized
                    />
                ) : (
                    <div
                        className="h-full w-full flex items-center justify-center text-white font-bold select-none"
                        style={{ background: accent, fontSize: size * 0.38 }}
                    >
                        {initial}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── body ─────────────────────────────────────────────────────────────────────

interface BodyProps {
    /** "avatar" adds extra top padding to clear the overlapping avatar */
    padTop?: "avatar" | "normal" | "none";
    className?: string;
    children: React.ReactNode;
}

function Body({ padTop = "normal", className, children }: BodyProps) {
    const topPad =
        padTop === "avatar" ? "pt-9" : padTop === "none" ? "pt-0" : "pt-5";

    return (
        <div className={cn("flex flex-col flex-1 px-4 pb-4 gap-0", topPad, className)}>
            {children}
        </div>
    );
}

// ─── divider ──────────────────────────────────────────────────────────────────

function Divider({ className }: { className?: string }) {
    return (
        <div
            className={cn("h-px bg-black/[0.06] dark:bg-white/[0.06] my-3.5", className)}
        />
    );
}

// ─── actions (hover-reveal row) ───────────────────────────────────────────────

interface ActionsProps {
    className?: string;
    children: React.ReactNode;
}

function Actions({ className, children }: ActionsProps) {
    return (
        <div
            className={cn(
                "flex gap-2",
                "opacity-0 translate-y-1",
                "group-hover:opacity-100 group-hover:translate-y-0",
                "transition-all duration-200 ease-out",
                className,
            )}
        >
            {children}
        </div>
    );
}

// ─── action button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
    onClick?: (e: React.MouseEvent) => void;
    href?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    hoverColor?: "orange" | "indigo" | "emerald";
    className?: string;
}

const hoverMap = {
    orange: "hover:bg-orange-50 hover:text-[#fd5000] hover:border-[#fd5000]/20 dark:hover:bg-orange-500/10",
    indigo: "hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400",
    emerald: "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-500/10",
};




function ActionButton({
    href,
    icon,
    children,
    hoverColor,
    onClick,
}: {
    href?: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    hoverColor?: "orange" | "indigo";
    onClick?: (e: React.MouseEvent) => void;
}) {
    const router = useRouter();
    const base = "flex-1 h-8 rounded-[8px] bg-stone-100 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.06] text-[11px] font-semibold flex items-center justify-center gap-1.5 text-stone-500 dark:text-stone-400 transition-all duration-150 cursor-pointer";

    const hoverClass =
        hoverColor === "indigo"
            ? "hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
            : "hover:bg-orange-50 hover:text-[#fd5000] hover:border-[#fd5000]/20 dark:hover:bg-orange-500/10 dark:hover:text-orange-400";

    function handleClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation(); // prevent the outer card <a> from firing
        onClick?.(e);
        if (href) router.push(href);
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${base} ${hoverClass}`}
        >
            {icon}
            {children}
        </button>
    );
}
interface PrimaryButtonProps {
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
}

function PrimaryButton({ href, onClick, children, className, icon }: PrimaryButtonProps) {
    const { accent } = useCard();

    const inner = (
        <button
            onClick={onClick}
            className={cn(
                "w-full h-[42px] rounded-full",
                "text-white text-[13px] font-semibold",
                "flex items-center justify-center gap-2",
                "active:scale-[0.98] transition-all duration-200 border-0 cursor-pointer",
                className,
            )}
            style={{
                background: accent,
                boxShadow: `0 2px 0 ${accent}59, 0 4px 14px ${accent}38`,
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.9)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 0 ${accent}66, 0 6px 20px ${accent}4d`;
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 0 ${accent}59, 0 4px 14px ${accent}38`;
            }}
        >
            {children}
            {icon}
        </button>
    );

    return href ? (
        <Link href={href} className="block" onClick={(e) => e.stopPropagation()}>
            {inner}
        </Link>
    ) : (
        inner
    );
}

// ─── assemble compound component ─────────────────────────────────────────────

export const CardShell = Object.assign(CardShellRoot, {
    Cover,
    Avatar,
    Badge,
    Body,
    Divider,
    Actions,
    ActionButton,
    PrimaryButton,
});