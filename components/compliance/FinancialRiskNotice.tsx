import { AlertTriangle } from "lucide-react";
import { FINANCIAL_RISK_NOTICE } from "@/lib/compliance/financial-risk";

export function FinancialRiskNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] leading-snug text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Risk notice:</strong> {FINANCIAL_RISK_NOTICE}
      </span>
    </div>
  );
}
