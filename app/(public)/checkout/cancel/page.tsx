import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20 flex items-center justify-center px-4">
      <div className="max-w-[480px] w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-danger-light)] animate-[fade-in_0.4s_ease-out]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
            <X className="h-7 w-7" strokeWidth={3} />
          </div>
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Payment cancelled</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Your order was not completed. No charges were made.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/checkout">Try again</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
