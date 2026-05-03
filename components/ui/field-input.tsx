import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
export function FieldInput({
    hasError = false,
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
    return (
        <Input
            className={cn(
                "h-11 w-full pl-10 pr-3 text-[13px] font-medium rounded-sm",
                "bg-[var(--color-surface)]b bg-surface border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "focus:outline-none focus:ring-2 focus:border-transparent",
                hasError
                    ? "border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60"
                    : "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150",
                "transition-all duration-150",
                className
            )}
            {...props}
        />
    );
}