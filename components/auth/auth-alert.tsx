import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-3.5 py-3 text-center text-[13px] font-medium leading-snug",
        tone === "error" &&
          "border border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
        tone === "success" &&
          "border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
        tone === "info" &&
          "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-border dark:bg-surface-secondary dark:text-zinc-300",
      )}
    >
      {children}
    </div>
  );
}
