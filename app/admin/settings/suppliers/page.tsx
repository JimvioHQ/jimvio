import { getAdminDB } from "@/services/db";
import { loadSupplierSourcesSettings } from "@/lib/sources/supplier-settings";
import { SuppliersForm } from "@/components/settings/suppliers-form";

export const metadata = { title: "Suppliers · Platform settings" };

export default async function SuppliersPage() {
    const admin = getAdminDB();
    const settings = await loadSupplierSourcesSettings(admin);
    return <SuppliersForm initial={settings} />;
}
