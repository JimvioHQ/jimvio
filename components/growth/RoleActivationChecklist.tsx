import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const nextSteps = {
  vendor: [
    { label: "Complete your vendor application", href: "/ugc/campaign-center/setup" },
    { label: "Add your first product", href: "/marketplace/new" },
  ],
  affiliate: [
    { label: "Open your affiliate analytics", href: "/" },
    { label: "Explore products to share", href: "/marketplace" },
  ],
  influencer: [
    { label: "Explore creator opportunities", href: "/ugc" },
    { label: "Open your creator hub", href: "/creator" },
  ],
} as const;

export function RoleActivationChecklist({ role }: { role: keyof typeof nextSteps }) {
  return (
    <section className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Activation checklist</h2>
      <ul className="mt-3 space-y-2">
        {nextSteps[role].map((step) => (
          <li key={step.href} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-[#fd5000]" />
            <Link className="text-[var(--color-text-primary)] hover:text-[#fd5000]" href={step.href}>{step.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
