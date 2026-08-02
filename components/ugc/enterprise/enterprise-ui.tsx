import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15";

export const cardClass =
  "rounded-[16px] border border-[#EEF0F2] bg-white p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]";

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#111827]">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}

export function EnterprisePrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E54E18] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function EnterpriseOutlineButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
