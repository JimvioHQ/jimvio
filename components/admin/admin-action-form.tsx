"use client";

import { useState, type ReactNode } from "react";

export function AdminActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      className={className}
      action={async (formData) => {
        if (pending) return;
        setPending(true);
        try {
          await action(formData);
        } finally {
          setPending(false);
        }
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
        {children}
      </fieldset>
    </form>
  );
}
