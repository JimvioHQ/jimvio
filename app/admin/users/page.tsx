import React from "react";
import { getAdminUsers } from "@/services/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { users, total } = await getAdminUsers(q, 100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Users</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">View and manage platform users</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <form method="get" action="/admin/users" className="flex gap-2 max-w-sm">
            <Input name="q" defaultValue={q ?? ""} placeholder="Search by email or name..." className="rounded-xl" />
            <Button type="submit" variant="secondary" size="icon" className="rounded-xl">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">{total} user(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">User ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Roles</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No users found</td></tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4 font-mono text-xs truncate max-w-[120px]" title={u.id}>{u.id.slice(0, 8)}…</td>
                      <td className="py-3 px-4 font-medium">{u.full_name || "—"}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="flex flex-wrap gap-1">
                          {(u.roles ?? []).map((r: string) => (
                            <span key={r} className="inline-flex px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] text-xs font-medium">{r}</span>
                          ))}
                          {(!u.roles || u.roles.length === 0) && "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
