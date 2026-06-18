import { cn } from "@/lib/utils";

const SHELL = "mx-auto w-full max-w-2xl px-4 sm:px-6";

export function CheckoutResultShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-[var(--color-bg)] pt-24 pb-16 sm:pt-28", className)}>
      <div className={SHELL}>{children}</div>
    </div>
  );
}

export function CheckoutResultCard({
  children,
  accent = "success",
}: {
  children: React.ReactNode;
  accent?: "success" | "warning" | "error";
}) {
  const barClass =
    accent === "success"
      ? "bg-[var(--color-accent)]"
      : accent === "warning"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className={cn("h-0.5 w-full", barClass)} />
      <div className="p-6 sm:p-7">{children}</div>
    </div>
  );
}
