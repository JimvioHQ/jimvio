import * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsPageHeader({
  title,
  description,
  menuButton,
}: {
  title: string;
  description: string;
  menuButton?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {menuButton}
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-1 text-[14px] leading-relaxed text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

export function SettingsCard({
  title,
  description,
  icon,
  children,
  className,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-6",
        className,
      )}
    >
      {title ? (
        <div className="mb-5 flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF4EE] text-[#FF5A1F]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#6B7280]">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsField({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#374151]">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[12px] text-[#6B7280]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-[#B42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const settingsInputClass = cn(
  "h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[14px] text-[#111827]",
  "placeholder:text-[#9CA3AF] outline-none transition-colors",
  "focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15",
  "disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#6B7280]",
);

export const settingsTextareaClass = cn(
  settingsInputClass,
  "h-auto min-h-[96px] resize-none py-2.5",
);

export function SettingsButton({
  children,
  loading,
  variant = "primary",
  className,
  disabled,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "bg-[#FF5A1F] text-white hover:bg-[#F04E15] disabled:bg-[#FF5A1F]/50",
    secondary:
      "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB] disabled:text-[#9CA3AF]",
    danger: "bg-[#B42318] text-white hover:bg-[#912018] disabled:bg-[#B42318]/50",
    ghost: "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]",
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 focus-visible:ring-offset-2",
        "disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

export function SettingsStatus({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    success: "border-[#ABEFC6] bg-[#F6FEF9] text-[#067647]",
    error: "border-[#FECDCA] bg-[#FFFBFA] text-[#B42318]",
    info: "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]",
  };
  return (
    <p role="status" className={cn("rounded-xl border px-3.5 py-2.5 text-[13px]", tones[tone])}>
      {children}
    </p>
  );
}
