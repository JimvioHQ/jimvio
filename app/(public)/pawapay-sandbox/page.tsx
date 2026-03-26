import { PawaPaySandboxDemo } from "@/components/pawapay/pawa-pay-sandbox-demo";

export const metadata = {
  title: "PawaPay sandbox demo",
};

export default function PawaPaySandboxPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-24">
      <PawaPaySandboxDemo />
    </div>
  );
}
