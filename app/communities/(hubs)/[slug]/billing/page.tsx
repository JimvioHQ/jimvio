import { MembershipActions } from "@/components/creator-economy/MembershipActions";

export default async function MemberBillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Billing</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--color-text-muted)]">
        Upgrade, downgrade, start a trial, or cancel your community membership.
      </p>
      <MembershipActions slug={slug} />
    </div>
  );
}
