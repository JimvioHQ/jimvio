import { redirect } from "next/navigation";
import { AdminProfileForm } from "@/components/settings/admin-profile-form";
import { getAdminProfile } from "@/lib/actions/admin-profile";

export const metadata = { title: "Profile · Platform settings" };

export default async function AdminProfileSettingsPage() {
    const profile = await getAdminProfile();
    if (!profile) redirect("/login?next=/admin/settings/profile");
    return <AdminProfileForm initial={profile} />;
}
