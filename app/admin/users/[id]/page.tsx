import { notFound } from "next/navigation";
import { AdminUserDetailClient } from "./_components/AdminUserDetailClient";
import { getAdminUserById } from "@/services/admin/getAdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const user = await getAdminUserById(id);
    if (!user) notFound();
    return <AdminUserDetailClient user={user} />;
}