import React from "react";
import { cn } from "@/lib/utils";

export function Tile({
    label,
    value,
    sublabel,
    icon: Icon,
    tone = "default",
}: {
    label: string;
    value: string;
    sublabel?: string;
    icon: React.ElementType;
    tone?: "default" | "warn" | "danger" | "success";
}) {
    const base =
        "group p-[14px_16px_16px] rounded-[14px] border border-border/30 " +
        "bg-background flex flex-col transition-[border-color,transform] " +
        "duration-150 hover:-translate-y-px";

    const tones = {
        default: "hover:border-border/60",
        warn: "bg-amber-50/10  border-amber-400/30  hover:border-amber-400/60  dark:bg-amber-950/40",
        danger: "bg-rose-50/10   border-rose-400/30   hover:border-rose-400/60   dark:bg-rose-950/40",
        success: "bg-green-50/10  border-green-500/30  hover:border-green-500/60  dark:bg-green-950/40",
    };

    const iconTones = {
        default: "text-muted-foreground/70",
        warn: "text-amber-600  dark:text-amber-300",
        danger: "text-rose-600   dark:text-rose-300",
        success: "text-green-700  dark:text-green-400",
    };

    const subTones = {
        default: "text-muted-foreground",
        warn: "text-amber-700  dark:text-amber-300",
        danger: "text-rose-700   dark:text-rose-300",
        success: "text-green-800  dark:text-green-400",
    };

    return (
        <div className={cn(base, tones[tone])}>
            <div className="flex items-start justify-between mb-2.5">
                <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground">
                    {label}
                </p>
                <Icon className={cn("h-[15px] w-[15px] mt-px shrink-0", iconTones[tone])} />
            </div>

            <p className="font-mono text-[22px] font-medium tracking-[-0.03em] leading-none text-foreground mb-1">
                {value}
            </p>

            {sublabel && (
                <p className={cn("text-[11.5px] leading-snug", subTones[tone])}>
                    {sublabel}
                </p>
            )}
        </div>
    );
}
