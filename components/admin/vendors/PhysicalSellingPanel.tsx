"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setPhysicalSellingAccess } from "@/lib/actions/admin-vendors";
import { physicalSellingCustomerCopy, physicalSellingStatus } from "@/lib/products/physical-selling";

export function PhysicalSellingPanel({
  vendor,
}: {
  vendor: {
    id: string;
    business_name: string;
    is_active: boolean;
    verification_status: string | null;
    verification_notes: string | null;
    physical_selling_requested_at?: string | null;
    physical_selling_reviewed_at?: string | null;
  };
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const status = physicalSellingStatus({
    verification_status: vendor.verification_status,
    physical_selling_requested_at: vendor.physical_selling_requested_at,
  });
  const copy = physicalSellingCustomerCopy(status);

  function apply(decision: "approved" | "rejected" | "suspended") {
    const label = decision === "approved" ? "approve physical selling" : decision === "rejected" ? "mark changes required" : "suspend physical selling";
    if (!window.confirm(`Confirm: ${label} for ${vendor.business_name}? Marketplace, fraud, and account restrictions still apply.`)) {
      return;
    }
    startTransition(async () => {
      const result = await setPhysicalSellingAccess(vendor.id, decision, notes);
      if (!result.success) {
        toast.error(result.error || "Could not update physical selling access");
        return;
      }
      toast.success("Physical selling access updated");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#fd5000]" />
        <h2 className="text-[13px] font-semibold">Physical product selling</h2>
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Approving access lets this seller create and publish physical products. It does not bypass account suspension, product moderation, fraud checks, or other marketplace rules. Digital products are unchanged.
      </p>
      <p className="text-[13px] font-medium">
        Status: {copy.label}
        {vendor.physical_selling_requested_at ? ` · requested ${new Date(vendor.physical_selling_requested_at).toLocaleString()}` : ""}
        {vendor.physical_selling_reviewed_at ? ` · reviewed ${new Date(vendor.physical_selling_reviewed_at).toLocaleString()}` : ""}
      </p>
      {!vendor.is_active ? (
        <p className="text-[12px] text-rose-600">This seller account is inactive, so approval will be refused.</p>
      ) : null}
      <label className="block text-[12px] font-medium">
        Internal note
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px]"
          placeholder="Visible to administrators only"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => apply("approved")} className="rounded-full bg-[#fd5000] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60">
          Approve physical selling
        </button>
        <button type="button" disabled={pending} onClick={() => apply("rejected")} className="rounded-full border border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold disabled:opacity-60">
          Changes required
        </button>
        <button type="button" disabled={pending} onClick={() => apply("suspended")} className="rounded-full border border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold disabled:opacity-60">
          Suspend access
        </button>
      </div>
    </section>
  );
}
