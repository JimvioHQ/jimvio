export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-1" role="separator" aria-label={label}>
      <div className="h-px flex-grow bg-zinc-200 dark:bg-border" />
      <span className="mx-3 shrink-0 text-[12px] font-medium text-zinc-500">
        {label}
      </span>
      <div className="h-px flex-grow bg-zinc-200 dark:bg-border" />
    </div>
  );
}
