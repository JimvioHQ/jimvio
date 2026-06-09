import { getCart } from "@/lib/actions/marketplace";
import { CartClient } from "@/components/marketplace/cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { items } = await getCart();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <CartClient initialItems={items} />
      </div>
    </div>
  );
}