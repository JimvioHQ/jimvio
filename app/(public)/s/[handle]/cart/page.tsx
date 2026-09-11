import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { getCart } from "@/lib/actions/marketplace";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export default async function StorefrontCartPage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) redirect("/cart");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/s/${handle}/cart`);
  }

  const { items, total } = await getCart({
    jimvioStoreId: store.id,
    jimvioStoreHandle: handle,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{store.name} cart</h1>
      <p className="mt-1 text-sm opacity-60">
        This cart is isolated from the Marketplace cart.
      </p>

      {!items.length ? (
        <div className="mt-8 rounded-lg border border-black/10 bg-white p-6 text-sm opacity-70">
          Your store cart is empty.{" "}
          <Link href={`/s/${handle}/collections/all`} className="font-semibold underline">
            Continue shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item: {
            id: string;
            quantity: number;
            unit_price_at_add: number;
            products?: { name?: string; slug?: string } | null;
          }) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {item.products?.name || "Product"}
                </p>
                <p className="text-xs opacity-60">Qty {item.quantity}</p>
              </div>
              <p className="tabular-nums">
                {(Number(item.unit_price_at_add) * Number(item.quantity)).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
        <p className="text-sm font-semibold tabular-nums">
          Subtotal: {Number(total).toFixed(2)}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/s/${handle}/collections/all`}
            className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold"
          >
            Continue shopping
          </Link>
          {items.length ? (
            <Link
              href="/checkout"
              className="rounded-md bg-[var(--store-primary,#FF5A1F)] px-3 py-2 text-xs font-semibold text-white"
            >
              Checkout
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
