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
                "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "focus:outline-none focus:ring-1 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]",
                hasError
                    ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)] focus:border-[var(--color-danger)]"
                    : "",
                className
            )}
            {...props}
        />
    );
}