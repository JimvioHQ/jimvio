import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export default async function StorefrontAccountPage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-3 text-sm opacity-70">
        {store.name} uses your Jimvio account for orders and identity.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/orders"
          className="rounded-md bg-[var(--store-primary,#FF5A1F)] px-4 py-2 text-sm font-semibold text-white"
        >
          View orders
        </Link>
        <Link
          href="/settings"
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold"
        >
          Account settings
        </Link>
      </div>
    </div>
  );
}
