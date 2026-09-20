import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { getMaintenanceModeEnabled } from "@/lib/platform-maintenance";
import { isAuthTurnstileEnabled } from "@/lib/auth/turnstile";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-authenticated";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ next?: string; redirect?: string; returnUrl?: string }>;
};

export default async function StorefrontLoginPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const next =
    sp.next ??
    sp.redirect ??
    sp.returnUrl ??
    storefrontHref(handle, "/account", linkOpts);

  await redirectIfAuthenticated(next);

  const maintenanceMode = await getMaintenanceModeEnabled();
  const turnstileEnabled = isAuthTurnstileEnabled();
  const logo =
    typeof store.logo_url === "string" && store.logo_url.trim()
      ? store.logo_url.trim()
      : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Link
          href={storefrontHref(handle, "", linkOpts)}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[var(--store-muted,#6B7280)]"
        >
          ← Back to {store.name}
        </Link>
        <div className="mb-4 flex justify-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={store.name}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--store-primary,#FF5A1F)] text-lg font-bold text-white">
              {store.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--store-heading-font, inherit)" }}
        >
          Sign in to {store.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
          Use your email to continue shopping and view orders at this store.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-11 rounded-lg bg-[var(--store-border,rgba(0,0,0,0.06))]" />
            <div className="h-11 rounded-lg bg-[var(--store-border,rgba(0,0,0,0.06))]" />
          </div>
        }
      >
        <LoginForm
          maintenanceMode={maintenanceMode}
          turnstileEnabled={turnstileEnabled}
        />
      </Suspense>
      <p className="mt-8 text-center text-[11px] text-[var(--store-muted,#9CA3AF)]">
        Secure account · Powered by Jimvio
      </p>
    </div>
  );
}
