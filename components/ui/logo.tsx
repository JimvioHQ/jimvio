import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "icon";
type LogoPresentation = "default" | "premium" | "header";

interface JimvioLogoProps {
    variant?: LogoVariant;
    size?: LogoSize;
    presentation?: LogoPresentation;
    href?: string;
    onClick?: () => void;
    className?: string;
}

const SIZE: Record<LogoSize, { icon: number; text: string; gap: string }> = {
    sm: { icon: 20, text: "text-[14px]", gap: "gap-1.5" },
    md: { icon: 28, text: "text-[19px]", gap: "gap-2" },
    lg: { icon: 36, text: "text-[24px]", gap: "gap-2.5" },
    xl: { icon: 46, text: "text-[31px]", gap: "gap-3" },
};

const HEADER_SIZE: Record<LogoSize, { icon: number; text: string; gap: string }> = {
    sm: { icon: 22, text: "text-[13px]", gap: "gap-1.5" },
    md: { icon: 30, text: "text-[17px]", gap: "gap-2" },
    lg: { icon: 34, text: "text-[21.5px]", gap: "gap-2" },
    xl: { icon: 42, text: "text-[27px]", gap: "gap-2.5" },
};

function LogoMark({ size: px }: { size: number }) {
    return (
        <span
            className="relative shrink-0 overflow-hidden"
            style={{ width: px, height: px }}
            aria-hidden
        >
            <svg
                viewBox="0 0 32 32"
                fill="none"
                width={px}
                height={px}
                className="block"
            >
                <defs>
                    <linearGradient id="j-logo-bg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fd5000" />
                        <stop offset="100%" stopColor="var(--color-accent-hover)" />
                    </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="url(#j-logo-bg)" />
                <g transform="translate(6.5, 0)">
                    <path
                        d="M11 24c-2 0-4-.4-5.5-1.2a7.5 7.5 0 0 1-3-3.3c-.5-1-.5-2-.5-3h3.5c0 .7 0 1.3.3 1.8.5 1 1.5 1.7 3 1.7 2.2 0 3.7-1.5 3.7-4.3V8h4v6.7c0 2.7-.7 4.8-2 6.2-1.2 1.4-3 2.1-5.2 2.1Z"
                        fill="#fff"
                    />
                </g>
            </svg>
        </span>
    );
}

export function JimvioLogo({
    variant = "full",
    size = "md",
    presentation = "default",
    href,
    onClick,
    className,
}: JimvioLogoProps) {
    const isHeader = presentation === "header";
    const { icon, text, gap } = isHeader ? HEADER_SIZE[size] : SIZE[size];

    const logoMark = <LogoMark size={icon} />;

    const inner = (
        <>
            {logoMark}
            {variant === "full" && (
                <span
                    className={cn(
                        "font-bold tracking-tight select-none truncate font-[family-name:var(--font-family-display)]",
                        text
                    )}
                    style={{ color: "var(--color-text-primary)" }}
                >
                    jim
                    <span
                        style={{
                            background: "linear-gradient(135deg, #fd5000, #ff7a33)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        vio
                    </span>
                </span>
            )}
        </>
    );

    const rootClass = cn("flex min-w-0 items-center", gap, isHeader && "h-full", className);

    if (href) {
        return (
            <Link
                href={href}
                onClick={onClick}
                className={rootClass}
                aria-label="Jimvio"
            >
                {inner}
            </Link>
        );
    }

    return (
        <div className={rootClass} role="img" aria-label="Jimvio">
            {inner}
        </div>
    );
}

export default JimvioLogo;
