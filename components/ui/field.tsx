import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

function FieldLabel({
    label,
    required,
    hint,
}: {
    label: string;
    required?: boolean;
    hint?: string;
}) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
                {label}
                {required && (
                    <span className="text-orange-500 ml-0.5" aria-hidden="true">*</span>
                )}
            </label>
            {hint && (
                <span className="text-[10px] text-[var(--color-text-muted)]">{hint}</span>
            )}
        </div>
    );
}

function FieldError({ message }: { message: string }) {
    return (
        <p role="alert" className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {message}
        </p>
    );
}

 function Field({
    label,
    icon,
    required,
    hint,
    error,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    required?: boolean;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <FieldLabel label={label} required={required} hint={hint} />

            {/* Relative container — icon and input must both live here */}
            <div className="relative">
                {icon && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10",
                            "flex items-center justify-center",
                            "[&>svg]:h-[14px] [&>svg]:w-[14px] [&>svg]:shrink-0",
                            error
                                ? "text-[var(--color-danger)]"
                                : "text-[var(--color-text-muted)]"
                        )}
                    >
                        {icon}
                    </span>
                )}
                {children}
            </div>

            {error && <FieldError message={error} />}
        </div>
    );
}

export { FieldLabel, FieldError, Field };