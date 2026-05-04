import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "icon";

interface JimvioLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const SIZE: Record<LogoSize, { icon: number; text: string; gap: string }> = {
  sm: { icon: 20, text: "text-[14px]", gap: "gap-1"   },
  md: { icon: 28, text: "text-[19px]", gap: "gap-1.5" },
  lg: { icon: 36, text: "text-[24px]", gap: "gap-2"   },
  xl: { icon: 48, text: "text-[32px]", gap: "gap-2.5" },
};

export function JimvioLogo({
  variant  = "full",
  size     = "md",
  href,
  onClick,
  className,
}: JimvioLogoProps) {
  const { icon, text, gap } = SIZE[size];

  const inner = (
    <>
      <Image
        src="/jimvio-logo.png"
        alt="Jimvio"
        width={icon}
        height={icon}
        className="w-auto mix-blend-multiply dark:mix-blend-normal flex-shrink-0"
        style={{ height: icon }}
        priority
      />
      {variant === "full" && (
        <span
          className={cn(
            "font-semibold tracking-tight select-none truncate text-[var(--color-text-primary)]",
            text
          )}
        >
          Jim<span className="text-orange-600 dark:text-orange-500">vio</span>
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn("flex items-center min-w-0", gap, className)}
        aria-label="Jimvio"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cn("flex items-center min-w-0", gap, className)}
      role="img"
      aria-label="Jimvio"
    >
      {inner}
    </div>
  );
}

export default JimvioLogo;