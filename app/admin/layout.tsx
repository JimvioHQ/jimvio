import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) {
    redirect(auth.status === 401 ? "/login?next=/admin" : "/dashboard");
  }

  return <AdminAppShell>{children}</AdminAppShell>;
}
