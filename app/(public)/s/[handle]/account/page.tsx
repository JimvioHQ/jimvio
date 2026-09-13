import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export default async function StorefrontAccountPage({ params }: Props) {
  const { handle } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        Account
      </h1>
      <p className="mt-3 text-sm text-[var(--store-muted,#6B7280)]">
        {store.name} uses your Jimvio account for orders and identity.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/orders"
          className="rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          View orders
        </Link>
        <Link
          href="/settings"
          className="rounded-[var(--store-btn-radius,9999px)] border border-[var(--store-border,rgba(0,0,0,0.1))] px-4 py-2.5 text-sm font-semibold"
        >
          Account settings
        </Link>
        <Link
          href={storefrontHref(handle, "", { onStoreHost })}
          className="rounded-[var(--store-btn-radius,9999px)] px-4 py-2.5 text-sm font-semibold text-[var(--store-muted,#6B7280)]"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
