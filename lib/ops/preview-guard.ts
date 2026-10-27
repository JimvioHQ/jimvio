import { NextResponse } from "next/server";

/** True only on Vercel Preview deployments, never local or Production. */
export function isVercelPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * Preview currently shares the Production database.
 * These paths must not run against Production from a Preview deployment.
 */
export function isPreviewPrivilegedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  if (p === "/media/admin" || p.startsWith("/media/admin/")) return true;
  if (p === "/media/preview" || p.startsWith("/media/preview/")) return true;
  if (p === "/api/media" || p.startsWith("/api/media/")) return true;
  if (p.startsWith("/api/admin")) return true;
  if (p.startsWith("/api/identity/admin")) return true;
  if (p.startsWith("/api/notifications/admin")) return true;
  if (p.startsWith("/api/cron")) return true;
  if (p.startsWith("/api/webhooks")) return true;
  if (p === "/api/webhook" || p.startsWith("/api/webhook/")) return true;
  if (p.startsWith("/api/shopify/")) return true;
  if (p.startsWith("/api/payments/")) return true;
  if (p.startsWith("/api/pawapay/")) return true;
  if (p.startsWith("/api/afripay/")) return true;
  if (p.startsWith("/api/nowpayments/")) return true;
  if (p.startsWith("/api/pesapal/")) return true;
  if (p.startsWith("/api/payouts/")) return true;
  if (p.startsWith("/api/ugc/views/sync")) return true;
  if (p.startsWith("/api/growth/retention/digest")) return true;
  if (p.startsWith("/api/cj/import")) return true;
  if (p.startsWith("/api/cj/products")) return true;
  if (p.startsWith("/api/cj/categories")) return true;
  if (p.startsWith("/api/ops/") && p !== "/api/ops/health") return true;
  return false;
}

/**
 * Preview currently shares the Production database.
 * Block privileged mutations so Preview cannot act as a Production admin/payment client.
 */
export function previewPrivilegedForbidden(): NextResponse | null {
  if (!isVercelPreview()) return null;
  return NextResponse.json(
    { error: "This operation is disabled on Preview" },
    { status: 403 },
  );
}

export function previewPrivilegedDenied(): {
  ok: false;
  error: string;
  status: 403;
} | null {
  if (!isVercelPreview()) return null;
  return {
    ok: false,
    error: "Admin operations are disabled on Preview.",
    status: 403,
  };
}
