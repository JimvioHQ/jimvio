import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { AdminShell } from "@/components/editorial/admin/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Admin",
  robots: { index: false, follow: false },
};

export default async function MediaAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) {
    redirect(auth.status === 401 ? "/login?next=/media/admin" : "/");
  }
  return <AdminShell>{children}</AdminShell>;
}
