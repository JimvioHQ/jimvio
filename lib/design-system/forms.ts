/** Shared form field metadata patterns. */
export type DsFieldState = "default" | "error" | "success" | "disabled" | "loading";

export type DsFieldMeta = {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  required?: boolean;
  optional?: boolean;
};

export const dsFieldLabelClass =
  "mb-1.5 text-[12px] font-semibold tracking-[var(--ds-tracking-normal)] text-[var(--color-text-secondary)]";

export const dsFieldHelperClass = "mt-1.5 text-[12px] text-[var(--color-text-muted)]";

export const dsFieldErrorClass = "mt-1.5 text-[12px] text-[var(--color-danger)]";

export const dsFieldSuccessClass = "mt-1.5 text-[12px] text-[var(--color-success)]";
