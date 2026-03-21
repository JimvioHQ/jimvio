import React from "react";
import Link from "next/link";
import { getAdminVendors } from "@/services/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { vendors, total } = await getAdminVendors(q, 100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Vendors</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Manage vendor stores and verification</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <form method="get" action="/admin/vendors" className="flex gap-2 max-w-sm">
            <Input name="q" defaultValue={q ?? ""} placeholder="Search by store name..." className="rounded-xl" />
            <Button type="submit" variant="secondary" size="icon" className="rounded-xl">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">{total} vendor(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Store name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Products</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Verification</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No vendors found</td></tr>
                ) : (
                  vendors.map((v: any) => (
                    <tr key={v.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4 font-medium">{v.business_name || "—"}</td>
                      <td className="py-3 px-4">{v.owner_name || v.owner_email || "—"}</td>
                      <td className="py-3 px-4">{v.products_count ?? 0}</td>
                      <td className="py-3 px-4">
                        {v.is_active ? <Badge variant="default" className="bg-emerald-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={v.verification_status === "verified" ? "default" : v.verification_status === "pending" ? "secondary" : "outline"}>
                          {v.verification_status || "pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-[var(--color-text-muted)]">
        Approve or reject vendors from <Link href="/admin/verifications" className="text-[var(--color-accent)] hover:underline">Verification Requests</Link>.
      </p>
    </div>
  );
}
