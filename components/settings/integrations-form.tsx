"use client";

import Link from "next/link";
import { Plug, ExternalLink, Store, Truck } from "lucide-react";
import { Card, Divider } from "@/components/admin/form-primitive";

type Props = {
  cjEnabled: boolean;
  shopifyPlatformConfigured: boolean;
};

export function IntegrationsForm({ cjEnabled, shopifyPlatformConfigured }: Props) {
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div
          className="size-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-accent-light)" }}
        >
          <Plug className="size-4" style={{ color: "var(--color-accent)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Integrations</h2>
          <p className="text-[12px] text-muted-foreground">
            Connect external catalogs and stores. Credentials are managed via environment variables, not here.
          </p>
        </div>
      </header>

      <Divider label="Connected services" />

      <div className="grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="size-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center">
                <Store className="size-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Shopify (platform)</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {shopifyPlatformConfigured
                    ? "Platform vendor ID is configured"
                    : "Set JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID in environment"}
                </p>
              </div>
            </div>
            <Link
              href="/admin/shopify"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-accent)] hover:underline shrink-0"
            >
              Manage
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="size-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center">
                <Truck className="size-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Jimvio Store</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Channel {cjEnabled ? "enabled" : "disabled"} in{" "}
                  <Link href="/admin/settings/suppliers" className="text-[var(--color-accent)] hover:underline">
                    Suppliers
                  </Link>
                  . API keys: CJ_API_KEY / CJ_VENDOR_ID env or platform_settings (server-only).
                </p>
              </div>
            </div>
            <Link
              href="/admin/settings/suppliers"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-accent)] hover:underline shrink-0"
            >
              Suppliers
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <p className="text-[12px] text-muted-foreground rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
        Vendor Shopify connections are managed per seller from their dashboard under Business → Integrations, or at{" "}
        <code className="text-[11px]">/vendor/shopify</code>.
      </p>
    </div>
  );
}
