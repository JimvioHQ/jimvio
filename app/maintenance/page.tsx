import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata = {
  title: "Maintenance · Jimvio",
  description: "Jimvio is temporarily unavailable while we perform scheduled maintenance.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-light)]">
          <Wrench className="h-6 w-6 text-[var(--color-accent)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            We&apos;ll be back soon
          </h1>
          <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">
            Jimvio is undergoing scheduled maintenance. Buyer and seller access is paused for now.
            Platform administrators can still sign in to manage the site.
          </p>
        </div>

        <Link
          href="/login?next=/admin"
          className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
        >
          Administrator sign in
        </Link>
      </div>
    </div>
  );
}
