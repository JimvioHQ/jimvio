"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeFromCart,
  updateCartItemQuantity,
} from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";

export function StorefrontCartLineControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const { refreshCart } = useCartStore();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(async () => {
      await refreshCart();
      router.refresh();
    });
  }

  async function setQty(next: number) {
    setError(null);
    const result = await updateCartItemQuantity(itemId, next);
    if (!result.success) {
      setError(result.error || "Could not update quantity.");
      return;
    }
    refresh();
  }

  async function onRemove() {
    setError(null);
    const result = await removeFromCart(itemId);
    if (!result.success) {
      setError(result.error || "Could not remove item.");
      return;
    }
    refresh();
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <div
        className="inline-flex items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.12))]"
        role="group"
        aria-label="Quantity"
      >
        <button
          type="button"
          className="grid h-8 w-8 place-items-center text-sm disabled:opacity-50"
          disabled={pending || quantity <= 1}
          onClick={() => void setQty(quantity - 1)}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-6 text-center text-xs font-semibold tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center text-sm disabled:opacity-50"
          disabled={pending || quantity >= 99}
          onClick={() => void setQty(quantity + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="text-xs font-semibold text-[var(--store-muted,#6B7280)] underline disabled:opacity-50"
        disabled={pending}
        onClick={() => void onRemove()}
      >
        Remove
      </button>
      {error ? (
        <p className="w-full text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
