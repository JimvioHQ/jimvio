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

const MARK_SRC = "/jimvio-logo-mark.png";

const SIZE: Record<LogoSize, { icon: number; text: string; gap: string; radius: string }> = {
  sm: { icon: 20, text: "text-[14px]", gap: "gap-1", radius: "rounded-[6px]" },
  md: { icon: 28, text: "text-[19px]", gap: "gap-1.5", radius: "rounded-[7px]" },
  lg: { icon: 36, text: "text-[24px]", gap: "gap-2", radius: "rounded-[9px]" },
  xl: { icon: 46, text: "text-[31px]", gap: "gap-2.5", radius: "rounded-[10px]" },
};

/** Header bar — optical sizing tuned to sit level with nav items */
const HEADER_SIZE: Record<LogoSize, { icon: number; text: string; gap: string; radius: string }> = {
  sm: { icon: 22, text: "text-[13px]", gap: "gap-1.5", radius: "rounded-[6px]" },
  md: { icon: 30, text: "text-[17px]", gap: "gap-1.5", radius: "rounded-[7px]" },
  lg: { icon: 34, text: "text-[21.5px]", gap: "gap-2", radius: "rounded-[8px]" },
  xl: { icon: 42, text: "text-[27px]", gap: "gap-2.5", radius: "rounded-[9px]" },
};

const PREMIUM_TEXT: Record<LogoSize, string> = {
  sm: "text-[12.5px]",
  md: "text-[16.5px]",
  lg: "text-[21.5px]",
  xl: "text-[28px]",
};

const PREMIUM_GAP: Record<LogoSize, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-2",
  xl: "gap-2.5",
};

function LogoMark({
  icon,
  radius,
  elevated = false,
}: {
  icon: number;
  radius: string;
  elevated?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden",
        radius,
        elevated
          ? cn(
              "border border-black/[0.06] dark:border-white/[0.08]",
              "shadow-[0_1px_2px_rgba(253,80,0,0.14),0_4px_12px_rgba(253,80,0,0.08)]",
              "transition-[transform,box-shadow] duration-200 ease-out",
              "group-hover:scale-[1.03] group-hover:shadow-[0_2px_8px_rgba(253,80,0,0.18)]",
              "group-active:scale-[0.98]",
            )
          : "shadow-[0_1px_2px_rgba(253,80,0,0.12)] ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
      )}
      style={{
        width: icon,
        height: icon,
        backgroundColor: "#FB4C07",
        backgroundImage: `url(${MARK_SRC})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
      aria-hidden
    />
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
  const isPremium = presentation === "premium";
  const { icon, text, gap, radius } = isHeader ? HEADER_SIZE[size] : SIZE[size];

  const logoMark = (
    <LogoMark icon={icon} radius={radius} elevated={isPremium} />
  );

  const inner = (
    <>
      {logoMark}
      {variant === "full" && (
        <span
          className={cn(
            "select-none truncate text-[var(--color-text-primary)]",
            isPremium
              ? cn(
                  PREMIUM_TEXT[size],
                  "font-bold leading-none tracking-[-0.02em] translate-y-[0.5px]",
                )
              : cn(
                  "font-semibold leading-none tracking-tight",
                  text,
                  isHeader && "translate-y-[0.5px]",
                ),
          )}
        >
          Jim<span className="text-orange-600 dark:text-orange-500">vio</span>
        </span>
      )}
    </>
  );

  const rootClass = cn(
    "flex min-w-0 items-center",
    isPremium ? PREMIUM_GAP[size] : gap,
    isPremium && "group",
    isHeader && "h-full",
    className,
  );

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
