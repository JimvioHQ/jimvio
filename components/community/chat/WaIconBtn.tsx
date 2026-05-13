import { cn } from "@/lib/utils";

interface WaIconBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  active?: boolean;
}

export function WaIconBtn({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
  className,
  active,
}: WaIconBtnProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40 text-[#667781]",
        active ? "opacity-100" : "opacity-70 hover:opacity-100",
        className
      )}
    >
      {children}
    </button>
  );
}