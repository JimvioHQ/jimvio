export const storefrontCardActionClass =
  "grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--store-btn-text,#fff)] shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)] disabled:opacity-50 sm:h-10 sm:w-10 sm:rounded-[12px]";

export function StorefrontCartGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6h15l-1.5 9h-12z" />
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="18" cy="20" r="1.25" />
      <path d="M6 6 5 3H2" />
    </svg>
  );
}
