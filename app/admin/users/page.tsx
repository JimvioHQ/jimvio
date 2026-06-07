import { AdminUsersClient } from "@/components/admin/Adminusersclient";
import { getAdminUsers } from "@/services/admin/getAdminUsers";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
    const { q, role, status } = await searchParams;
    const { users, total } = await getAdminUsers(q, role, status, 100, 0);

    return (
        <AdminUsersClient
            users={users}
            total={total}
            initialQ={q}
            initialRole={role}
            initialStatus={status}
        />
    );
}