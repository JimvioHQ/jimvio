import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "icon";
type LogoPresentation = "default" | "premium";

interface JimvioLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  presentation?: LogoPresentation;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const SIZE: Record<LogoSize, { icon: number; text: string; gap: string }> = {
  sm: { icon: 20, text: "text-[14px]", gap: "gap-1" },
  md: { icon: 28, text: "text-[19px]", gap: "gap-1.5" },
  lg: { icon: 36, text: "text-[24px]", gap: "gap-2" },
  xl: { icon: 48, text: "text-[32px]", gap: "gap-2.5" },
};

/** Navbar brand — optical sizing tuned to sit level with 13px nav items */
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

export function JimvioLogo({
  variant = "full",
  size = "md",
  presentation = "default",
  href,
  onClick,
  className,
}: JimvioLogoProps) {
  const { icon, text, gap } = SIZE[size];
  const isPremium = presentation === "premium";

  const logoMark = isPremium ? (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[13px]",
        "border border-black/[0.06] dark:border-white/[0.08]",
        "bg-[var(--color-surface)]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_14px_rgba(0,0,0,0.04)]",
        "transition-[transform,box-shadow] duration-200 ease-out will-change-transform",
        "group-hover:scale-[1.03] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.07),0_10px_24px_rgba(0,0,0,0.06)]",
        "group-active:scale-[0.98]",
        "h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] md:h-[50px] md:w-[50px]",
      )}
      aria-hidden
    >
      <Image
        src="/jimvio-logo.png"
        alt=""
        fill
        sizes="(max-width: 640px) 40px, (max-width: 768px) 44px, 50px"
        className="object-contain scale-[1.025] origin-center"
        priority
      />
    </span>
  ) : (
    <Image
      src="/jimvio-logo.png"
      alt=""
      width={icon}
      height={icon}
      className="mix-blend-multiply dark:mix-blend-normal flex-shrink-0"
      style={{ width: "auto", height: icon }}
      priority
    />
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
                  "font-bold leading-none tracking-[-0.02em] translate-y-[1.5px]",
                )
              : cn("font-semibold tracking-tight", text),
          )}
        >
          Jim<span className="text-orange-600 dark:text-orange-500">vio</span>
        </span>
      )}
    </>
  );

  const rootClass = cn(
    "flex items-center min-w-0",
    isPremium ? PREMIUM_GAP[size] : gap,
    isPremium && "group",
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
