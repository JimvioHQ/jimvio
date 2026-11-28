import { SiteIconManager } from "@/components/admin/site-icon-manager";

export const metadata = { title: "Icon Manager · Jimvio Admin" };
export const dynamic = "force-dynamic";

export default function SiteIconsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#FF5A1F]">System / Branding</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Icon Manager</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">Manage every platform favicon and app icon from one place. Upload a correctly sized asset, preview it, and publish it to the live icon endpoints.</p>
      </div>
      <SiteIconManager />
    </div>
  );
}
