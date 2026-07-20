import { LockKeyhole, ShieldCheck, Truck } from "lucide-react";

export function CheckoutTrustSignals() {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
      <Signal icon={LockKeyhole} label="Secure payment" />
      <Signal icon={ShieldCheck} label="Protected checkout" />
      <Signal icon={Truck} label="Track delivery" />
    </div>
  );
}

function Signal({ icon: Icon, label }: { icon: typeof LockKeyhole; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-[10px] font-medium text-[var(--color-text-muted)]">
      <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
      <span>{label}</span>
    </div>
  );
}
